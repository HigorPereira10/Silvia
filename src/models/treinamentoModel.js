/**
 * @file Model de treinamentos: módulos, perguntas, tentativas e conclusões.
 */

const mapTentativa = (l) =>
  l ? { ...l, respostas: JSON.parse(l.respostas), finalizada: Boolean(l.finalizada), pontuou: Boolean(l.pontuou) } : null;

/** @param {import('node:sqlite').DatabaseSync} db */
export function criarTreinamentoModel(db) {
  return {
    listarModulos() {
      return db.prepare('SELECT id, nome, descricao, ordem FROM modulos_treinamento ORDER BY ordem').all();
    },

    buscarModulo(id) {
      return db.prepare('SELECT id, nome, descricao, ordem FROM modulos_treinamento WHERE id = ?').get(id) ?? null;
    },

    /** Perguntas de um módulo, com a resposta correta (uso interno do serviço). */
    perguntasDoModulo(moduloId) {
      return db
        .prepare('SELECT id, ordem, enunciado, opcoes, correta, explicacao FROM perguntas WHERE modulo_id = ? ORDER BY ordem')
        .all(moduloId)
        .map((p) => ({ ...p, opcoes: JSON.parse(p.opcoes) }));
    },

    criarModulo({ id, nome, descricao, ordem, perguntas }) {
      db.prepare('INSERT INTO modulos_treinamento (id, nome, descricao, ordem) VALUES (?, ?, ?, ?)').run(id, nome, descricao, ordem);
      const inserir = db.prepare('INSERT INTO perguntas (modulo_id, ordem, enunciado, opcoes, correta, explicacao) VALUES (?, ?, ?, ?, ?, ?)');
      perguntas.forEach((p, i) => inserir.run(id, i + 1, p.enunciado, JSON.stringify(p.opcoes), p.correta, p.explicacao));
    },

    /** Conclusões do usuário indexadas por módulo: { m1: 3, ... }. */
    conclusoesDoUsuario(usuarioId) {
      const saida = {};
      for (const l of db.prepare('SELECT modulo_id AS moduloId, acertos FROM conclusoes_treinamento WHERE usuario_id = ?').all(usuarioId)) {
        saida[l.moduloId] = l.acertos;
      }
      return saida;
    },

    registrarConclusao(usuarioId, moduloId, acertos) {
      db.prepare(
        `INSERT INTO conclusoes_treinamento (usuario_id, modulo_id, acertos) VALUES (?, ?, ?)
         ON CONFLICT (usuario_id, modulo_id) DO UPDATE SET acertos = MAX(acertos, excluded.acertos)`,
      ).run(usuarioId, moduloId, acertos);
    },

    /** Quantos colaboradores concluíram ao menos um módulo. */
    contarColaboradoresTreinados() {
      return db
        .prepare(`SELECT COUNT(DISTINCT c.usuario_id) AS n FROM conclusoes_treinamento c JOIN usuarios u ON u.id = c.usuario_id WHERE u.perfil = 'colaborador'`)
        .get().n;
    },

    criarTentativa(usuarioId, moduloId) {
      const r = db.prepare('INSERT INTO tentativas_treinamento (usuario_id, modulo_id) VALUES (?, ?)').run(usuarioId, moduloId);
      return Number(r.lastInsertRowid);
    },

    buscarTentativa(id) {
      return mapTentativa(
        db.prepare(`SELECT id, usuario_id AS usuarioId, modulo_id AS moduloId, respostas, acertos, finalizada, pontuou
          FROM tentativas_treinamento WHERE id = ?`).get(id),
      );
    },

    salvarTentativa(id, { respostas, acertos, finalizada, pontuou }) {
      db.prepare(
        `UPDATE tentativas_treinamento SET respostas = ?, acertos = ?, finalizada = ?, pontuou = ?,
          finalizada_em = CASE WHEN ? THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now') ELSE NULL END WHERE id = ?`,
      ).run(JSON.stringify(respostas), acertos, finalizada ? 1 : 0, pontuou ? 1 : 0, finalizada ? 1 : 0, id);
    },
  };
}
