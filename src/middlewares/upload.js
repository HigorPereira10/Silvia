/**
 * @file Upload de evidências (multipart/form-data) com a biblioteca multer.
 *
 * Aceita imagens e PDF até o limite configurado. O arquivo é salvo com um nome
 * aleatório para evitar colisões e caminhos maliciosos.
 */
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { entidadeInvalida } from '../utils/erros.js';

const EXTENSOES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'application/pdf': '.pdf' };

/**
 * @param {{pasta: string, tamanhoMaximoBytes: number}} opcoes
 * @returns {import('express').RequestHandler} middleware para o campo "evidencia"
 */
export function criarUploadEvidencia({ pasta, tamanhoMaximoBytes }) {
  mkdirSync(pasta, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: pasta,
      filename: (_req, arquivo, cb) => cb(null, `${randomUUID()}${EXTENSOES[arquivo.mimetype] ?? path.extname(arquivo.originalname)}`),
    }),
    limits: { fileSize: tamanhoMaximoBytes, files: 1 },
    fileFilter: (_req, arquivo, cb) => {
      if (EXTENSOES[arquivo.mimetype]) return cb(null, true);
      return cb(entidadeInvalida('formato_invalido', 'Formato não aceito. Envie uma imagem (JPG, PNG, WebP, GIF) ou um PDF.', { campo: 'evidencia' }));
    },
  });
  return upload.single('evidencia');
}
