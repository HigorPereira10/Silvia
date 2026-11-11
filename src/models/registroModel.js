/**
 * @file Models de registros: notificações, feed e auditoria.
 *
 * São tabelas de "escrita e leitura simples", agrupadas aqui por terem o mesmo
 * formato de uso.
 */

/** @param {import('node:sqlite').DatabaseSync} db */
export function criarNotificacaoModel(db) {
  return {
    criar(usuarioId, mensagem, criadaEm = null) {
      const r = db
        .prepare(`INSERT INTO notificacoes (usuario_id, mensagem, criada_em) VALUES (?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`)
        .run(usuarioId, mensagem, criadaEm);
      return Number(r.lastInsertRowid);
    },
    listar(usuarioId, limite = 30) {
      return db
        .prepare('SELECT id, mensagem, lida, criada_em AS criadaEm FROM notificacoes WHERE usuario_id = ? ORDER BY id DESC LIMIT ?')
        .all(usuarioId, limite)
        .map((l) => ({ ...l, lida: Boolean(l.lida) }));
    },
    contarNaoLidas(usuarioId) {
      return db.prepare('SELECT COUNT(*) AS n FROM notificacoes WHERE usuario_id = ? AND lida = 0').get(usuarioId).n;
    },
    /** @returns {number} quantas foram marcadas */
    marcarTodasLidas(usuarioId) {
      return Number(db.prepare('UPDATE notificacoes SET lida = 1 WHERE usuario_id = ? AND lida = 0').run(usuarioId).changes);
    },
  };
}

/** @param {import('node:sqlite').DatabaseSync} db */
export function criarFeedModel(db) {
  return {
    /** @param {{ator?: string|null, texto: string, tipo?: 'geral'|'agua'|'poda'|'marco', criadoEm?: string|null}} d */
    criar({ ator = null, texto, tipo = 'geral', criadoEm = null }) {
      const r = db
        .prepare(`INSERT INTO feed (ator, texto, tipo, criado_em) VALUES (?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`)
        .run(ator, texto, tipo, criadoEm);
      return this.buscar(Number(r.lastInsertRowid));
    },
    buscar(id) {
      return db.prepare('SELECT id, ator, texto, tipo, criado_em AS criadoEm FROM feed WHERE id = ?').get(id) ?? null;
    },
    listar(limite = 20) {
      return db.prepare('SELECT id, ator, texto, tipo, criado_em AS criadoEm FROM feed ORDER BY id DESC LIMIT ?').all(limite);
    },
  };
}

/** @param {import('node:sqlite').DatabaseSync} db */
export function criarAuditoriaModel(db) {
  return {
    criar(ator, acao, detalhe = null, criadoEm = null) {
      db.prepare(`INSERT INTO auditoria (ator, acao, detalhe, criado_em) VALUES (?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`)
        .run(ator, acao, detalhe, criadoEm);
    },
    listar(limite = 100) {
      return db.prepare('SELECT id, ator, acao, detalhe, criado_em AS criadoEm FROM auditoria ORDER BY id DESC LIMIT ?').all(limite);
    },
  };
}
