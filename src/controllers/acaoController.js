/**
 * @file Controller das ações ambientais ("regar") e da validação de evidências.
 */

/** @param {import('../services/index.js').Servicos} s */
export function criarAcaoController(s) {
  return {
    /** GET /acoes/categorias */
    categorias(req, res) {
      res.json(s.acoes.categorias(req.usuario));
    },

    /** POST /acoes (multipart/form-data com o arquivo no campo "evidencia") */
    registrar(req, res) {
      res.status(201).json(s.acoes.registrar(req.usuario, req.validado.body, req.file));
    },

    /** GET /acoes/minhas */
    minhas(req, res) {
      res.json(s.acoes.listarDoUsuario(req.usuario.id));
    },

    /** GET /acoes?status=pendente (gestora) */
    listar(req, res) {
      const { status = 'pendente' } = req.validado.query;
      res.json(status === 'pendente' ? s.acoes.listarPendentes() : s.acoes.listarDecididas(20).filter((a) => a.status === status));
    },

    /** GET /acoes/:id/evidencia */
    evidencia(req, res) {
      const arquivo = s.acoes.evidencia(req.usuario, req.validado.params.id);
      res.type(arquivo.mime);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(arquivo.nome)}"`);
      res.sendFile(arquivo.caminho);
    },

    /** PATCH /acoes/:id/avaliacao (gestora) */
    avaliar(req, res) {
      res.json(s.acoes.avaliar(req.usuario, req.validado.params.id, req.validado.body));
    },

    /** GET /acoes/decididas (gestora) */
    decididas(_req, res) {
      res.json(s.acoes.listarDecididas(10));
    },
  };
}
