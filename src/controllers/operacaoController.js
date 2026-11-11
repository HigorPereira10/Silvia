/**
 * @file Controllers de não conformidades, treinamentos, setores, fornecedores e plantios.
 */

/** @param {import('../services/index.js').Servicos} s */
export function criarNaoConformidadeController(s) {
  return {
    /** POST /ncs */
    abrir(req, res) {
      res.status(201).json(s.ncs.abrir(req.usuario, req.validado.body));
    },
    /** GET /ncs */
    listar(req, res) {
      res.json(s.ncs.listar(req.usuario, req.validado.query));
    },
    /** PATCH /ncs/:id (gestora) */
    tratar(req, res) {
      res.json(s.ncs.tratar(req.usuario, req.validado.params.id, req.validado.body));
    },
  };
}

/** @param {import('../services/index.js').Servicos} s */
export function criarTreinamentoController(s) {
  return {
    /** GET /treinamentos */
    listar(req, res) {
      res.json(s.treinamentos.listar(req.usuario));
    },
    /** POST /treinamentos/:id/tentativas */
    iniciar(req, res) {
      res.status(201).json(s.treinamentos.iniciar(req.usuario, req.validado.params.id));
    },
    /** POST /tentativas/:id/respostas */
    responder(req, res) {
      res.json(s.treinamentos.responder(req.usuario, req.validado.params.id, req.validado.body));
    },
  };
}

/** @param {import('../services/index.js').Servicos} s */
export function criarSetorController(s) {
  return {
    /** GET /setores */
    listar(_req, res) {
      res.json(s.setores.listar());
    },
    /** GET /setores/:id */
    obter(req, res) {
      res.json(s.setores.obter(req.validado.params.id));
    },
    /** GET /setores/:id/canteiro */
    canteiro(req, res) {
      res.json(s.setores.canteiro(req.validado.params.id));
    },
    /** GET /setores/:id/medicoes */
    medicoes(req, res) {
      res.json(s.setores.medicoes(req.validado.params.id));
    },
    /** POST /setores/:id/medicoes (gestora) */
    lancarMedicao(req, res) {
      res.status(201).json(s.setores.lancarMedicao(req.usuario, req.validado.params.id, req.validado.body));
    },
    /** GET /fornecedores (gestora) */
    fornecedores(_req, res) {
      res.json(s.fornecedores.lista());
    },
    /** GET /fornecedores/canteiro */
    canteiroFornecedores(_req, res) {
      res.json(s.fornecedores.canteiro());
    },
  };
}

/** @param {import('../services/index.js').Servicos} s */
export function criarPlantioController(s) {
  return {
    /** GET /plantios */
    listar(req, res) {
      res.json(s.plantios.listar(req.validado.query));
    },
    /** PATCH /plantios/:id (gestora), consome o web service ViaCEP */
    async registrar(req, res) {
      res.json(await s.plantios.registrar(req.usuario, req.validado.params.id, req.validado.body));
    },
  };
}
