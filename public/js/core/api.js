/**
 * @file Cliente HTTP da API REST do Silvia (consumo dos web services).
 *
 * Toda chamada passa por `api()`, que coloca o token JWT, converte JSON e
 * transforma respostas de erro em `ErroApi` com a mensagem vinda do servidor.
 */
import { sessao } from './sessao.js';

const BASE = '/api/v1';

export class ErroApi extends Error {
  /**
   * @param {number} status
   * @param {string} codigo
   * @param {string} mensagem
   * @param {unknown} [detalhes]
   */
  constructor(status, codigo, mensagem, detalhes) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

/**
 * Chama um endpoint da API.
 * @param {string} caminho ex.: "/eu"
 * @param {{metodo?: string, corpo?: unknown, form?: FormData}} [opcoes]
 * @returns {Promise<any>}
 */
export async function api(caminho, { metodo = 'GET', corpo, form } = {}) {
  const headers = {};
  if (sessao.token) headers.Authorization = `Bearer ${sessao.token}`;
  let body;
  if (form) body = form;
  else if (corpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(corpo);
  }

  let resposta;
  try {
    resposta = await fetch(BASE + caminho, { method: metodo, headers, body });
  } catch {
    throw new ErroApi(0, 'sem_conexao', 'Sem conexão com o servidor. Verifique se ele está rodando.');
  }

  if (resposta.status === 401 && sessao.token) {
    sessao.sair();
    location.hash = '#/login';
  }
  const ehJson = (resposta.headers.get('content-type') ?? '').includes('json');
  const dados = ehJson ? await resposta.json() : await resposta.blob();
  if (!resposta.ok) {
    const erro = ehJson ? dados.erro : null;
    throw new ErroApi(resposta.status, erro?.codigo ?? 'erro', erro?.mensagem ?? `Erro ${resposta.status}.`, erro?.detalhes);
  }
  return dados;
}

/**
 * Baixa um arquivo protegido por login e oferece para salvar.
 * @param {string} caminho
 * @param {string} nomeArquivo
 */
export async function baixarArquivo(caminho, nomeArquivo) {
  const blob = await api(caminho);
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: nomeArquivo });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * URL temporária (blob:) de um arquivo protegido, para exibir em <img>.
 * @param {string} caminho
 */
export async function urlProtegida(caminho) {
  return URL.createObjectURL(await api(caminho));
}
