/**
 * Testes de integração: ações ambientais ("regar") e validação.
 */
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { criarAmbiente, PNG_1X1 } from '../helpers/ambiente.js';

const CATEGORIA = 'Vim de carona, bike ou transporte público';

describe('Ações ambientais com evidência', () => {
  let amb;
  beforeEach(() => { amb = criarAmbiente(); });
  afterEach(() => amb.encerrar());

  /** Registra uma ação do Higor com foto. */
  async function registrarDoHigor(higor) {
    return higor.post('/acoes').field('categoria', CATEGORIA).field('descricao', 'Fui de bike').attach('evidencia', PNG_1X1, 'bike.png');
  }

  it('recusa ação sem evidência (422)', async () => {
    const higor = await amb.entrar('higor');
    const r = await higor.post('/acoes').field('categoria', CATEGORIA);
    assert.equal(r.status, 422);
    assert.equal(r.body.erro.codigo, 'evidencia_obrigatoria');
  });

  it('recusa categoria fora da lista (422)', async () => {
    const higor = await amb.entrar('higor');
    const r = await higor.post('/acoes').field('categoria', 'Inventei').attach('evidencia', PNG_1X1, 'x.png');
    assert.equal(r.status, 422);
    assert.equal(r.body.erro.codigo, 'categoria_invalida');
  });

  it('recusa formato de arquivo não aceito', async () => {
    const higor = await amb.entrar('higor');
    const r = await higor.post('/acoes').field('categoria', CATEGORIA).attach('evidencia', Buffer.from('oi'), { filename: 'nota.txt', contentType: 'text/plain' });
    assert.equal(r.status, 422);
    assert.equal(r.body.erro.codigo, 'formato_invalido');
  });

  it('registra a ação pendente e não muda a planta antes da validação', async () => {
    const higor = await amb.entrar('higor');
    const r = await registrarDoHigor(higor);
    assert.equal(r.status, 201);
    assert.equal(r.body.status, 'pendente');
    assert.equal(r.body.evidenciaArquivo, undefined, 'o nome interno do arquivo não vaza');
    assert.equal((await higor.get('/eu')).body.planta.agua, 40);
  });

  it('aprovação rega a planta, dá crescimento e pontos ao setor', async () => {
    const higor = await amb.entrar('higor');
    const marina = await amb.entrar('marina');
    const { body: acao } = await registrarDoHigor(higor);
    const r = await marina.patch(`/acoes/${acao.id}/avaliacao`).send({ decisao: 'aprovar' });
    assert.equal(r.status, 200);
    assert.equal(r.body.acao.status, 'aprovada');
    assert.equal(r.body.planta.agua, 70);
    assert.equal(r.body.planta.xp, 78);
    assert.equal((await higor.get('/setores/fin')).body.pontos, 944);
  });

  it('não permite avaliar duas vezes (409)', async () => {
    const higor = await amb.entrar('higor');
    const marina = await amb.entrar('marina');
    const { body: acao } = await registrarDoHigor(higor);
    await marina.patch(`/acoes/${acao.id}/avaliacao`).send({ decisao: 'aprovar' });
    const r = await marina.patch(`/acoes/${acao.id}/avaliacao`).send({ decisao: 'aprovar' });
    assert.equal(r.status, 409);
  });

  it('recusa exige motivo da lista e notifica o autor', async () => {
    const higor = await amb.entrar('higor');
    const marina = await amb.entrar('marina');
    const { body: acao } = await registrarDoHigor(higor);
    assert.equal((await marina.patch(`/acoes/${acao.id}/avaliacao`).send({ decisao: 'recusar' })).status, 422);
    const r = await marina.patch(`/acoes/${acao.id}/avaliacao`).send({ decisao: 'recusar', motivo: 'Evidência ilegível' });
    assert.equal(r.body.acao.status, 'recusada');
    const { body } = await higor.get('/eu/notificacoes');
    assert.match(body.itens[0].mensagem, /recusada: Evidência ilegível/);
  });

  it('colaborador não pode validar evidências (403)', async () => {
    const higor = await amb.entrar('higor');
    const breno = await amb.entrar('breno');
    const { body: acao } = await registrarDoHigor(higor);
    assert.equal((await breno.patch(`/acoes/${acao.id}/avaliacao`).send({ decisao: 'aprovar' })).status, 403);
    assert.equal((await breno.get('/acoes')).status, 403);
  });

  it('a evidência pode ser baixada pelo autor e pela gestora, mas não por colegas', async () => {
    const higor = await amb.entrar('higor');
    const marina = await amb.entrar('marina');
    const breno = await amb.entrar('breno');
    const { body: acao } = await registrarDoHigor(higor);
    const arquivo = await marina.get(`/acoes/${acao.id}/evidencia`);
    assert.equal(arquivo.status, 200);
    assert.equal(arquivo.headers['content-type'], 'image/png');
    assert.equal((await higor.get(`/acoes/${acao.id}/evidencia`)).status, 200);
    assert.equal((await breno.get(`/acoes/${acao.id}/evidencia`)).status, 403);
  });

  it('a fila da gestora lista as pendentes, mais antigas primeiro', async () => {
    const marina = await amb.entrar('marina');
    const r = await marina.get('/acoes?status=pendente');
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 4);
    assert.equal(r.body[0].autorNome, 'Paula');
  });

  it('fornecedor comprova um requisito e ele vira atendido após aprovação', async () => {
    const embalasul = await amb.entrar('embalasul');
    const marina = await amb.entrar('marina');
    const { body: cat } = await embalasul.get('/acoes/categorias');
    const requisito = cat.requisitosPendentes[0];
    const { body: acao } = await embalasul.post('/acoes').field('requisitoId', String(requisito.id)).attach('evidencia', PNG_1X1, 'inventario.png');
    assert.equal(acao.categoria, `Comprovar: ${requisito.nome}`);
    const r = await marina.patch(`/acoes/${acao.id}/avaliacao`).send({ decisao: 'aprovar' });
    assert.equal(r.body.planta.sol, 100, 'todos os requisitos atendidos: sol 100%');
    assert.equal(r.body.acao.pontos, 0, 'fornecedor não soma pontos de setor');
  });
});
