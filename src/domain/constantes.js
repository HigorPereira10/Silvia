/**
 * @file Constantes do domínio Silvia.
 *
 * Os números de REGRAS são os parâmetros do jogo. Cada um está ligado a um
 * requisito da ISO 14001 (ver docs/regras-de-negocio.md).
 */

/** Nomes dos estágios de crescimento da planta, do 0 ao 4. */
export const ESTAGIOS = Object.freeze(['Semente', 'Broto', 'Muda', 'Arbusto', 'Árvore']);

/** XP necessário para sair de cada estágio (o último estágio não evolui). */
export const XP_PARA_PROXIMO = Object.freeze([60, 100, 140, 180, 180]);

export const ESTAGIO_MAXIMO = ESTAGIOS.length - 1;

/** Parâmetros numéricos das regras do jogo. */
export const REGRAS = Object.freeze({
  /** Ação aprovada ("regar"): água, crescimento e pontos para o setor. */
  acaoAgua: 30,
  acaoXp: 14,
  acaoPontos: 14,
  /** Ação de fornecedor aprovada também dá adubo (fornecedor não faz treinamento). */
  fornecedorAdubo: 15,
  /** Treinamento ("adubar"): valores por acerto, só na primeira conclusão do módulo. */
  aduboPorAcerto: 12,
  xpPorAcerto: 6,
  pontosPorAcerto: 4,
  /** Não conformidade aceita pela gestora ("podar"). */
  ncXp: 10,
  ncPontos: 12,
  /** Ciclo diário: perda de água e adubo (pausado em férias). */
  decaimentoAgua: 12,
  decaimentoAdubo: 5,
  /** Chance diária de surgir um galho seco em plantas a partir do estágio Muda. */
  chanceGalhoSeco: 0.2,
  penalidadeGalhoSeco: 8,
  /** Pesos da saúde: 40% água + 30% adubo + 30% sol. */
  pesoAgua: 0.4,
  pesoAdubo: 0.3,
  pesoSol: 0.3,
  /** Abaixo deste valor a planta é considerada murcha. */
  limiteMurcha: 40,
  /** Pontos de setor que geram o plantio de uma árvore real. */
  pontosPorArvore: 1000,
});

export const ESPECIES_NATIVAS = Object.freeze([
  'Ipê-amarelo', 'Ipê-roxo', 'Pau-brasil', 'Jatobá', 'Quaresmeira', 'Pitangueira',
  'Jequitibá-rosa', 'Aroeira-pimenteira', 'Cambuci', 'Manacá-da-serra', 'Araçá', 'Guapuruvu',
]);

/** Ações que o colaborador pode registrar ("regar"). */
export const CATEGORIAS_ACAO = Object.freeze([
  'Vim de carona, bike ou transporte público',
  'Desliguei equipamentos ao sair',
  'Descartei pilhas ou eletrônicos no ponto de coleta',
  'Assinei documento digital em vez de imprimir',
  'Usei caneca no lugar de copo descartável',
  'Separei o lixo reciclável corretamente',
]);

/** Tipos de desperdício que viram não conformidade ("podar"). */
export const CATEGORIAS_DESPERDICIO = Object.freeze([
  'Vazamento de água',
  'Luz ou ar-condicionado ligado sem uso',
  'Lixo reciclável misturado',
  'Impressões abandonadas na impressora',
  'Equipamento ligado fora do expediente',
]);

/** Ações que um fornecedor pode registrar. */
export const CATEGORIAS_FORNECEDOR = Object.freeze([
  'Troca para embalagem retornável',
  'Frete consolidado (menos viagens)',
  'Licença ambiental renovada',
  'Logística reversa de resíduos',
]);

export const RESPONSAVEIS = Object.freeze(['Manutenção', 'Facilities', 'TI', 'RH', 'Compras']);

export const LOCAIS_PLANTIO = Object.freeze([
  'Área de restauração 1 · ONG parceira',
  'Área de restauração 2 · ONG parceira',
  'Escola municipal parceira',
  'Praça comunitária do bairro',
  'Mata ciliar do córrego',
]);

export const MOTIVOS_RECUSA = Object.freeze([
  'Evidência ilegível',
  'Evidência não comprova a ação',
  'Ação duplicada',
  'Arquivo errado',
]);

export const MOTIVOS_IMPROCEDENCIA = Object.freeze([
  'Não foi possível confirmar no local',
  'Já estava resolvido',
  'Duplicada de outra NC',
]);
