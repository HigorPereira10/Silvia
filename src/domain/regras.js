/**
 * @file Regras de negócio puras do Silvia (sem banco, sem HTTP).
 *
 * Aqui fica a "matemática" que transforma dados ambientais reais em estado do
 * jogo. Por serem funções puras, são cobertas por testes unitários.
 */
import { ESTAGIOS, ESTAGIO_MAXIMO, REGRAS, XP_PARA_PROXIMO } from './constantes.js';

/**
 * Restringe um número ao intervalo [min, max].
 * @param {number} valor
 * @param {number} [min]
 * @param {number} [max]
 */
export const limitar = (valor, min = 0, max = 100) => Math.max(min, Math.min(max, valor));

/**
 * @typedef {object} Setor
 * @property {number} baseEnergiaKwh
 * @property {number} basePapelFolhas
 * @property {number} metaEnergiaPct   redução desejada de energia (%)
 * @property {number} metaPapelPct     redução desejada de papel (%)
 * @property {number} metaReciclavelPct porcentagem desejada de resíduo separado
 */

/**
 * @typedef {object} Medicao
 * @property {number} energiaKwh
 * @property {number} papelFolhas
 * @property {number} reciclavelPct
 */

/**
 * Calcula quanto de cada meta foi atingido (6.2 objetivos, 9.1 medição).
 * Sem medição, considera a linha de base (nenhuma redução).
 * @param {Setor} setor
 * @param {Medicao|null|undefined} medicao
 * @returns {{reducaoEnergiaPct: number, reducaoPapelPct: number, energia: number, papel: number, reciclavel: number}}
 *   reduções em % e atingimento de cada meta de 0 a 100
 */
export function atingimentoMetas(setor, medicao) {
  const energiaAtual = medicao?.energiaKwh ?? setor.baseEnergiaKwh;
  const papelAtual = medicao?.papelFolhas ?? setor.basePapelFolhas;
  const reciclavel = medicao?.reciclavelPct ?? 0;
  const reducaoEnergiaPct = ((setor.baseEnergiaKwh - energiaAtual) / setor.baseEnergiaKwh) * 100;
  const reducaoPapelPct = ((setor.basePapelFolhas - papelAtual) / setor.basePapelFolhas) * 100;
  return {
    reducaoEnergiaPct,
    reducaoPapelPct,
    energia: limitar(reducaoEnergiaPct / setor.metaEnergiaPct, 0, 1) * 100,
    papel: limitar(reducaoPapelPct / setor.metaPapelPct, 0, 1) * 100,
    reciclavel: limitar(reciclavel / setor.metaReciclavelPct, 0, 1) * 100,
  };
}

/**
 * "Sol" do canteiro: média do atingimento das três metas do setor.
 * @param {ReturnType<typeof atingimentoMetas>} atingimento
 * @returns {number} 0 a 100
 */
export function calcularSol(atingimento) {
  return Math.round((atingimento.energia + atingimento.papel + atingimento.reciclavel) / 3);
}

/**
 * "Sol" de um fornecedor: porcentagem de requisitos ambientais atendidos (8.1).
 * @param {{atendido: boolean}[]} requisitos
 * @returns {number}
 */
export function calcularSolFornecedor(requisitos) {
  if (!requisitos.length) return 0;
  return Math.round((requisitos.filter((r) => r.atendido).length / requisitos.length) * 100);
}

/**
 * Saúde da planta: 40% água + 30% adubo + 30% sol, menos a penalidade do galho seco.
 * @param {{agua: number, adubo: number, galhoSeco: boolean}} planta
 * @param {number} sol
 * @returns {number} 0 a 100
 */
export function calcularSaude(planta, sol) {
  const bruta = REGRAS.pesoAgua * planta.agua + REGRAS.pesoAdubo * planta.adubo + REGRAS.pesoSol * sol;
  return limitar(Math.round(bruta) - (planta.galhoSeco ? REGRAS.penalidadeGalhoSeco : 0));
}

/** @param {number} saude */
export const estaMurcha = (saude) => saude < REGRAS.limiteMurcha;

/**
 * Soma XP e faz a planta evoluir de estágio quando necessário.
 * @param {{estagio: number, xp: number}} planta
 * @param {number} xpGanho
 * @returns {{estagio: number, xp: number, evoluiu: boolean}}
 */
export function aplicarCrescimento(planta, xpGanho) {
  let { estagio } = planta;
  let xp = planta.xp + xpGanho;
  while (estagio < ESTAGIO_MAXIMO && xp >= XP_PARA_PROXIMO[estagio]) {
    xp -= XP_PARA_PROXIMO[estagio];
    estagio += 1;
  }
  if (estagio === ESTAGIO_MAXIMO) xp = Math.min(xp, XP_PARA_PROXIMO[ESTAGIO_MAXIMO]);
  return { estagio, xp, evoluiu: estagio > planta.estagio };
}

/**
 * Decaimento diário de água e adubo. Férias pausam o decaimento.
 * @param {{agua: number, adubo: number}} planta
 * @param {boolean} emFerias
 * @returns {{agua: number, adubo: number}}
 */
export function aplicarDecaimento(planta, emFerias) {
  if (emFerias) return { agua: planta.agua, adubo: planta.adubo };
  return {
    agua: limitar(planta.agua - REGRAS.decaimentoAgua),
    adubo: limitar(planta.adubo - REGRAS.decaimentoAdubo),
  };
}

/**
 * Decide se surge um galho seco hoje (só a partir do estágio Muda).
 * @param {{estagio: number, galhoSeco: boolean}} planta
 * @param {number} sorteio número aleatório entre 0 e 1
 */
export function deveSurgirGalhoSeco(planta, sorteio) {
  return !planta.galhoSeco && planta.estagio >= 2 && sorteio < REGRAS.chanceGalhoSeco;
}

/**
 * Soma pontos ao setor e calcula quantas árvores reais foram conquistadas.
 * @param {number} pontosAtuais
 * @param {number} ganho
 * @returns {{pontos: number, arvores: number}} saldo restante e árvores a agendar
 */
export function somarPontosSetor(pontosAtuais, ganho) {
  const total = pontosAtuais + ganho;
  return {
    arvores: Math.floor(total / REGRAS.pontosPorArvore),
    pontos: total % REGRAS.pontosPorArvore,
  };
}

/**
 * Estágio visual de uma árvore real conforme a idade do plantio.
 * @param {number} diasDesdePlantio
 * @returns {number} 2 (muda), 3 (arbusto) ou 4 (árvore)
 */
export function estagioPorIdade(diasDesdePlantio) {
  if (diasDesdePlantio < 30) return 2;
  if (diasDesdePlantio < 120) return 3;
  return 4;
}

/**
 * Monta a visão completa da planta para a API.
 * @param {{estagio: number, xp: number, agua: number, adubo: number, galhoSeco: boolean}} planta
 * @param {number} sol
 */
export function resumirPlanta(planta, sol) {
  const saude = calcularSaude(planta, sol);
  return {
    estagio: planta.estagio,
    estagioNome: ESTAGIOS[planta.estagio],
    xp: planta.xp,
    xpProximo: XP_PARA_PROXIMO[planta.estagio],
    agua: planta.agua,
    adubo: planta.adubo,
    sol,
    saude,
    galhoSeco: planta.galhoSeco,
    murcha: estaMurcha(saude),
  };
}
