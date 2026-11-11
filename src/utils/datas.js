/**
 * @file Funções de data usadas pelo sistema.
 *
 * Todas as datas são guardadas no banco como texto ISO 8601 (UTC).
 * Meses de medição usam o formato `AAAA-MM`.
 */

/** @returns {string} data/hora atual em ISO 8601 */
export const agora = () => new Date().toISOString();

/**
 * Mês (AAAA-MM) de uma data.
 * @param {Date} [data]
 * @returns {string}
 */
export function mesDe(data = new Date()) {
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Desloca um mês AAAA-MM em `n` meses.
 * @param {string} mes AAAA-MM
 * @param {number} n meses (negativo volta no tempo)
 * @returns {string}
 */
export function deslocarMes(mes, n) {
  const [ano, m] = mes.split('-').map(Number);
  return mesDe(new Date(Date.UTC(ano, m - 1 + n, 1)));
}

/**
 * Data ISO deslocada em dias a partir de agora.
 * @param {number} dias
 * @returns {string}
 */
export function diasAtras(dias) {
  return new Date(Date.now() - dias * 864e5).toISOString();
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * Rótulo curto de um mês, ex.: "2026-10" -> "out/26".
 * @param {string} mes
 * @returns {string}
 */
export function rotuloMes(mes) {
  const [ano, m] = mes.split('-');
  return `${MESES[Number(m) - 1]}/${ano.slice(2)}`;
}
