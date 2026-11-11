/**
 * @file Model de fornecedores e seus requisitos ambientais (8.1 provedores externos).
 */

const mapReq = (l) => (l ? { ...l, atendido: Boolean(l.atendido) } : null);

/** @param {import('node:sqlite').DatabaseSync} db */
export function criarFornecedorModel(db) {
  return {
    /** @returns {number} id criado */
    criar({ nome, ramo, requisitos = [] }) {
      const id = Number(db.prepare('INSERT INTO fornecedores (nome, ramo) VALUES (?, ?)').run(nome, ramo).lastInsertRowid);
      const inserir = db.prepare('INSERT INTO requisitos_fornecedor (fornecedor_id, nome, atendido) VALUES (?, ?, ?)');
      for (const r of requisitos) inserir.run(id, r.nome, r.atendido ? 1 : 0);
      return id;
    },

    listar() {
      return db.prepare('SELECT id, nome, ramo FROM fornecedores ORDER BY nome').all();
    },

    buscar(id) {
      return db.prepare('SELECT id, nome, ramo FROM fornecedores WHERE id = ?').get(id) ?? null;
    },

    requisitos(fornecedorId) {
      return db
        .prepare('SELECT id, fornecedor_id AS fornecedorId, nome, atendido FROM requisitos_fornecedor WHERE fornecedor_id = ? ORDER BY id')
        .all(fornecedorId)
        .map(mapReq);
    },

    buscarRequisito(id) {
      return mapReq(db.prepare('SELECT id, fornecedor_id AS fornecedorId, nome, atendido FROM requisitos_fornecedor WHERE id = ?').get(id));
    },

    marcarRequisitoAtendido(id) {
      db.prepare('UPDATE requisitos_fornecedor SET atendido = 1 WHERE id = ?').run(id);
    },
  };
}
