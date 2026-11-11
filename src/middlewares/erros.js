/**
 * @file Tratamento centralizado de erros e rota não encontrada.
 *
 * Toda falha vira uma resposta JSON no formato:
 * `{ "erro": { "codigo": "...", "mensagem": "...", "detalhes": ... } }`
 */
import multer from 'multer';
import { ErroAplicacao, naoEncontrado } from '../utils/erros.js';
import { logger } from '../utils/logger.js';

/** 404 para rotas da API que não existem. */
export function rotaNaoEncontrada(req, _res, next) {
  next(naoEncontrado(`Rota ${req.method} ${req.originalUrl} não existe.`));
}

/** @type {import('express').ErrorRequestHandler} */
export function tratarErros(erro, req, res, _next) {
  let falha = erro;

  if (erro instanceof multer.MulterError) {
    falha = erro.code === 'LIMIT_FILE_SIZE'
      ? new ErroAplicacao(413, 'arquivo_grande', 'O arquivo passou do limite de 8 MB.')
      : new ErroAplicacao(422, 'upload_invalido', 'Envie um único arquivo no campo "evidencia".');
  } else if (erro?.type === 'entity.parse.failed') {
    falha = new ErroAplicacao(400, 'json_invalido', 'O corpo da requisição não é um JSON válido.');
  }

  if (!(falha instanceof ErroAplicacao)) {
    logger.erro(`Erro inesperado em ${req.method} ${req.originalUrl}`, erro);
    falha = new ErroAplicacao(500, 'erro_interno', 'Ocorreu um erro inesperado. Tente de novo.');
  }

  res.status(falha.status).json({
    erro: { codigo: falha.codigo, mensagem: falha.message, ...(falha.detalhes ? { detalhes: falha.detalhes } : {}) },
  });
}
