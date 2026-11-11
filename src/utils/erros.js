/**
 * @file Erros de aplicação com status HTTP.
 *
 * Os serviços lançam `ErroAplicacao`; o middleware de erros converte em uma
 * resposta JSON padronizada: `{ erro: { codigo, mensagem, detalhes } }`.
 */

export class ErroAplicacao extends Error {
  /**
   * @param {number} status código HTTP
   * @param {string} codigo identificador estável do erro (snake_case)
   * @param {string} mensagem texto para o usuário
   * @param {unknown} [detalhes] informações extras (ex.: campos inválidos)
   */
  constructor(status, codigo, mensagem, detalhes) {
    super(mensagem);
    this.name = 'ErroAplicacao';
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

export const requisicaoInvalida = (mensagem, detalhes) =>
  new ErroAplicacao(400, 'requisicao_invalida', mensagem, detalhes);
export const naoAutenticado = (mensagem = 'Faça login para continuar.') =>
  new ErroAplicacao(401, 'nao_autenticado', mensagem);
export const proibido = (mensagem = 'Seu perfil não tem acesso a este recurso.') =>
  new ErroAplicacao(403, 'proibido', mensagem);
export const naoEncontrado = (mensagem = 'Recurso não encontrado.') =>
  new ErroAplicacao(404, 'nao_encontrado', mensagem);
export const conflito = (mensagem) => new ErroAplicacao(409, 'conflito', mensagem);
export const entidadeInvalida = (codigo, mensagem, detalhes) =>
  new ErroAplicacao(422, codigo, mensagem, detalhes);
