/**
 * @file Montagem da aplicação Express.
 *
 * `criarApp` recebe todas as dependências por parâmetro (banco, config,
 * integrações). O servidor real e os testes usam a mesma função, mudando
 * apenas o que é injetado.
 */
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { criarRotas } from './routes/index.js';
import { rotaNaoEncontrada, tratarErros } from './middlewares/erros.js';
import { criarServicos } from './services/index.js';
import { criarBarramentoEventos } from './realtime/eventos.js';

const PASTA_SRC = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {{db: import('node:sqlite').DatabaseSync, config: import('./config/index.js').Config,
 *   viacep: object, aleatorio?: () => number}} deps
 * @returns {{app: import('express').Express, servicos: import('./services/index.js').Servicos, eventos: ReturnType<typeof criarBarramentoEventos>}}
 */
export function criarApp({ db, config, viacep, aleatorio }) {
  const eventos = criarBarramentoEventos();
  const servicos = criarServicos({ db, config, eventos, viacep, aleatorio });
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
        },
      },
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  // Documentação interativa da API (Swagger UI) gerada a partir do OpenAPI
  const especificacao = YAML.parse(readFileSync(path.join(PASTA_SRC, 'docs', 'openapi.yaml'), 'utf8'));
  app.get('/api/openapi.json', (_req, res) => res.json(especificacao));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(especificacao, { customSiteTitle: 'Silvia · API' }));

  // API REST
  app.use('/api/v1', criarRotas(servicos, config));
  app.use('/api', rotaNaoEncontrada);

  // Front-end (View do MVC)
  app.use(express.static(path.join(config.raiz, 'public')));

  app.use(tratarErros);
  return { app, servicos, eventos };
}
