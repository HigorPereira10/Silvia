/**
 * Testes de integração: não conformidades, treinamentos, medições, plantios e gestão.
 */
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { criarAmbiente } from '../helpers/ambiente.js';

describe('Não conformidades ("podar")', () => {
  let amb;
  beforeEach(() => { amb = criarAmbiente(); });
  afterEach(() => amb.encerrar());

  it('abrir uma NC poda o galho seco e gera código sequencial', async () => {
    const higor = await amb.entrar('higor');
    const r = await higor.post('/ncs').send({ tipo: 'Vazamento de água', local: 'Copa do 3º andar' });
    assert.equal(r.status, 201);
    assert.equal(r.body.codigo, 'NC-042');
    assert.equal(r.body.status, 'aberta');
    assert.equal((await higor.get('/eu')).body.planta.galhoSeco, false);
  });

  it('valida o local (422)', async () => {
    const higor = await amb.entrar('higor');
    const r = await higor.post('/ncs').send({ tipo: 'Vazamento de água', local: 'x' });
    assert.equal(r.status, 422);
  });

  it('segue o fluxo aberta → em ação → fechada, exigindo verificação de eficácia', async () => {
    const higor = await amb.entrar('higor');
    const marina = await amb.entrar('marina');
    const { body: nc } = await higor.post('/ncs').send({ tipo: 'Vazamento de água', local: 'Copa do 3º andar' });

    const aceita = await marina.patch(`/ncs/${nc.id}`).send({ acao: 'aceitar', responsavel: 'Manutenção', acaoCorretiva: 'Trocar o reparo da torneira' });
    assert.equal(aceita.body.status, 'em_acao');
    assert.equal((await higor.get('/eu')).body.planta.xp, 74, 'quem reportou ganha +10 de crescimento');

    const semVerificar = await marina.patch(`/ncs/${nc.id}`).send({ acao: 'fechar', eficaciaVerificada: false });
    assert.equal(semVerificar.status, 422);

    const fechada = await marina.patch(`/ncs/${nc.id}`).send({ acao: 'fechar', eficaciaVerificada: true });
    assert.equal(fechada.body.status, 'fechada');
    assert.ok(fechada.body.fechadaEm);
  });

  it('bloqueia transições inválidas (409)', async () => {
    const higor = await amb.entrar('higor');
    const marina = await amb.entrar('marina');
    const { body: nc } = await higor.post('/ncs').send({ tipo: 'Vazamento de água', local: 'Copa do 3º andar' });
    const r = await marina.patch(`/ncs/${nc.id}`).send({ acao: 'fechar', eficaciaVerificada: true });
    assert.equal(r.status, 409);
  });

  it('colaborador vê só as NCs que reportou', async () => {
    const higor = await amb.entrar('higor');
    const marina = await amb.entrar('marina');
    await higor.post('/ncs').send({ tipo: 'Vazamento de água', local: 'Copa do 3º andar' });
    assert.equal((await higor.get('/ncs')).body.length, 1);
    assert.equal((await marina.get('/ncs')).body.length, 9);
  });
});

describe('Treinamentos ("adubar")', () => {
  let amb;
  beforeEach(() => { amb = criarAmbiente(); });
  afterEach(() => amb.encerrar());

  it('não revela o gabarito ao iniciar a tentativa', async () => {
    const higor = await amb.entrar('higor');
    const r = await higor.post('/treinamentos/m2/tentativas');
    assert.equal(r.status, 201);
    assert.equal(r.body.perguntas.length, 3);
    assert.equal(r.body.perguntas[0].correta, undefined);
  });

  it('corrige pergunta por pergunta, em ordem, e pontua só na primeira vez', async () => {
    const higor = await amb.entrar('higor');
    const { body: t } = await higor.post('/treinamentos/m2/tentativas');
    const fora = await higor.post(`/tentativas/${t.tentativaId}/respostas`).send({ pergunta: 1, opcao: 0 });
    assert.equal(fora.status, 409, 'precisa responder a pergunta 1 primeiro');

    const r1 = await higor.post(`/tentativas/${t.tentativaId}/respostas`).send({ pergunta: 0, opcao: 0 });
    assert.equal(r1.body.correta, true);
    await higor.post(`/tentativas/${t.tentativaId}/respostas`).send({ pergunta: 1, opcao: 1 });
    const r3 = await higor.post(`/tentativas/${t.tentativaId}/respostas`).send({ pergunta: 2, opcao: 0 });
    assert.equal(r3.body.correta, false);
    assert.equal(r3.body.opcaoCorreta, 2);
    assert.equal(r3.body.finalizada, true);
    assert.equal(r3.body.acertos, 2);
    assert.deepEqual(r3.body.recompensa, { adubo: 24, xp: 12, pontos: 8 });
    assert.equal((await higor.get('/eu')).body.planta.adubo, 79);

    const { body: t2 } = await higor.post('/treinamentos/m2/tentativas');
    assert.equal(t2.valePontos, false);
    for (const [i, opcao] of [0, 1, 2].entries()) await higor.post(`/tentativas/${t2.tentativaId}/respostas`).send({ pergunta: i, opcao });
    assert.equal((await higor.get('/eu')).body.planta.adubo, 79, 'refazer não dá adubo de novo');
  });

  it('gestora e fornecedores não fazem treinamentos (403)', async () => {
    const marina = await amb.entrar('marina');
    assert.equal((await marina.post('/treinamentos/m1/tentativas')).status, 403);
  });
});

