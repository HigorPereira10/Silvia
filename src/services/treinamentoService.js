/**
 * @file Serviço de treinamentos ("adubar"), cláusulas 7.2 e 7.3.
 *
 * O colaborador inicia uma tentativa e responde uma pergunta por vez. A
 * resposta correta só é revelada depois que ele responde, o que impede
 * "colar". Pontos e adubo contam apenas na primeira conclusão do módulo.
 */
import { REGRAS } from '../domain/constantes.js';
import { transacao } from '../database/conexao.js';
import { conflito, entidadeInvalida, naoEncontrado, proibido } from '../utils/erros.js';

/**
 * @param {{db: import('node:sqlite').DatabaseSync, models: import('../models/index.js').Models,
 *   registro: ReturnType<typeof import('./registroService.js').criarRegistroService>,
 *   plantas: ReturnType<typeof import('./plantaService.js').criarPlantaService>}} deps
 */
export function criarTreinamentoService({ db, models, registro, plantas }) {
  const exigirColaborador = (usuario) => {
    if (usuario.perfil !== 'colaborador') throw proibido('Os treinamentos são para colaboradores.');
  };

  return {
    /** Módulos com o status do usuário. */
    listar(usuario) {
      const concluidos = models.treinamentos.conclusoesDoUsuario(usuario.id);
      return models.treinamentos.listarModulos().map((m) => ({
        ...m,
        totalPerguntas: models.treinamentos.perguntasDoModulo(m.id).length,
        concluido: concluidos[m.id] !== undefined,
        acertos: concluidos[m.id] ?? null,
      }));
    },

    /** Inicia uma tentativa e devolve as perguntas sem o gabarito. */
    iniciar(usuario, moduloId) {
      exigirColaborador(usuario);
      const modulo = models.treinamentos.buscarModulo(moduloId);
      if (!modulo) throw naoEncontrado('Módulo não encontrado.');
      const tentativaId = models.treinamentos.criarTentativa(usuario.id, moduloId);
      const perguntas = models.treinamentos.perguntasDoModulo(moduloId).map(({ ordem, enunciado, opcoes }) => ({ ordem, enunciado, opcoes }));
      const jaConcluido = models.treinamentos.conclusoesDoUsuario(usuario.id)[moduloId] !== undefined;
      return { tentativaId, modulo, perguntas, valePontos: !jaConcluido };
    },

    /**
     * Responde a próxima pergunta da tentativa.
     * @param {{id: number, nome: string}} usuario
     * @param {number} tentativaId
     * @param {{pergunta: number, opcao: number}} resposta pergunta = índice (0, 1, 2...)
     */
    responder(usuario, tentativaId, { pergunta, opcao }) {
      exigirColaborador(usuario);
      return transacao(db, () => {
        const tentativa = models.treinamentos.buscarTentativa(tentativaId);
        if (!tentativa || tentativa.usuarioId !== usuario.id) throw naoEncontrado('Tentativa não encontrada.');
        if (tentativa.finalizada) throw conflito('Esta tentativa já foi concluída.');
        if (pergunta !== tentativa.respostas.length) {
          throw conflito(`Responda a pergunta ${tentativa.respostas.length + 1} primeiro.`);
        }
        const perguntas = models.treinamentos.perguntasDoModulo(tentativa.moduloId);
        const atual = perguntas[pergunta];
        if (opcao >= atual.opcoes.length) throw entidadeInvalida('opcao_invalida', 'Opção inexistente.');

        const correta = opcao === atual.correta;
        const respostas = [...tentativa.respostas, opcao];
        const acertos = tentativa.acertos + (correta ? 1 : 0);
        const finalizada = respostas.length === perguntas.length;
        let pontuou = false;
        let recompensa = null;

        if (finalizada) {
          const modulo = models.treinamentos.buscarModulo(tentativa.moduloId);
          pontuou = models.treinamentos.conclusoesDoUsuario(usuario.id)[tentativa.moduloId] === undefined;
          models.treinamentos.registrarConclusao(usuario.id, tentativa.moduloId, acertos);
          if (pontuou) {
            recompensa = {
              adubo: REGRAS.aduboPorAcerto * acertos,
              xp: REGRAS.xpPorAcerto * acertos,
              pontos: REGRAS.pontosPorAcerto * acertos,
            };
            plantas.recompensar(usuario.id, recompensa);
            registro.feed(usuario.nome, `concluiu o treinamento "${modulo.nome}" (${acertos}/${perguntas.length}).`);
          }
          registro.auditar(usuario.nome, 'Concluiu treinamento', `${modulo.nome} · ${acertos}/${perguntas.length}${pontuou ? '' : ' · sem pontos (refeito)'}`);
        }
        models.treinamentos.salvarTentativa(tentativaId, { respostas, acertos, finalizada, pontuou });

        return {
          correta,
          opcaoCorreta: atual.correta,
          explicacao: atual.explicacao,
          acertos,
          finalizada,
          pontuou,
          recompensa,
        };
      });
    },
  };
}
