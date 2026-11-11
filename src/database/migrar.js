/**
 * @file Executor de migrações SQL.
 *
 * Aplica, em ordem alfabética, os arquivos `.sql` de `migracoes/` que ainda não
 * foram aplicados. O controle fica na tabela `_migracoes`.
 *
 * Uso direto: `npm run db:migrar`
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrirBanco, transacao } from './conexao.js';
import { carregarConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

const PASTA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migracoes');

/**
 * Aplica as migrações pendentes.
 * @param {import('node:sqlite').DatabaseSync} db
 * @returns {string[]} nomes das migrações aplicadas agora
 */
export function migrar(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS _migracoes (
    nome TEXT PRIMARY KEY,
    aplicada_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`);
  const aplicadas = new Set(db.prepare('SELECT nome FROM _migracoes').all().map((l) => l.nome));
  const pendentes = readdirSync(PASTA)
    .filter((arquivo) => arquivo.endsWith('.sql') && !aplicadas.has(arquivo))
    .sort();

  for (const arquivo of pendentes) {
    transacao(db, () => {
      db.exec(readFileSync(path.join(PASTA, arquivo), 'utf8'));
      db.prepare('INSERT INTO _migracoes (nome) VALUES (?)').run(arquivo);
    });
    logger.info(`Migração aplicada: ${arquivo}`);
  }
  return pendentes;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const db = abrirBanco(carregarConfig().banco.arquivo);
  const aplicadas = migrar(db);
  logger.info(aplicadas.length ? `${aplicadas.length} migração(ões) aplicada(s).` : 'Banco já está atualizado.');
  db.close();
}
