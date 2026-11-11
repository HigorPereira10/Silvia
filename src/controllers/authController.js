/**
 * @file Controllers de autenticação e do usuário logado.
 *
 * Controllers são finos: leem a requisição já validada, chamam o serviço e
 * escolhem o status HTTP. Nenhuma regra de negócio mora aqui.
 */

/** @param {import('../services/index.js').Servicos} s */
export function criarAuthController(s) {
  return {
    /** POST /auth/login */
    login(req, res) {
      const { email, senha } = req.validado.body;
      res.json(s.auth.login(email, senha));
    },

    /** GET /auth/contas-demo */
    contasDemo(_req, res) {
      res.json({ senha: 'silvia123', contas: s.auth.contasDemonstracao() });
    },
  };
}

/** @param {import('../services/index.js').Servicos} s */
export function criarUsuarioController(s) {
  return {
    /** GET /eu */
    perfil(req, res) {
      res.json(s.usuarios.perfil(req.usuario));
    },

    /** PATCH /eu/ferias */
    ferias(req, res) {
      res.json(s.usuarios.definirFerias(req.usuario, req.validado.body.ferias));
    },

    /** GET /eu/notificacoes */
    notificacoes(req, res) {
      res.json(s.usuarios.notificacoes(req.usuario));
    },

    /** PATCH /eu/notificacoes/lidas */
    marcarLidas(req, res) {
      res.json(s.usuarios.marcarNotificacoesLidas(req.usuario));
    },

    /** GET /feed */
    feed(req, res) {
      res.json(s.usuarios.feed(req.validado.query.limite ?? 20));
    },
  };
}
