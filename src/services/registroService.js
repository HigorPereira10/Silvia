/**
 * @file Serviço de registros: feed "Acontecendo agora", auditoria e notificações.
 *
 * Centraliza os efeitos colaterais de comunicação (7.4) e rastreabilidade (9.2)
 * que quase todas as operações do sistema produzem.
 */

/**
 * @param {{models: import('../models/index.js').Models, eventos: ReturnType<typeof import('../realtime/eventos.js').criarBarramentoEventos>}} deps
 */
export function criarRegistroService({ models, eventos }) {
  const servico = {
    /**
     * Publica um item no feed e avisa todos os clientes logados.
     * @param {string|null} ator nome exibido em destaque
     * @param {string} texto
     * @param {'geral'|'agua'|'poda'|'marco'} [tipo]
     */
    feed(ator, texto, tipo = 'geral') {
      const item = models.feed.criar({ ator, texto, tipo });
      eventos.emitir('feed.novo', item, 'autenticados');
      return item;
    },

    /** Grava uma linha na trilha de auditoria. */
    auditar(ator, acao, detalhe = null) {
      models.auditoria.criar(ator, acao, detalhe);
    },

    /** Cria uma notificação e envia ao usuário em tempo real. */
    notificar(usuarioId, mensagem) {
      models.notificacoes.criar(usuarioId, mensagem);
      eventos.emitir(
        'notificacao.nova',
        { mensagem, naoLidas: models.notificacoes.contarNaoLidas(usuarioId) },
        { usuarioId },
      );
    },

    /** Notifica todos os gestores ambientais. */
    notificarGestores(mensagem) {
      for (const gestor of models.usuarios.listarPorPerfil('gestor')) servico.notificar(gestor.id, mensagem);
    },
  };
  return servico;
}
