/**
 * @file Middleware que valida body, query ou params com um esquema zod.
 *
 * O resultado validado fica em `req.validado.body`, `req.validado.query` e
 * `req.validado.params` (o Express 5 não permite sobrescrever `req.query`).
 */
import { entidadeInvalida } from '../utils/erros.js';

/**
 * @param {import('zod').ZodType} esquema
 * @param {'body'|'query'|'params'} [origem]
 * @returns {import('express').RequestHandler}
 */
export function validar(esquema, origem = 'body') {
  return (req, _res, next) => {
    const resultado = esquema.safeParse(req[origem] ?? {});
    if (!resultado.success) {
      const problemas = resultado.error.issues.map((i) => ({ campo: i.path.join('.') || origem, mensagem: i.message }));
      return next(entidadeInvalida('dados_invalidos', problemas[0].mensagem, problemas));
    }
    req.validado = { ...req.validado, [origem]: resultado.data };
    return next();
  };
}
