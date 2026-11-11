/**
 * @file Cliente do web service externo ViaCEP (https://viacep.com.br).
 *
 * Demonstra o CONSUMO de um web service REST de terceiros: ao registrar o
 * plantio de uma árvore, o sistema completa o endereço a partir do CEP.
 */

/**
 * @typedef {object} Endereco
 * @property {string} cep
 * @property {string} logradouro
 * @property {string} bairro
 * @property {string} localidade
 * @property {string} uf
 */

/**
 * Mantém só os dígitos e valida o tamanho.
 * @param {string} cep
 * @returns {string|null} 8 dígitos ou null se inválido
 */
export function normalizarCep(cep) {
  const digitos = String(cep ?? '').replace(/\D/g, '');
  return digitos.length === 8 ? digitos : null;
}

/**
 * @param {{url: string, timeoutMs: number, fetch?: typeof fetch}} opcoes
 */
export function criarClienteViaCep({ url, timeoutMs, fetch: buscar = globalThis.fetch }) {
  return {
    /**
     * Consulta um CEP.
     * @param {string} cep 8 dígitos
     * @returns {Promise<{situacao: 'encontrado', endereco: Endereco} | {situacao: 'nao_encontrado'} | {situacao: 'indisponivel', detalhe: string}>}
     */
    async consultar(cep) {
      try {
        const resposta = await buscar(`${url}/${cep}/json/`, { signal: AbortSignal.timeout(timeoutMs) });
        if (resposta.status === 400) return { situacao: 'nao_encontrado' };
        if (!resposta.ok) return { situacao: 'indisponivel', detalhe: `HTTP ${resposta.status}` };
        const corpo = await resposta.json();
        if (corpo.erro) return { situacao: 'nao_encontrado' };
        return {
          situacao: 'encontrado',
          endereco: {
            cep: corpo.cep,
            logradouro: corpo.logradouro ?? '',
            bairro: corpo.bairro ?? '',
            localidade: corpo.localidade ?? '',
            uf: corpo.uf ?? '',
          },
        };
      } catch (erro) {
        return { situacao: 'indisponivel', detalhe: erro.name === 'TimeoutError' ? 'tempo esgotado' : erro.message };
      }
    },
  };
}

/**
 * Formata o endereço em uma linha.
 * @param {Endereco} e
 */
export const formatarEndereco = (e) =>
  [e.logradouro, e.bairro, `${e.localidade}/${e.uf}`, e.cep].filter((parte) => parte && parte !== '/').join(', ');
