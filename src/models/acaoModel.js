/**
 * @file Model das ações ambientais registradas com evidência.
 */

const CAMPOS = `a.id, a.usuario_id AS usuarioId, a.tipo, a.categoria, a.descricao, a.evidencia_nome AS evidenciaNome,
  a.evidencia_arquivo AS evidenciaArquivo, a.evidencia_mime AS evidenciaMime, a.requisito_id AS requisitoId,
  a.status, a.motivo, a.pontos, a.avaliado_por AS avaliadoPor, a.avaliado_em AS avaliadoEm,
  a.criado_em AS criadoEm,
  u.nome AS autorNome, u.perfil AS autorPerfil, u.setor_id AS setorId, s.nome AS setorNome,
  av.nome AS avaliadorNome, r.nome AS requisitoNome`;
const DE = `FROM acoes a JOIN usuarios u ON u.id = a.usuario_id LEFT JOIN setores s ON s.id = u.setor_id
  LEFT JOIN usuarios av ON av.id = a.avaliado_por LEFT JOIN requisitos_fornecedor r ON r.id = a.requisito_id`;

const mapear = (l) => {
  if (!l) return null;
  const { evidenciaArquivo, ...resto } = l;
  return { ...resto, evidenciaArquivo, temArquivo: Boolean(evidenciaArquivo) };
};

/** @param {import('node:sqlite').DatabaseSync} db */
export function criarAcaoModel(db) {
  return {
    /** @returns {number} id criado */
    criar(d) {
      const r = db
        .prepare(
          `INSERT INTO acoes (usuario_id, tipo, categoria, descricao, evidencia_nome, evidencia_arquivo, evidencia_mime, requisito_id, status, criado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
        )
        .run(d.usuarioId, d.tipo, d.categoria, d.descricao ?? null, d.evidenciaNome, d.evidenciaArquivo ?? null,
          d.evidenciaMime ?? null, d.requisitoId ?? null, d.status ?? 'pendente', d.criadoEm ?? null);
      return Number(r.lastInsertRowid);
    },

    buscar(id) {
      return mapear(db.prepare(`SELECT ${CAMPOS} ${DE} WHERE a.id = ?`).get(id));
    },

    /**
     * @param {{status?: string, usuarioId?: number, limite?: number}} filtro
     */
    listar({ status, usuarioId, limite = 50 } = {}) {
      const condicoes = [];
      const valores = [];
      if (status) { condicoes.push('a.status = ?'); valores.push(status); }
      if (usuarioId) { condicoes.push('a.usuario_id = ?'); valores.push(usuarioId); }
      const onde = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
      const ordem = status === 'pendente' ? 'a.criado_em ASC' : 'COALESCE(a.avaliado_em, a.criado_em) DESC';
      return db.prepare(`SELECT ${CAMPOS} ${DE} ${onde} ORDER BY ${ordem}, a.id DESC LIMIT ?`).all(...valores, limite).map(mapear);
    },

    /** Registra a decisão da gestora sobre a evidência. */
    avaliar(id, { status, motivo = null, pontos = 0, avaliadoPor }) {
      db.prepare(
        `UPDATE acoes SET status = ?, motivo = ?, pontos = ?, avaliado_por = ?, avaliado_em = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
      ).run(status, motivo, pontos, avaliadoPor, id);
    },

    contarPorStatus(status) {
      return db.prepare('SELECT COUNT(*) AS n FROM acoes WHERE status = ?').get(status).n;
    },
  };
}
