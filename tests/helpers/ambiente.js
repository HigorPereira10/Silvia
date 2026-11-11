/**
 * @file Ambiente de teste: banco em memória já populado e ViaCEP falso.
 *
 * Cada teste cria seu próprio ambiente isolado, então a ordem dos testes não
 * importa e nada é gravado em disco (exceto uploads, numa pasta temporária).
 */
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { carregarConfig } from '../../src/config/index.js';
import { abrirBanco } from '../../src/database/conexao.js';
import { migrar } from '../../src/database/migrar.js';
import { popular, SENHA_DEMO } from '../../src/database/seed.js';
import { criarApp } from '../../src/app.js';

process.env.NODE_ENV = 'test';

/** ViaCEP falso: responde conforme o CEP pedido. */
export function viacepFalso() {
  return {
    async consultar(cep) {
      if (cep === '00000000') return { situacao: 'nao_encontrado' };
      if (cep === '99999999') return { situacao: 'indisponivel', detalhe: 'simulado' };
      return { situacao: 'encontrado', endereco: { cep: '01310-100', logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' } };
    },
  };
}

/**
 * Cria um ambiente completo.
 * @param {{viacep?: object, aleatorio?: () => number}} [opcoes]
 */
export function criarAmbiente(opcoes = {}) {
  const pastaUploads = mkdtempSync(path.join(os.tmpdir(), 'silvia-uploads-'));
  const config = carregarConfig({ banco: { arquivo: ':memory:' }, uploads: { pasta: pastaUploads }, jwt: { segredo: 'segredo-de-teste' } });
  const db = abrirBanco(':memory:');
  migrar(db);
  const ids = popular(db, { custoHash: 4 });
  const { app, servicos, eventos } = criarApp({
    db, config, viacep: opcoes.viacep ?? viacepFalso(), aleatorio: opcoes.aleatorio ?? (() => 0.99),
  });
  const http = request(app);

  /** Faz login e devolve um agente com o token já configurado. */
  async function entrar(usuario) {
    const resposta = await http.post('/api/v1/auth/login').send({ email: `${usuario}@silvia.local`, senha: SENHA_DEMO });
    if (resposta.status !== 200) throw new Error(`Login de ${usuario} falhou: ${resposta.status}`);
    const token = resposta.body.token;
    const comToken = (req) => req.set('Authorization', `Bearer ${token}`);
    return {
      token,
      usuario: resposta.body.usuario,
      get: (url) => comToken(http.get(`/api/v1${url}`)),
      post: (url) => comToken(http.post(`/api/v1${url}`)),
      patch: (url) => comToken(http.patch(`/api/v1${url}`)),
    };
  }

  return {
    app, db, ids, http, servicos, eventos, config, entrar,
    encerrar() {
      db.close();
      rmSync(pastaUploads, { recursive: true, force: true });
    },
  };
}

/** Imagem PNG mínima (1x1) para testar uploads. */
export const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
