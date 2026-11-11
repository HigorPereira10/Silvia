/**
 * Teste de integração do WebSocket: um servidor HTTP real sobe numa porta
 * livre e dois clientes recebem os eventos que lhes cabem.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import WebSocket from 'ws';
import { criarAmbiente } from '../helpers/ambiente.js';
import { iniciarGatewayTempoReal } from '../../src/realtime/gateway.js';

/** Conecta e devolve o socket com uma fila de mensagens recebidas. */
async function conectar(porta, token) {
  const socket = new WebSocket(`ws://localhost:${porta}/tempo-real${token ? `?token=${token}` : ''}`);
  const recebidas = [];
  socket.on('message', (m) => recebidas.push(JSON.parse(m)));
  await once(socket, 'open');
  return { socket, recebidas };
}

/** Espera até que uma mensagem com o evento chegue. */
async function esperarEvento(cliente, evento, limiteMs = 2000) {
  const inicio = Date.now();
  while (Date.now() - inicio < limiteMs) {
    const achou = cliente.recebidas.find((m) => m.evento === evento);
    if (achou) return achou;
    await new Promise((ok) => setTimeout(ok, 20));
  }
  return null;
}

describe('Canal de tempo real (WebSocket)', () => {
  let amb;
  let servidor;
  let gateway;
  let porta;

  before(async () => {
    amb = criarAmbiente();
    servidor = http.createServer(amb.app);
    gateway = iniciarGatewayTempoReal({ servidor, eventos: amb.eventos, auth: amb.servicos.auth });
    servidor.listen(0);
    await once(servidor, 'listening');
    porta = servidor.address().port;
  });

  after(async () => {
    gateway.encerrar();
    servidor.close();
    amb.encerrar();
  });

  it('entrega eventos ao vivo para usuários logados e respeita o destino', async () => {
    const higor = await amb.entrar('higor');
    const marina = await amb.entrar('marina');
    const clienteHigor = await conectar(porta, higor.token);
    const clientePublico = await conectar(porta, null);
    assert.equal((await esperarEvento(clienteHigor, 'conectado')).dados.autenticado, true);

    // A gestora aprova uma ação pendente da Paula: o Higor vê o feed, o público não.
    const { body: fila } = await marina.get('/acoes?status=pendente');
    await marina.patch(`/acoes/${fila[0].id}/avaliacao`).send({ decisao: 'aprovar' });

    const feed = await esperarEvento(clienteHigor, 'feed.novo');
    assert.ok(feed, 'o colaborador recebeu o novo item do feed');
    assert.equal(await esperarEvento(clientePublico, 'feed.novo', 300), null, 'o público não recebe o feed interno');

    clienteHigor.socket.close();
    clientePublico.socket.close();
  });

  it('notificações chegam apenas ao destinatário', async () => {
    const higor = await amb.entrar('higor');
    const breno = await amb.entrar('breno');
    const marina = await amb.entrar('marina');
    const clienteHigor = await conectar(porta, higor.token);
    const clienteBreno = await conectar(porta, breno.token);

    const { body: nc } = await higor.post('/ncs').send({ tipo: 'Vazamento de água', local: 'Copa do 3º andar' });
    await marina.patch(`/ncs/${nc.id}`).send({ acao: 'aceitar', responsavel: 'Manutenção', acaoCorretiva: 'Trocar o reparo' });

    const aviso = await esperarEvento(clienteHigor, 'notificacao.nova');
    assert.match(aviso.dados.mensagem, /foi aceita/);
    assert.equal(await esperarEvento(clienteBreno, 'notificacao.nova', 300), null);

    clienteHigor.socket.close();
    clienteBreno.socket.close();
  });

  it('recusa token inválido', async () => {
    const socket = new WebSocket(`ws://localhost:${porta}/tempo-real?token=invalido`);
    const [codigo] = await once(socket, 'close');
    assert.equal(codigo, 4001);
  });
});
