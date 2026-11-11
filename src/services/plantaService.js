/**
 * @file Serviço das plantas: o motor de gamificação.
 *
 * Toda recompensa (água, adubo, crescimento, pontos do setor) passa por
 * `recompensar`, garantindo que evolução de estágio, feed, notificações e
 * eventos de tempo real aconteçam sempre do mesmo jeito.
 */
import { ESTAGIOS } from '../domain/constantes.js';
import {
  aplicarCrescimento, atingimentoMetas, calcularSol, calcularSolFornecedor, limitar, resumirPlanta,
} from '../domain/regras.js';
import { naoEncontrado } from '../utils/erros.js';

/**
 * @param {{models: import('../models/index.js').Models,
 *   registro: ReturnType<typeof import('./registroService.js').criarRegistroService>,
 *   plantios: ReturnType<typeof import('./plantioService.js').criarPlantioService>,
 *   eventos: ReturnType<typeof import('../realtime/eventos.js').criarBarramentoEventos>}} deps
 */
export function criarPlantaService({ models, registro, plantios, eventos }) {
  /** Sol de um setor a partir da medição mais recente. */
  function solDoSetor(setorId) {
    const setor = models.setores.buscar(setorId);
    return calcularSol(atingimentoMetas(setor, models.setores.ultimaMedicao(setorId)));
  }

  /** Sol do dono da planta: metas do setor (colaborador) ou requisitos (fornecedor). */
  function solDoDono(planta) {
    if (planta.donoPerfil === 'fornecedor') return calcularSolFornecedor(models.fornecedores.requisitos(planta.fornecedorId));
    return solDoSetor(planta.setorId);
  }

  /** Formato público da planta usado pela API. */
  function apresentar(planta, sol = solDoDono(planta)) {
    return {
      id: planta.id,
      usuarioId: planta.usuarioId,
      dono: planta.donoNome,
      especie: planta.especie,
      semente: planta.semente,
      ...resumirPlanta(planta, sol),
    };
  }

  const servico = {
    solDoSetor,
    apresentar,

    /** Planta do usuário logado. */
    doUsuario(usuarioId) {
      const planta = models.plantas.buscarPorUsuario(usuarioId);
      if (!planta) throw naoEncontrado('Este usuário não tem planta.');
      return apresentar(planta);
    },

    /** Canteiro de um setor: as plantas de todos os colaboradores dele. */
    canteiroDoSetor(setorId) {
      const sol = solDoSetor(setorId);
      return models.plantas.listarPorSetor(setorId).map((p) => apresentar(p, sol));
    },

    /** Canteiro dos fornecedores. */
    canteiroFornecedores() {
      return models.plantas.listarDeFornecedores().map((p) => apresentar(p));
    },

    /**
     * Aplica uma recompensa à planta de um usuário.
     * @param {number} usuarioId
     * @param {{agua?: number, adubo?: number, xp?: number, pontos?: number, removerGalho?: boolean}} r
     * @returns {ReturnType<typeof apresentar>}
     */
    recompensar(usuarioId, { agua = 0, adubo = 0, xp = 0, pontos = 0, removerGalho = false }) {
      const planta = models.plantas.buscarPorUsuario(usuarioId);
      if (!planta) throw naoEncontrado('Este usuário não tem planta.');
      const crescimento = aplicarCrescimento(planta, xp);
      const novoEstado = {
        estagio: crescimento.estagio,
        xp: crescimento.xp,
        agua: limitar(planta.agua + agua),
        adubo: limitar(planta.adubo + adubo),
        galhoSeco: removerGalho ? false : planta.galhoSeco,
      };
      models.plantas.salvarEstado(usuarioId, novoEstado);

      if (crescimento.evoluiu) {
        const nome = ESTAGIOS[crescimento.estagio];
        registro.feed(planta.donoNome, `evoluiu a muda para ${nome}.`, 'marco');
        registro.notificar(usuarioId, `Sua muda evoluiu para ${nome}!`);
      }
      if (pontos > 0 && planta.donoPerfil === 'colaborador') plantios.adicionarPontos(planta.setorId, pontos);

      const visao = apresentar({ ...planta, ...novoEstado });
      eventos.emitir('planta.atualizada', { setorId: planta.setorId, planta: visao, evoluiu: crescimento.evoluiu }, 'autenticados');
      return visao;
    },
  };
  return servico;
}
