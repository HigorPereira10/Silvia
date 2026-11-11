/**
 * @file Model de setores e das medições mensais.
 */

const CAMPOS_SETOR = `id, nome, pontos, base_energia_kwh AS baseEnergiaKwh, base_papel_folhas AS basePapelFolhas,
  meta_energia_pct AS metaEnergiaPct, meta_papel_pct AS metaPapelPct, meta_reciclavel_pct AS metaReciclavelPct`;
const CAMPOS_MEDICAO = `id, setor_id AS setorId, mes, energia_kwh AS energiaKwh, papel_folhas AS papelFolhas,
  reciclavel_pct AS reciclavelPct, registrado_por AS registradoPor, criado_em AS criadoEm`;

/** @param {import('node:sqlite').DatabaseSync} db */
export function criarSetorModel(db) {
  return {
    listar() {
      return db.prepare(`SELECT ${CAMPOS_SETOR} FROM setores ORDER BY nome`).all();
    },

    buscar(id) {
      return db.prepare(`SELECT ${CAMPOS_SETOR} FROM setores WHERE id = ?`).get(id) ?? null;
    },

    criar(s) {
      db.prepare(
        `INSERT INTO setores (id, nome, pontos, base_energia_kwh, base_papel_folhas, meta_energia_pct, meta_papel_pct, meta_reciclavel_pct)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(s.id, s.nome, s.pontos ?? 0, s.baseEnergiaKwh, s.basePapelFolhas, s.metaEnergiaPct ?? 10, s.metaPapelPct ?? 15, s.metaReciclavelPct ?? 70);
    },

    definirPontos(id, pontos) {
      db.prepare('UPDATE setores SET pontos = ? WHERE id = ?').run(pontos, id);
    },

    /** Medição mais recente do setor, ou null. */
    ultimaMedicao(setorId) {
      return db.prepare(`SELECT ${CAMPOS_MEDICAO} FROM medicoes WHERE setor_id = ? ORDER BY mes DESC LIMIT 1`).get(setorId) ?? null;
    },

    listarMedicoes(setorId, limite = 12) {
      return db.prepare(`SELECT ${CAMPOS_MEDICAO} FROM medicoes WHERE setor_id = ? ORDER BY mes DESC LIMIT ?`).all(setorId, limite);
    },

    /** Cria ou substitui a medição do mês (uma por setor e mês). */
    salvarMedicao({ setorId, mes, energiaKwh, papelFolhas, reciclavelPct, registradoPor = null }) {
      db.prepare(
        `INSERT INTO medicoes (setor_id, mes, energia_kwh, papel_folhas, reciclavel_pct, registrado_por)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (setor_id, mes) DO UPDATE SET energia_kwh = excluded.energia_kwh,
           papel_folhas = excluded.papel_folhas, reciclavel_pct = excluded.reciclavel_pct,
           registrado_por = excluded.registrado_por, criado_em = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
      ).run(setorId, mes, energiaKwh, papelFolhas, reciclavelPct, registradoPor);
    },

    /** Consumo total de energia da empresa por mês (últimos `limite` meses). */
    energiaPorMes(limite = 6) {
      return db
        .prepare(`SELECT mes, SUM(energia_kwh) AS energiaKwh, COUNT(*) AS setores FROM medicoes GROUP BY mes ORDER BY mes DESC LIMIT ?`)
        .all(limite)
        .reverse();
    },
  };
}
