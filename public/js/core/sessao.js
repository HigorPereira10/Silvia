/**
 * @file Sessão do usuário no navegador (token JWT e dados básicos).
 */
const CHAVE = 'silvia.sessao';

function ler() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE)) ?? {};
  } catch {
    return {};
  }
}

export const sessao = {
  /** @returns {string|null} */
  get token() {
    return ler().token ?? null;
  },

  /** @returns {{id: number, nome: string, perfil: string}|null} */
  get usuario() {
    return ler().usuario ?? null;
  },

  /** Guarda o token e o usuário após o login. */
  entrar(token, usuario) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ token, usuario }));
    } catch {
      /* navegação privada: a sessão vale só nesta aba */
    }
  },

  sair() {
    try {
      localStorage.removeItem(CHAVE);
    } catch {
      /* ignorado */
    }
  },
};
