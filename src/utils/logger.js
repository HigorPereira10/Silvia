/**
 * @file Logger simples com níveis. Fica silencioso durante os testes.
 */
/** Silencioso quando rodando sob o executor de testes do Node. */
const silencioso = () => process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT);

/**
 * @param {'INFO'|'AVISO'|'ERRO'} nivel
 * @param {string} mensagem
 * @param {unknown} [extra]
 */
function registrar(nivel, mensagem, extra) {
  if (silencioso()) return;
  const linha = `[${new Date().toISOString()}] ${nivel.padEnd(5)} ${mensagem}`;
  const saida = nivel === 'ERRO' ? console.error : console.log;
  if (extra === undefined) saida(linha);
  else saida(linha, extra);
}

export const logger = {
  info: (mensagem, extra) => registrar('INFO', mensagem, extra),
  aviso: (mensagem, extra) => registrar('AVISO', mensagem, extra),
  erro: (mensagem, extra) => registrar('ERRO', mensagem, extra),
};
