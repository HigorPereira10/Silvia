/**
 * @file Rotas da API REST v1.
 *
 * Cada rota declara, nesta ordem: autenticação, perfil exigido, validação e
 * o controller. A documentação completa está em src/docs/openapi.yaml e na
 * interface Swagger em /api/docs.
 */
import { Router } from 'express';
import { esquemas as e } from '../validators/esquemas.js';
import { validar } from '../middlewares/validacao.js';
import { autenticar, exigirPerfil } from '../middlewares/autenticacao.js';
import { criarUploadEvidencia } from '../middlewares/upload.js';
import { criarAuthController, criarUsuarioController } from '../controllers/authController.js';
import { criarAcaoController } from '../controllers/acaoController.js';
import {
  criarNaoConformidadeController, criarPlantioController, criarSetorController, criarTreinamentoController,
} from '../controllers/operacaoController.js';
import { criarGestaoController, criarPublicoController } from '../controllers/gestaoController.js';

/**
 * @param {import('../services/index.js').Servicos} servicos
 * @param {import('../config/index.js').Config} config
 * @returns {Router}
 */
export function criarRotas(servicos, config) {
  const r = Router();
  const auth = criarAuthController(servicos);
  const usuario = criarUsuarioController(servicos);
  const acao = criarAcaoController(servicos);
  const nc = criarNaoConformidadeController(servicos);
  const treino = criarTreinamentoController(servicos);
  const setor = criarSetorController(servicos);
  const plantio = criarPlantioController(servicos);
  const gestao = criarGestaoController(servicos);
  const publico = criarPublicoController(servicos);

  const logado = autenticar(servicos.auth);
  const gestor = exigirPerfil('gestor');
  const upload = criarUploadEvidencia(config.uploads);

  // ---------- Públicas (sem login) ----------
  r.get('/saude', publico.saude);
  r.get('/catalogo', publico.catalogo);
  r.get('/publico/floresta', publico.floresta);
  r.post('/auth/login', validar(e.login), auth.login);
  r.get('/auth/contas-demo', auth.contasDemo);

  // ---------- Daqui para baixo exige login ----------
  r.use(logado);

  // Usuário logado
  r.get('/eu', usuario.perfil);
  r.patch('/eu/ferias', exigirPerfil('colaborador', 'fornecedor'), validar(e.ferias), usuario.ferias);
  r.get('/eu/notificacoes', usuario.notificacoes);
  r.patch('/eu/notificacoes/lidas', usuario.marcarLidas);
  r.get('/feed', validar(e.limite, 'query'), usuario.feed);

  // Setores, metas e medições
  r.get('/setores', setor.listar);
  r.get('/setores/:id', validar(e.setorParam, 'params'), setor.obter);
  r.get('/setores/:id/canteiro', validar(e.setorParam, 'params'), setor.canteiro);
  r.get('/setores/:id/medicoes', validar(e.setorParam, 'params'), setor.medicoes);
  r.post('/setores/:id/medicoes', gestor, validar(e.setorParam, 'params'), validar(e.medicao), setor.lancarMedicao);

  // Fornecedores
  r.get('/fornecedores', gestor, setor.fornecedores);
  r.get('/fornecedores/canteiro', setor.canteiroFornecedores);

  // Ações ambientais ("regar") e validação de evidências
  r.get('/acoes/categorias', acao.categorias);
  r.get('/acoes/minhas', acao.minhas);
  r.get('/acoes/decididas', gestor, acao.decididas);
  r.get('/acoes', gestor, validar(e.filtroStatusAcao, 'query'), acao.listar);
  r.post('/acoes', exigirPerfil('colaborador', 'fornecedor'), upload, validar(e.acaoCriar), acao.registrar);
  r.get('/acoes/:id/evidencia', validar(e.idParam, 'params'), acao.evidencia);
  r.patch('/acoes/:id/avaliacao', gestor, validar(e.idParam, 'params'), validar(e.avaliacao), acao.avaliar);

  // Não conformidades ("podar")
  r.post('/ncs', exigirPerfil('colaborador', 'fornecedor'), validar(e.ncCriar), nc.abrir);
  r.get('/ncs', validar(e.filtroStatusNc, 'query'), nc.listar);
  r.patch('/ncs/:id', gestor, validar(e.idParam, 'params'), validar(e.ncTratar), nc.tratar);

  // Treinamentos ("adubar")
  r.get('/treinamentos', treino.listar);
  r.post('/treinamentos/:id/tentativas', validar(e.moduloParam, 'params'), treino.iniciar);
  r.post('/tentativas/:id/respostas', validar(e.idParam, 'params'), validar(e.resposta), treino.responder);

  // Plantios de árvores reais
  r.get('/plantios', validar(e.filtroPlantio, 'query'), plantio.listar);
  r.patch('/plantios/:id', gestor, validar(e.idParam, 'params'), validar(e.plantio), plantio.registrar);

  // Gestão ambiental: indicadores, relatórios e auditoria
  r.get('/indicadores/painel', gestor, gestao.painel);
  r.get('/relatorios/analise-critica', gestor, gestao.analiseCritica);
  r.get('/auditoria', gestor, validar(e.limite, 'query'), gestao.auditoria);
  r.post('/admin/ciclo-diario', gestor, gestao.cicloDiario);

  return r;
}
