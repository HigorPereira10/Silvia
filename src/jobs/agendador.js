/**
 * @file Agendador do ciclo diário.
 *
 * Roda o decaimento das plantas uma vez por dia, no horário configurado em
 * CICLO_DIARIO_HORA. A gestora também pode disparar o ciclo manualmente
 * (POST /api/v1/admin/ciclo-diario) para demonstração.
 */
import { logger } from '../utils/logger.js';

/**
 * Milissegundos até a próxima ocorrência da hora informada.
 * @param {number} hora 0 a 23 (horário local do servidor)
 * @param {Date} [agora]
 */
export function msAteProximaExecucao(hora, agora = new Date()) {
  const proxima = new Date(agora);
  proxima.setHours(hora, 0, 0, 0);
  if (proxima <= agora) proxima.setDate(proxima.getDate() + 1);
  return proxima.getTime() - agora.getTime();
}

/**
 * @param {{hora: number, executar: () => unknown}} opcoes
 * @returns {{parar: () => void}}
 */
export function iniciarAgendador({ hora, executar }) {
  let temporizador;
  const agendar = () => {
    temporizador = setTimeout(() => {
      try {
        const resumo = executar();
        logger.info('Ciclo diário executado', resumo);
      } catch (erro) {
        logger.erro('Falha no ciclo diário', erro);
      }
      agendar();
    }, msAteProximaExecucao(hora));
    temporizador.unref();
  };
  agendar();
  return { parar: () => clearTimeout(temporizador) };
}
