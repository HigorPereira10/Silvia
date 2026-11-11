/**
 * @file Middlewares de autenticação (JWT) e autorização por perfil.
 */
import { naoAutenticado, proibido } from '../utils/erros.js';

/**
 * Exige um token válido no cabeçalho `Authorization: Bearer <token>`.
 * Coloca o usuário em `req.usuario`.
 * @param {ReturnType<typeof import('../services/usuarioService.js').criarAuthService>} auth
 * @returns {import('express').RequestHandler}
 */
export function autenticar(auth) {
  return (req, _res, next) => {
    const [tipo, token] = (req.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) return next(naoAutenticado());
    req.usuario = auth.verificar(token);
    return next();
  };
}

/**
 * Permite o acesso apenas aos perfis informados.
 * @param {...('colaborador'|'gestor'|'fornecedor')} perfis
 * @returns {import('express').RequestHandler}
 */
export function exigirPerfil(...perfis) {
  return (req, _res, next) => (perfis.includes(req.usuario?.perfil) ? next() : next(proibido()));
}
