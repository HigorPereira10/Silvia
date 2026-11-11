/**
 * Testes unitários da integração com o ViaCEP, do gateway e do agendador.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { criarClienteViaCep, formatarEndereco, normalizarCep } from '../../src/integrations/viacep.js';
import { deveReceber } from '../../src/realtime/gateway.js';
import { msAteProximaExecucao } from '../../src/jobs/agendador.js';

const resposta = (status, corpo) => ({ status, ok: status < 400, json: async () => corpo });

describe('ViaCEP', () => {
  it('normaliza o CEP e rejeita tamanhos errados', () => {
    assert.equal(normalizarCep('01310-100'), '01310100');
    assert.equal(normalizarCep('123'), null);
    assert.equal(normalizarCep(undefined), null);
  });

  it('devolve o endereço quando o CEP existe', async () => {
    const cliente = criarClienteViaCep({
      url: 'https://exemplo', timeoutMs: 100,
      fetch: async (url) => {
        assert.equal(url, 'https://exemplo/01310100/json/');
        return resposta(200, { cep: '01310-100', logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' });
      },
    });
    const r = await cliente.consultar('01310100');
    assert.equal(r.situacao, 'encontrado');
    assert.equal(formatarEndereco(r.endereco), 'Avenida Paulista, Bela Vista, São Paulo/SP, 01310-100');
  });

  it('identifica CEP inexistente ({ erro: true } ou HTTP 400)', async () => {
    const naoExiste = criarClienteViaCep({ url: 'x', timeoutMs: 100, fetch: async () => resposta(200, { erro: true }) });
    assert.equal((await naoExiste.consultar('00000000')).situacao, 'nao_encontrado');
    const invalido = criarClienteViaCep({ url: 'x', timeoutMs: 100, fetch: async () => resposta(400, {}) });
    assert.equal((await invalido.consultar('00000000')).situacao, 'nao_encontrado');
  });

  it('marca como indisponível quando a rede falha', async () => {
    const cliente = criarClienteViaCep({ url: 'x', timeoutMs: 100, fetch: async () => { throw new Error('sem rede'); } });
    const r = await cliente.consultar('01310100');
    assert.equal(r.situacao, 'indisponivel');
    assert.equal(r.detalhe, 'sem rede');
  });
});

describe('Gateway de tempo real', () => {
  const colaborador = { usuario: { id: 2, perfil: 'colaborador' } };
  const anonimo = { usuario: null };

  it('entrega eventos conforme o destino', () => {
    assert.equal(deveReceber(anonimo, 'todos'), true);
    assert.equal(deveReceber(anonimo, 'autenticados'), false);
    assert.equal(deveReceber(colaborador, 'autenticados'), true);
    assert.equal(deveReceber(colaborador, { perfil: 'gestor' }), false);
    assert.equal(deveReceber(colaborador, { usuarioId: 2 }), true);
    assert.equal(deveReceber(colaborador, { usuarioId: 3 }), false);
  });
});

describe('Agendador do ciclo diário', () => {
  it('calcula o tempo até a próxima execução', () => {
    const agora = new Date(2026, 10, 10, 22, 0, 0);
    assert.equal(msAteProximaExecucao(0, agora), 2 * 3600 * 1000);
    assert.equal(msAteProximaExecucao(23, agora), 3600 * 1000);
  });
});
