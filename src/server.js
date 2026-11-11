/**
 * @file Ponto de entrada do servidor.
 *
 * Sobe, na mesma porta:
 *  - a API REST (/api/v1) e sua documentação Swagger (/api/docs);
 *  - o canal WebSocket de tempo real (/tempo-real);
 *  - o front-end (/).
 */
import http from 'node:http';
import { carregarConfig } from './config/index.js';
import { abrirBanco } from './database/conexao.js';
import { migrar } from './database/migrar.js';
import { popularSeVazio } from './database/seed.js';
import { criarApp } from './app.js';
import { criarClienteViaCep } from './integrations/viacep.js';
import { iniciarGatewayTempoReal } from './realtime/gateway.js';
import { iniciarAgendador } from './jobs/agendador.js';
import { logger } from './utils/logger.js';

const config = carregarConfig();
const db = abrirBanco(config.banco.arquivo);
migrar(db);
popularSeVazio(db);

const { app, servicos, eventos } = criarApp({
  db,
  config,
  viacep: criarClienteViaCep(config.viacep),
});

const servidor = http.createServer(app);
const tempoReal = iniciarGatewayTempoReal({ servidor, eventos, auth: servicos.auth });
const agendador = iniciarAgendador({ hora: config.cicloDiarioHora, executar: () => servicos.ciclo.executar('Agendador') });

servidor.listen(config.porta, () => {
  logger.info(`Silvia rodando em http://localhost:${config.porta}`);
  logger.info(`Documentação da API: http://localhost:${config.porta}/api/docs`);
});

/** Encerramento limpo (Ctrl+C). */
function encerrar() {
  logger.info('Encerrando o servidor...');
  agendador.parar();
  tempoReal.encerrar();
  servidor.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
