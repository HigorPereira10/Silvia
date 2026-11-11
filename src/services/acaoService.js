/**
 * @file Serviço de ações ambientais ("regar").
 *
 * Fluxo: o colaborador (ou fornecedor) registra uma ação com evidência
 * (8.1, 7.5) -> a gestora valida -> se aprovada, a planta recebe água,
 * crescimento e o setor ganha pontos. Sem evidência aprovada não há pontos.
 */
import path from 'node:path';
import { CATEGORIAS_ACAO, CATEGORIAS_FORNECEDOR, REGRAS } from '../domain/constantes.js';
import { transacao } from '../database/conexao.js';
import { conflito, entidadeInvalida, naoEncontrado, proibido } from '../utils/erros.js';

const PREFIXO_REQUISITO = 'Comprovar: ';

/**
 * @param {{db: import('node:sqlite').DatabaseSync, models: import('../models/index.js').Models,
 *   registro: ReturnType<typeof import('./registroService.js').criarRegistroService>,
 *   plantas: ReturnType<typeof import('./plantaService.js').criarPlantaService>,
 *   eventos: ReturnType<typeof import('../realtime/eventos.js').criarBarramentoEventos>,
 *   pastaUploads: string}} deps
 */
export function criarAcaoService({ db, models, registro, plantas, eventos, pastaUploads }) {
  /** Esconde o nome interno do arquivo na resposta da API. */
  const apresentar = (acao) => {
    if (!acao) return acao;
    const { evidenciaArquivo: _interno, ...publico } = acao;
    return publico;
  };

  return {
    /** Categorias que o usuário pode registrar, conforme o perfil. */
    categorias(usuario) {
      if (usuario.perfil === 'fornecedor') {
        const pendentes = models.fornecedores.requisitos(usuario.fornecedorId).filter((r) => !r.atendido);
        return {
          categorias: CATEGORIAS_FORNECEDOR,
          requisitosPendentes: pendentes.map((r) => ({ id: r.id, nome: r.nome })),
        };
      }
      return { categorias: CATEGORIAS_ACAO, requisitosPendentes: [] };
    },

    /**
     * Registra uma ação com evidência.
     * @param {{id: number, nome: string, perfil: string, fornecedorId?: number}} usuario
     * @param {{categoria?: string, descricao?: string, requisitoId?: number}} dados
     * @param {{filename: string, originalname: string, mimetype: string}|undefined} arquivo
     */
    registrar(usuario, { categoria, descricao, requisitoId }, arquivo) {
      if (usuario.perfil === 'gestor') throw proibido('A gestora valida ações, mas não registra ações para a própria planta.');
      if (!arquivo) {
        throw entidadeInvalida('evidencia_obrigatoria', 'Toda ação precisa de uma evidência (foto ou PDF).', { campo: 'evidencia' });
      }

      let categoriaFinal = categoria;
      let requisito = null;
      if (usuario.perfil === 'fornecedor' && requisitoId) {
        requisito = models.fornecedores.buscarRequisito(requisitoId);
        if (!requisito || requisito.fornecedorId !== usuario.fornecedorId) throw naoEncontrado('Requisito não encontrado.');
        if (requisito.atendido) throw conflito('Este requisito já está atendido.');
        categoriaFinal = PREFIXO_REQUISITO + requisito.nome;
      } else {
        const permitidas = usuario.perfil === 'fornecedor' ? CATEGORIAS_FORNECEDOR : CATEGORIAS_ACAO;
        if (!permitidas.includes(categoria)) {
          throw entidadeInvalida('categoria_invalida', 'Escolha uma das ações da lista.', { campo: 'categoria', permitidas });
        }
      }

      const id = models.acoes.criar({
        usuarioId: usuario.id,
        tipo: usuario.perfil === 'fornecedor' ? 'fornecedor' : 'regar',
        categoria: categoriaFinal,
        descricao: descricao || null,
        evidenciaNome: arquivo.originalname,
        evidenciaArquivo: arquivo.filename,
        evidenciaMime: arquivo.mimetype,
        requisitoId: requisito?.id ?? null,
      });
      registro.feed(usuario.nome, `registrou: ${categoriaFinal.toLowerCase()}.`, 'agua');
      registro.auditar(usuario.nome, 'Registrou ação', `${categoriaFinal} · evidência ${arquivo.originalname}`);
      const acao = apresentar(models.acoes.buscar(id));
      eventos.emitir('validacao.nova', acao, { perfil: 'gestor' });
      return acao;
    },

    listarPendentes: () => models.acoes.listar({ status: 'pendente', limite: 100 }).map(apresentar),

    listarDecididas(limite = 10) {
      return [...models.acoes.listar({ status: 'aprovada', limite }), ...models.acoes.listar({ status: 'recusada', limite })]
        .sort((a, b) => String(b.avaliadoEm).localeCompare(String(a.avaliadoEm)))
        .slice(0, limite)
        .map(apresentar);
    },

    listarDoUsuario: (usuarioId) => models.acoes.listar({ usuarioId, limite: 100 }).map(apresentar),

    /**
     * Arquivo da evidência (somente o autor ou a gestora).
     * @returns {{caminho: string, mime: string, nome: string}}
     */
    evidencia(usuario, id) {
      const acao = models.acoes.buscar(id);
      if (!acao) throw naoEncontrado('Ação não encontrada.');
      if (usuario.perfil !== 'gestor' && acao.usuarioId !== usuario.id) throw proibido();
      if (!acao.evidenciaArquivo) throw naoEncontrado('Esta ação de demonstração não tem arquivo anexado.');
      return { caminho: path.join(pastaUploads, acao.evidenciaArquivo), mime: acao.evidenciaMime, nome: acao.evidenciaNome };
    },

    /**
     * Decisão da gestora sobre a evidência.
     * @param {{id: number, nome: string}} gestor
     * @param {number} id
     * @param {{decisao: 'aprovar'|'recusar', motivo?: string}} dados
     */
    avaliar(gestor, id, { decisao, motivo }) {
      const resultado = transacao(db, () => {
        const acao = models.acoes.buscar(id);
        if (!acao) throw naoEncontrado('Ação não encontrada.');
        if (acao.status !== 'pendente') throw conflito('Esta ação já foi avaliada.');

        if (decisao === 'recusar') {
          models.acoes.avaliar(id, { status: 'recusada', motivo, avaliadoPor: gestor.id });
          registro.notificar(acao.usuarioId, `Sua ação "${acao.categoria}" foi recusada: ${motivo}.`);
          registro.auditar(gestor.nome, 'Recusou evidência', `${acao.autorNome} · ${acao.categoria} · motivo: ${motivo}`);
          return { acao: models.acoes.buscar(id), planta: null };
        }

        const ehFornecedor = acao.autorPerfil === 'fornecedor';
        const pontos = ehFornecedor ? 0 : REGRAS.acaoPontos;
        models.acoes.avaliar(id, { status: 'aprovada', pontos, avaliadoPor: gestor.id });
        if (acao.requisitoId) {
          models.fornecedores.marcarRequisitoAtendido(acao.requisitoId);
          registro.feed(acao.autorNome, `cumpriu o requisito: ${acao.requisitoNome.toLowerCase()}.`, 'marco');
        }
        const planta = plantas.recompensar(acao.usuarioId, {
          agua: REGRAS.acaoAgua,
          adubo: ehFornecedor ? REGRAS.fornecedorAdubo : 0,
          xp: REGRAS.acaoXp,
          pontos,
        });
        registro.notificar(acao.usuarioId, `Sua ação "${acao.categoria}" foi aprovada: +${REGRAS.acaoAgua} de água.`);
        registro.feed(acao.autorNome, `regou a muda: ${acao.categoria.toLowerCase()}.`, 'agua');
        registro.auditar(gestor.nome, 'Aprovou evidência', `${acao.autorNome} · ${acao.categoria}`);
        return { acao: models.acoes.buscar(id), planta };
      });
      const acao = apresentar(resultado.acao);
      eventos.emitir('validacao.decidida', acao, 'autenticados');
      return { acao, planta: resultado.planta };
    },
  };
}
