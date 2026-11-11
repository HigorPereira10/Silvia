/**
 * Testes de integração: autenticação, rotas públicas e tratamento de erros.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { criarAmbiente } from '../helpers/ambiente.js';

describe('Autenticação e rotas públicas', () => {
  let amb;
  before(() => { amb = criarAmbiente(); });
  after(() => amb.encerrar());

  it('GET /saude responde sem login', async () => {
    const r = await amb.http.get('/api/v1/saude');
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'ok');
  });

  it('login com senha certa devolve token e usuário sem o hash da senha', async () => {
    const r = await amb.http.post('/api/v1/auth/login').send({ email: 'higor@silvia.local', senha: 'silvia123' });
    assert.equal(r.status, 200);
    assert.ok(r.body.token);
    assert.equal(r.body.usuario.nome, 'Higor');
    assert.equal(r.body.usuario.senhaHash, undefined);
  });

  it('login com senha errada devolve 401 com mensagem clara', async () => {
    const r = await amb.http.post('/api/v1/auth/login').send({ email: 'higor@silvia.local', senha: 'errada' });
    assert.equal(r.status, 401);
    assert.equal(r.body.erro.mensagem, 'E-mail ou senha incorretos.');
  });

  it('valida o formato do e-mail (422)', async () => {
    const r = await amb.http.post('/api/v1/auth/login').send({ email: 'nao-e-email', senha: 'x' });
    assert.equal(r.status, 422);
    assert.equal(r.body.erro.codigo, 'dados_invalidos');
  });

  it('JSON malformado devolve 400', async () => {
    const r = await amb.http.post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{quebrado');
    assert.equal(r.status, 400);
    assert.equal(r.body.erro.codigo, 'json_invalido');
  });

  it('rotas protegidas exigem token', async () => {
    assert.equal((await amb.http.get('/api/v1/eu')).status, 401);
    assert.equal((await amb.http.get('/api/v1/eu').set('Authorization', 'Bearer token-falso')).status, 401);
  });

  it('GET /eu devolve usuário, planta e avisos', async () => {
    const higor = await amb.entrar('higor');
    const r = await higor.get('/eu');
    assert.equal(r.status, 200);
    assert.equal(r.body.planta.saude, 51);
    assert.equal(r.body.planta.galhoSeco, true);
    assert.equal(r.body.naoLidas, 2);
  });

  it('a gestora não tem planta', async () => {
    const marina = await amb.entrar('marina');
    const r = await marina.get('/eu');
    assert.equal(r.body.usuario.perfil, 'gestor');
    assert.equal(r.body.planta, null);
  });

  it('rota inexistente: 401 sem login (não revela rotas) e 404 em JSON com login', async () => {
    assert.equal((await amb.http.get('/api/v1/nao-existe')).status, 401);
    const higor = await amb.entrar('higor');
    const r = await higor.get('/nao-existe');
    assert.equal(r.status, 404);
    assert.equal(r.body.erro.codigo, 'nao_encontrado');
  });

  it('a documentação OpenAPI está publicada', async () => {
    const r = await amb.http.get('/api/openapi.json');
    assert.equal(r.status, 200);
    assert.equal(r.body.openapi, '3.0.3');
  });

  it('a página pública da floresta não exige login', async () => {
    const r = await amb.http.get('/api/v1/publico/floresta');
    assert.equal(r.status, 200);
    assert.equal(r.body.arvores, 37);
  });
});
