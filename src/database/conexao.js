/**
 * @file Conexão com o banco SQLite (módulo nativo `node:sqlite` do Node 22).
 *
 * Usar o SQLite embutido evita dependências nativas e permite que o projeto
 * rode em qualquer máquina com Node instalado, sem servidor de banco separado.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Abre (ou cria) o banco e liga as restrições de chave estrangeira.
 * @param {string} arquivo caminho do arquivo ou `:memory:`
 * @returns {DatabaseSync}
 */
export function abrirBanco(arquivo) {
  if (arquivo !== ':memory:') mkdirSync(path.dirname(arquivo), { recursive: true });
  const db = new DatabaseSync(arquivo);
  db.exec('PRAGMA foreign_keys = ON;');
  if (arquivo !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  return db;
}

/**
 * Executa `fn` dentro de uma transação. Desfaz tudo se ocorrer erro.
 * Transações aninhadas reaproveitam a transação externa.
 * @template T
 * @param {DatabaseSync} db
 * @param {() => T} fn
 * @returns {T}
 */
export function transacao(db, fn) {
  if (db.isTransaction) return fn();
  db.exec('BEGIN');
  try {
    const resultado = fn();
    db.exec('COMMIT');
    return resultado;
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }
}
