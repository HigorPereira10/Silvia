/**
 * @file Serviços de autenticação (JWT) e do usuário logado.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { calcularSolFornecedor } from '../domain/regras.js';
import { naoAutenticado } from '../utils/erros.js';

/** Remove dados sensíveis antes de devolver o usuário. */
const semSenha = ({ senhaHash: _senha, ...usuario }) => usuario;

/**
 * @param {{models: import('../models/index.js').Models, config: import('../config/index.js').Config,
 *   registro: ReturnType<typeof import('./registroService.js').criarRegistroService>}} deps
 */
export function criarAuthService({ models, config, registro }) {
  return {
    /**
     * Confere e-mail e senha e emite um token JWT.
     * @returns {{token: string, usuario: object}}
     */
    login(email, senha) {
      const usuario = models.usuarios.buscarPorEmailComSenha(email.trim().toLowerCase());
      if (!usuario || !bcrypt.compareSync(senha, usuario.senhaHash)) {
        throw naoAutenticado('E-mail ou senha incorretos.');
      }
      const token = jwt.sign({ sub: String(usuario.id), perfil: usuario.perfil }, config.jwt.segredo, {
        expiresIn: config.jwt.expiracao,
      });
      registro.auditar(usuario.nome, 'Entrou no sistema', `perfil ${usuario.perfil}`);
      return { token, usuario: semSenha(usuario) };
    },

    /**
     * Valida o token e devolve o usuário atual do banco.
     * @param {string} token
     */
    verificar(token) {
      try {
        const { sub } = jwt.verify(token, config.jwt.segredo);
        const usuario = models.usuarios.buscarPorId(Number(sub));
        if (!usuario) throw new Error('usuário removido');
        return usuario;
      } catch {
        throw naoAutenticado('Sessão inválida ou expirada. Entre novamente.');
      }
    },

    /** Contas de demonstração exibidas na tela de login. */
    contasDemonstracao() {
      return models.usuarios.listarParaDemonstracao().map((u) => ({
        nome: u.nome,
        email: u.email,
        perfil: u.perfil,
        detalhe: u.setorNome ?? u.fornecedorNome ?? 'Gestão ambiental',
      }));
    },
  };
}

/**
 * @param {{models: import('../models/index.js').Models,
 *   registro: ReturnType<typeof import('./registroService.js').criarRegistroService>,
 *   plantas: ReturnType<typeof import('./plantaService.js').criarPlantaService>,
 *   eventos: ReturnType<typeof import('../realtime/eventos.js').criarBarramentoEventos>}} deps
 */
export function criarUsuarioService({ models, registro, plantas, eventos }) {
  return {
    /** Perfil completo do usuário logado: dados, planta e avisos não lidos. */
    perfil(usuario) {
      const resposta = { usuario, planta: null, naoLidas: models.notificacoes.contarNaoLidas(usuario.id) };
      if (usuario.perfil !== 'gestor') resposta.planta = plantas.doUsuario(usuario.id);
      if (usuario.perfil === 'fornecedor') {
        const requisitos = models.fornecedores.requisitos(usuario.fornecedorId);
        resposta.fornecedor = { ...models.fornecedores.buscar(usuario.fornecedorId), requisitos, sol: calcularSolFornecedor(requisitos) };
      }
      return resposta;
    },

    /** Liga/desliga o modo férias, que pausa o decaimento da planta. */
    definirFerias(usuario, ferias) {
      models.usuarios.atualizarFerias(usuario.id, ferias);
      registro.auditar(usuario.nome, ferias ? 'Ativou férias' : 'Encerrou férias', ferias ? 'Decaimento pausado' : 'Decaimento retomado');
      const planta = plantas.doUsuario(usuario.id);
      eventos.emitir('planta.atualizada', { setorId: usuario.setorId, planta, evoluiu: false }, 'autenticados');
      return { ferias, planta };
    },

    notificacoes: (usuario) => ({
      itens: models.notificacoes.listar(usuario.id),
      naoLidas: models.notificacoes.contarNaoLidas(usuario.id),
    }),

    marcarNotificacoesLidas: (usuario) => ({ marcadas: models.notificacoes.marcarTodasLidas(usuario.id) }),

    feed: (limite) => models.feed.listar(limite),
  };
}
