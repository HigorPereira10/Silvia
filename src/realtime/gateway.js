/**
 * @file Gateway WebSocket (tempo real).
 *
 * Endereço: ws://<servidor>/tempo-real?token=<jwt>
 *  - com token: recebe eventos destinados a usuários logados, ao seu perfil e a ele mesmo;
 *  - sem token: conexão pública, recebe apenas eventos com destino "todos"
 *    (ex.: a página pública da floresta).
 *
 * Mensagens enviadas ao cliente: `{ "evento": "...", "dados": {...}, "em": "ISO" }`.
 */
import { WebSocketServer } from 'ws';
import { logger } from '../utils/logger.js';

/**
 * Decide se um cliente deve receber o evento.
 * @param {{usuario: {id: number, perfil: string}|null}} cliente
 * @param {import('./eventos.js').Destino} destino
 */
export function deveReceber(cliente, destino) {
  if (destino === 'todos') return true;
  if (!cliente.usuario) return false;
  if (destino === 'autenticados') return true;
  if (destino.perfil) return cliente.usuario.perfil === destino.perfil;
  if (destino.usuarioId) return cliente.usuario.id === destino.usuarioId;
  return false;
}

/**
 * @param {{servidor: import('node:http').Server,
 *   eventos: ReturnType<typeof import('./eventos.js').criarBarramentoEventos>,
 *   auth: ReturnType<typeof import('../services/usuarioService.js').criarAuthService>}} deps
 */
export function iniciarGatewayTempoReal({ servidor, eventos, auth }) {
  const wss = new WebSocketServer({ server: servidor, path: '/tempo-real' });
  /** @type {Map<import('ws').WebSocket, {usuario: object|null, vivo: boolean}>} */
  const clientes = new Map();

  wss.on('connection', (socket, req) => {
    const token = new URL(req.url, 'http://localhost').searchParams.get('token');
    let usuario = null;
    if (token) {
      try {
        usuario = auth.verificar(token);
      } catch {
        socket.close(4001, 'token inválido');
        return;
      }
    }
    clientes.set(socket, { usuario, vivo: true });
    socket.send(JSON.stringify({ evento: 'conectado', dados: { autenticado: Boolean(usuario) }, em: new Date().toISOString() }));
    socket.on('pong', () => { const c = clientes.get(socket); if (c) c.vivo = true; });
    socket.on('close', () => clientes.delete(socket));
    socket.on('error', (erro) => logger.aviso('Erro em conexão WebSocket', erro.message));
  });

  const cancelar = eventos.assinar(({ evento, dados, destino, em }) => {
    const mensagem = JSON.stringify({ evento, dados, em });
    for (const [socket, cliente] of clientes) {
      if (socket.readyState === socket.OPEN && deveReceber(cliente, destino)) socket.send(mensagem);
    }
  });

  // Heartbeat: derruba conexões mortas a cada 30 s
  const batimento = setInterval(() => {
    for (const [socket, cliente] of clientes) {
      if (!cliente.vivo) { socket.terminate(); clientes.delete(socket); continue; }
      cliente.vivo = false;
      socket.ping();
    }
  }, 30_000);

  return {
    totalConexoes: () => clientes.size,
    encerrar() {
      clearInterval(batimento);
      cancelar();
      wss.close();
    },
  };
}
