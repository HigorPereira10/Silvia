/**
 * @file Barramento de eventos de domínio.
 *
 * Os serviços publicam eventos ("planta.atualizada", "feed.novo"...) sem saber
 * quem vai recebê-los. O gateway WebSocket assina o barramento e repassa cada
 * evento aos clientes conectados. Isso desacopla regra de negócio e transporte.
 */
import { EventEmitter } from 'node:events';

/**
 * Destino de um evento:
 *  - 'todos': inclusive a página pública (sem login)
 *  - 'autenticados': qualquer usuário logado
 *  - { perfil: 'gestor' } ou { usuarioId: 3 }
 * @typedef {'todos'|'autenticados'|{perfil: string}|{usuarioId: number}} Destino
 */

/**
 * @typedef {object} EventoDominio
 * @property {string} evento
 * @property {unknown} dados
 * @property {Destino} destino
 * @property {string} em data ISO
 */

export function criarBarramentoEventos() {
  const emissor = new EventEmitter();
  emissor.setMaxListeners(100);

  return {
    /**
     * @param {string} evento
     * @param {unknown} dados
     * @param {Destino} [destino]
     */
    emitir(evento, dados, destino = 'autenticados') {
      emissor.emit('evento', { evento, dados, destino, em: new Date().toISOString() });
    },

    /**
     * @param {(e: EventoDominio) => void} ouvinte
     * @returns {() => void} função para cancelar a assinatura
     */
    assinar(ouvinte) {
      emissor.on('evento', ouvinte);
      return () => emissor.off('evento', ouvinte);
    },
  };
}
