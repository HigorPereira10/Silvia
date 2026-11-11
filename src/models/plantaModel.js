/**
 * @file Model das plantas virtuais.
 */

const CAMPOS = `p.id, p.usuario_id AS usuarioId, p.especie, p.estagio, p.xp, p.agua, p.adubo,
  p.galho_seco AS galhoSeco, p.semente, p.atualizada_em AS atualizadaEm,
  u.nome AS donoNome, u.perfil AS donoPerfil, u.setor_id AS setorId, u.fornecedor_id AS fornecedorId, u.ferias`;
const DE = 'FROM plantas p JOIN usuarios u ON u.id = p.usuario_id';

const mapear = (l) => (l ? { ...l, galhoSeco: Boolean(l.galhoSeco), ferias: Boolean(l.ferias) } : null);

/** @param {import('node:sqlite').DatabaseSync} db */
export function criarPlantaModel(db) {
  return {
    buscarPorUsuario(usuarioId) {
      return mapear(db.prepare(`SELECT ${CAMPOS} ${DE} WHERE p.usuario_id = ?`).get(usuarioId));
    },

    listarPorSetor(setorId) {
      return db.prepare(`SELECT ${CAMPOS} ${DE} WHERE u.setor_id = ? ORDER BY u.nome`).all(setorId).map(mapear);
    },

    listarDeFornecedores() {
      return db.prepare(`SELECT ${CAMPOS} ${DE} WHERE u.perfil = 'fornecedor' ORDER BY u.nome`).all().map(mapear);
    },

    listarTodas() {
      return db.prepare(`SELECT ${CAMPOS} ${DE} ORDER BY p.id`).all().map(mapear);
    },

    /**
     * @param {{usuarioId: number, especie: string, estagio?: number, xp?: number, agua?: number, adubo?: number, galhoSeco?: boolean, semente: number}} d
     */
    criar(d) {
      db.prepare(
        'INSERT INTO plantas (usuario_id, especie, estagio, xp, agua, adubo, galho_seco, semente) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(d.usuarioId, d.especie, d.estagio ?? 0, d.xp ?? 0, d.agua ?? 60, d.adubo ?? 50, d.galhoSeco ? 1 : 0, d.semente);
    },

    /**
     * Atualiza o estado da planta de um usuário.
     * @param {number} usuarioId
     * @param {{estagio: number, xp: number, agua: number, adubo: number, galhoSeco: boolean}} e
     */
    salvarEstado(usuarioId, e) {
      db.prepare(
        `UPDATE plantas SET estagio = ?, xp = ?, agua = ?, adubo = ?, galho_seco = ?,
         atualizada_em = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE usuario_id = ?`,
      ).run(e.estagio, e.xp, Math.round(e.agua), Math.round(e.adubo), e.galhoSeco ? 1 : 0, usuarioId);
    },
  };
}
