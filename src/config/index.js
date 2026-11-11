/**
 * @file Configuração central da aplicação.
 *
 * Lê variáveis de ambiente (arquivo `.env`, quando existir) e devolve um objeto
 * de configuração imutável. Os testes usam `carregarConfig({...})` para
 * sobrescrever valores (por exemplo, banco em memória).
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Pasta raiz do projeto (onde fica o package.json). */
export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const arquivoEnv = path.join(RAIZ, '.env');
if (existsSync(arquivoEnv) && process.env.NODE_ENV !== 'test') {
  process.loadEnvFile(arquivoEnv);
}

/**
 * Mescla objetos de forma profunda (apenas objetos simples).
 * @param {object} base
 * @param {object} extra
 * @returns {object}
 */
function mesclar(base, extra) {
  const saida = { ...base };
  for (const [chave, valor] of Object.entries(extra ?? {})) {
    const ehObjeto = valor && typeof valor === 'object' && !Array.isArray(valor);
    saida[chave] = ehObjeto ? mesclar(base[chave] ?? {}, valor) : valor;
  }
  return saida;
}

/**
 * @typedef {object} Config
 * @property {string} raiz
 * @property {number} porta
 * @property {{segredo: string, expiracao: string}} jwt
 * @property {{arquivo: string}} banco
 * @property {{pasta: string, tamanhoMaximoBytes: number}} uploads
 * @property {number} cicloDiarioHora
 * @property {{url: string, timeoutMs: number}} viacep
 */

/**
 * Monta a configuração a partir do ambiente.
 * @param {Partial<Config>} [sobrescritas] valores que substituem os do ambiente
 * @returns {Readonly<Config>}
 */
export function carregarConfig(sobrescritas = {}) {
  const env = process.env;
  const base = {
    raiz: RAIZ,
    porta: Number(env.PORTA ?? 3000),
    jwt: {
      segredo: env.JWT_SEGREDO || 'silvia-segredo-de-desenvolvimento',
      expiracao: env.JWT_EXPIRACAO || '8h',
    },
    banco: { arquivo: env.BANCO_ARQUIVO || path.join(RAIZ, 'data', 'silvia.db') },
    uploads: {
      pasta: path.resolve(RAIZ, env.PASTA_UPLOADS || 'uploads'),
      tamanhoMaximoBytes: 8 * 1024 * 1024,
    },
    cicloDiarioHora: Number(env.CICLO_DIARIO_HORA ?? 0),
    viacep: { url: env.VIACEP_URL || 'https://viacep.com.br/ws', timeoutMs: 4000 },
  };
  return Object.freeze(mesclar(base, sobrescritas));
}
