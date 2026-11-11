/**
 * @file Ciclo diário: decaimento das plantas (9.1 avaliação, 10.3 melhoria contínua).
 *
 * Uma vez por dia, cada planta perde água e adubo (exceto quem está de férias)
 * e pode surgir um galho seco. Quem cruza o limite de murcha recebe um aviso,
 * e a gestora também.
 */
import { aplicarDecaimento, deveSurgirGalhoSeco, estaMurcha } from '../domain/regras.js';
import { REGRAS } from '../domain/constantes.js';
import { transacao } from '../database/conexao.js';

/**
 * @param {{db: import('node:sqlite').DatabaseSync, models: import('../models/index.js').Models,
 *   registro: ReturnType<typeof import('./registroService.js').criarRegistroService>,
 *   plantas: ReturnType<typeof import('./plantaService.js').criarPlantaService>,
 *   eventos: ReturnType<typeof import('../realtime/eventos.js').criarBarramentoEventos>,
 *   aleatorio: () => number}} deps
 */
export function criarCicloDiarioService({ db, models, registro, plantas, eventos, aleatorio }) {
  return {
    /**
     * Executa um ciclo.
     * @param {string} origem quem disparou (ex.: "Agendador" ou o nome da gestora)
     * @returns {{plantas: number, emFerias: number, galhosSecos: number, murcharam: string[]}}
     */
    executar(origem = 'Agendador') {
      const resumo = transacao(db, () => {
        const saida = { plantas: 0, emFerias: 0, galhosSecos: 0, murcharam: [] };
        for (const planta of models.plantas.listarTodas()) {
          const antes = plantas.apresentar(planta);
          const decaida = aplicarDecaimento(planta, planta.ferias);
          const galhoSeco = planta.ferias ? planta.galhoSeco : planta.galhoSeco || deveSurgirGalhoSeco(planta, aleatorio());
          if (planta.ferias) saida.emFerias += 1;
          if (galhoSeco && !planta.galhoSeco) {
            saida.galhosSecos += 1;
            registro.notificar(planta.usuarioId, 'Apareceu um galho seco na sua muda. Reporte um desperdício para podar.');
          }
          const novo = { ...planta, ...decaida, galhoSeco };
          models.plantas.salvarEstado(planta.usuarioId, novo);
          const depois = plantas.apresentar(novo, antes.sol);
          if (!estaMurcha(antes.saude) && estaMurcha(depois.saude)) {
            saida.murcharam.push(planta.donoNome);
            registro.notificar(planta.usuarioId, `Sua muda murchou (saúde abaixo de ${REGRAS.limiteMurcha}). Registre ações e faça treinamentos para recuperá-la.`);
            registro.notificarGestores(`A muda de ${planta.donoNome} murchou.`);
            registro.feed(planta.donoNome, 'teve a muda murcha.', 'poda');
          }
          saida.plantas += 1;
        }
        registro.auditar(origem, 'Rodou o ciclo diário', `${saida.plantas} plantas · ${saida.galhosSecos} galhos secos · ${saida.murcharam.length} murcharam · ${saida.emFerias} em férias`);
        return saida;
      });
      eventos.emitir('canteiro.atualizado', resumo, 'autenticados');
      return resumo;
    },
  };
}