describe('Metas, plantios e gestão', () => {
  let amb;
  beforeEach(() => { amb = criarAmbiente(); });
  afterEach(() => amb.encerrar());

  it('a medição do mês muda o sol do canteiro e a saúde das plantas', async () => {
    const marina = await amb.entrar('marina');
    const higor = await amb.entrar('higor');
    const antes = (await higor.get('/eu')).body.planta.saude;
    const r = await marina.post('/setores/fin/medicoes').send({ mes: '2026-11', energiaKwh: 3700, papelFolhas: 7000, reciclavelPct: 75 });
    assert.equal(r.status, 201);
    assert.equal(r.body.sol, 100);
    assert.ok((await higor.get('/eu')).body.planta.saude > antes);
  });

  it('valida a medição (422) e restringe à gestora (403)', async () => {
    const marina = await amb.entrar('marina');
    const higor = await amb.entrar('higor');
    const invalida = await marina.post('/setores/fin/medicoes').send({ mes: '2026-13', energiaKwh: -1, papelFolhas: 0, reciclavelPct: 120 });
    assert.equal(invalida.status, 422);
    assert.equal((await higor.post('/setores/fin/medicoes').send({ mes: '2026-11', energiaKwh: 1, papelFolhas: 1, reciclavelPct: 1 })).status, 403);
  });

  it('1.000 pontos no setor agendam um plantio, registrado com consulta ao ViaCEP', async () => {
    amb.servicos.plantios.adicionarPontos('fin', 70);
    const marina = await amb.entrar('marina');
    const { body: agendados } = await marina.get('/plantios?status=agendado');
    assert.equal(agendados.length, 1);
    assert.equal(agendados[0].setorId, 'fin');

    assert.equal((await marina.patch(`/plantios/${agendados[0].id}`).send({ local: 'Escola municipal parceira', cep: '123' })).status, 422);
    assert.equal((await marina.patch(`/plantios/${agendados[0].id}`).send({ local: 'Escola municipal parceira', cep: '00000-000' })).status, 422);

    const r = await marina.patch(`/plantios/${agendados[0].id}`).send({ local: 'Escola municipal parceira', cep: '01310-100' });
    assert.equal(r.status, 200);
    assert.equal(r.body.enderecoVerificado, true);
    assert.match(r.body.plantio.endereco, /Avenida Paulista/);
    assert.equal((await amb.http.get('/api/v1/publico/floresta')).body.arvores, 38);
    assert.equal((await marina.patch(`/plantios/${agendados[0].id}`).send({ local: 'Escola municipal parceira', cep: '01310-100' })).status, 409);
  });

  it('se o ViaCEP estiver fora do ar, registra sem verificar o endereço', async () => {
    amb.servicos.plantios.adicionarPontos('fin', 70);
    const marina = await amb.entrar('marina');
    const { body: [plantio] } = await marina.get('/plantios?status=agendado');
    const r = await marina.patch(`/plantios/${plantio.id}`).send({ local: 'Escola municipal parceira', cep: '99999-999' });
    assert.equal(r.status, 200);
    assert.equal(r.body.enderecoVerificado, false);
    assert.ok(r.body.avisoCep);
  });

  it('o painel traz os indicadores ISO 14031', async () => {
    const marina = await amb.entrar('marina');
    const { body } = await marina.get('/indicadores/painel');
    assert.equal(body.kpis.arvores, 37);
    assert.equal(body.kpis.colaboradores, 26);
    assert.equal(body.alertas.evidenciasPendentes, 4);
    assert.equal(body.energiaPorMes.length, 6);
    assert.equal(body.ranking[0].nome, 'Financeiro');
  });

  it('o relatório 9.3 sai em JSON e em HTML, e a auditoria em CSV', async () => {
    const marina = await amb.entrar('marina');
    const json = await marina.get('/relatorios/analise-critica');
    assert.ok(json.body.oportunidadesDeMelhoria.length > 0);
    const html = await marina.get('/relatorios/analise-critica?formato=html');
    assert.match(html.text, /Análise crítica pela direção/);
    const csv = await marina.get('/auditoria?formato=csv');
    assert.match(csv.headers['content-type'], /text\/csv/);
    assert.match(csv.text, /data;autor;acao;detalhe/);
  });

  it('o ciclo diário reduz água e adubo, mas respeita as férias', async () => {
    const higor = await amb.entrar('higor');
    const breno = await amb.entrar('breno');
    const marina = await amb.entrar('marina');
    await breno.patch('/eu/ferias').send({ ferias: true });
    const r = await marina.post('/admin/ciclo-diario');
    assert.equal(r.status, 200);
    assert.equal(r.body.plantas, 29);
    const ph = (await higor.get('/eu')).body.planta;
    assert.equal(ph.agua, 28);
    assert.equal(ph.adubo, 50);
    const pb = (await breno.get('/eu')).body.planta;
    assert.equal(pb.agua, 80, 'férias pausam o decaimento');
  });
});
