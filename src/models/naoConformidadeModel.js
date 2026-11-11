/**
 * @file Model das não conformidades (cláusula 10.2 da ISO 14001).
 */

const CAMPOS = `n.id, n.codigo, n.tipo, n.local, n.status, n.reportado_por AS reportadoPor, u.nome AS reportadoPorNome,
  n.responsavel, n.acao_corretiva AS acaoCorretiva, n.motivo, n.aberta_em AS abertaEm, n.fechada_em AS fechadaEm`;
const DE = 'FROM nao_conformidades n JOIN usuarios u ON u.id = n.reportado_por';
const ORDEM = `CASE n.status WHEN 'aberta' THEN 0 WHEN 'em_acao' THEN 1 WHEN 'fechada' THEN 2 ELSE 3 END, n.aberta_em DESC`;

/** @param {import('node:sqlite').DatabaseSync} db */
export function criarNaoConformidadeModel(db) {
  return {
    /** Próximo código sequencial no formato NC-001. */
    proximoCodigo() {
      const { maior } = db.prepare(`SELECT MAX(CAST(SUBSTR(codigo, 4) AS INTEGER)) AS maior FROM nao_conformidades`).get();
      return `NC-${String((maior ?? 0) + 1).padStart(3, '0')}`;
    },

    /** @returns {number} id criado */
    criar(d) {
      const r = db
        .prepare(
          `INSERT INTO nao_conformidades (codigo, tipo, local, status, reportado_por, responsavel, acao_corretiva, aberta_em, fechada_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), ?)`,
        )
        .run(d.codigo, d.tipo, d.local, d.status ?? 'aberta', d.reportadoPor, d.responsavel ?? null,
          d.acaoCorretiva ?? null, d.abertaEm ?? null, d.fechadaEm ?? null);
      return Number(r.lastInsertRowid);
    },

    buscar(id) {
      return db.prepare(`SELECT ${CAMPOS} ${DE} WHERE n.id = ?`).get(id) ?? null;
    },

    /** @param {{status?: string, reportadoPor?: number}} filtro */
    listar({ status, reportadoPor } = {}) {
      const condicoes = [];
      const valores = [];
      if (status) { condicoes.push('n.status = ?'); valores.push(status); }
      if (reportadoPor) { condicoes.push('n.reportado_por = ?'); valores.push(reportadoPor); }
      const onde = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
      return db.prepare(`SELECT ${CAMPOS} ${DE} ${onde} ORDER BY ${ORDEM}`).all(...valores);
    },

    /** Atualiza status e campos do fluxo de tratamento. */
    atualizar(id, { status, responsavel = null, acaoCorretiva = null, motivo = null, fechar = false }) {
      db.prepare(
        `UPDATE nao_conformidades SET status = ?, responsavel = COALESCE(?, responsavel),
          acao_corretiva = COALESCE(?, acao_corretiva), motivo = COALESCE(?, motivo),
          fechada_em = CASE WHEN ? THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now') ELSE fechada_em END
         WHERE id = ?`,
      ).run(status, responsavel, acaoCorretiva, motivo, fechar ? 1 : 0, id);
    },

    /** Contagem por status: { aberta, em_acao, fechada, improcedente }. */
    contarPorStatus() {
      const contagem = { aberta: 0, em_acao: 0, fechada: 0, improcedente: 0 };
      for (const l of db.prepare('SELECT status, COUNT(*) AS n FROM nao_conformidades GROUP BY status').all()) {
        contagem[l.status] = l.n;
      }
      return contagem;
    },
  };
}
