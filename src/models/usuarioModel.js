/**
 * @file Model de usuários (colaboradores, gestor e fornecedores).
 */

const CAMPOS = `u.id, u.nome, u.email, u.perfil, u.setor_id AS setorId, u.fornecedor_id AS fornecedorId,
  u.ferias, u.criado_em AS criadoEm, s.nome AS setorNome, f.nome AS fornecedorNome, f.ramo AS fornecedorRamo`;
const DE = `FROM usuarios u LEFT JOIN setores s ON s.id = u.setor_id LEFT JOIN fornecedores f ON f.id = u.fornecedor_id`;

/** Converte a linha do banco no objeto usado pela aplicação. */
const mapear = (linha) => (linha ? { ...linha, ferias: Boolean(linha.ferias) } : null);

/** @param {import('node:sqlite').DatabaseSync} db */
export function criarUsuarioModel(db) {
  return {
    /** Busca por e-mail incluindo o hash da senha (uso exclusivo do login). */
    buscarPorEmailComSenha(email) {
      const linha = db.prepare(`SELECT ${CAMPOS}, u.senha_hash AS senhaHash ${DE} WHERE u.email = ?`).get(email);
      return mapear(linha);
    },

    buscarPorId(id) {
      return mapear(db.prepare(`SELECT ${CAMPOS} ${DE} WHERE u.id = ?`).get(id));
    },

    /** @param {'colaborador'|'gestor'|'fornecedor'} perfil */
    listarPorPerfil(perfil) {
      return db.prepare(`SELECT ${CAMPOS} ${DE} WHERE u.perfil = ? ORDER BY u.nome`).all(perfil).map(mapear);
    },

    listarPorSetor(setorId) {
      return db.prepare(`SELECT ${CAMPOS} ${DE} WHERE u.setor_id = ? ORDER BY u.nome`).all(setorId).map(mapear);
    },

    /** Usuários de demonstração exibidos na tela de login. */
    listarParaDemonstracao() {
      return db.prepare(`SELECT ${CAMPOS} ${DE} ORDER BY CASE u.perfil WHEN 'colaborador' THEN 0 WHEN 'gestor' THEN 1 ELSE 2 END, u.id`).all().map(mapear);
    },

    /**
     * @param {{nome: string, email: string, senhaHash: string, perfil: string, setorId?: string|null, fornecedorId?: number|null}} dados
     * @returns {number} id criado
     */
    criar({ nome, email, senhaHash, perfil, setorId = null, fornecedorId = null }) {
      const r = db
        .prepare('INSERT INTO usuarios (nome, email, senha_hash, perfil, setor_id, fornecedor_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(nome, email, senhaHash, perfil, setorId, fornecedorId);
      return Number(r.lastInsertRowid);
    },

    atualizarFerias(id, ferias) {
      db.prepare('UPDATE usuarios SET ferias = ? WHERE id = ?').run(ferias ? 1 : 0, id);
    },

    contarPorPerfil(perfil) {
      return db.prepare('SELECT COUNT(*) AS n FROM usuarios WHERE perfil = ?').get(perfil).n;
    },
  };
}
