/**
 * @file Model dos plantios de árvores reais.
 */

const CAMPOS = `p.id, p.setor_id AS setorId, s.nome AS setorNome, p.especie, p.status, p.local, p.cep, p.endereco,
  p.endereco_verificado AS enderecoVerificado, p.registrado_por AS registradoPor, p.agendado_em AS agendadoEm, p.plantado_em AS plantadoEm`;
const DE = 'FROM plantios p JOIN setores s ON s.id = p.setor_id';

const mapear = (l) => (l ? { ...l, enderecoVerificado: Boolean(l.enderecoVerificado) } : null);

/** @param {import('node:sqlite').DatabaseSync} db */
export function criarPlantioModel(db) {
  return {
    /** @returns {number} id criado */
    criar({ setorId, especie, status = 'agendado', local = null, agendadoEm = null, plantadoEm = null }) {
      const r = db
        .prepare(
          `INSERT INTO plantios (setor_id, especie, status, local, agendado_em, plantado_em)
           VALUES (?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), ?)`,
        )
        .run(setorId, especie, status, local, agendadoEm, plantadoEm);
      return Number(r.lastInsertRowid);
    },

    buscar(id) {
      return mapear(db.prepare(`SELECT ${CAMPOS} ${DE} WHERE p.id = ?`).get(id));
    },

    /** @param {{status?: 'agendado'|'plantado', limite?: number}} filtro */
    listar({ status, limite = 500 } = {}) {
      const onde = status ? 'WHERE p.status = ?' : '';
      const valores = status ? [status] : [];
      return db
        .prepare(`SELECT ${CAMPOS} ${DE} ${onde} ORDER BY COALESCE(p.plantado_em, p.agendado_em) DESC, p.id DESC LIMIT ?`)
        .all(...valores, limite)
        .map(mapear);
    },

    registrarPlantio(id, { local, cep, endereco, enderecoVerificado, registradoPor }) {
      db.prepare(
        `UPDATE plantios SET status = 'plantado', local = ?, cep = ?, endereco = ?, endereco_verificado = ?,
          registrado_por = ?, plantado_em = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
      ).run(local, cep, endereco, enderecoVerificado ? 1 : 0, registradoPor, id);
    },

    contar(status) {
      return db.prepare('SELECT COUNT(*) AS n FROM plantios WHERE status = ?').get(status).n;
    },
  };
}
