/**
 * @file Serviço de não conformidades ("podar"), cláusula 10.2 da ISO 14001.
 *
 * Fluxo: aberta -> em_acao (aceita, com responsável e ação corretiva)
 *        -> fechada (eficácia verificada). Uma NC aberta também pode ser
 *        marcada como improcedente.
 */
import { REGRAS } from '../domain/constantes.js';
import { transacao } from '../database/conexao.js';
import { conflito, entidadeInvalida, naoEncontrado, proibido } from '../utils/erros.js';

/** Transições permitidas: ação -> status de origem exigido. */
const ORIGEM_EXIGIDA = { aceitar: 'aberta', improcedente: 'aberta', fechar: 'em_acao' };

/**
 * @param {{db: import('node:sqlite').DatabaseSync, models: import('../models/index.js').Models,
 *   registro: ReturnType<typeof import('./registroService.js').criarRegistroService>,
 *   plantas: ReturnType<typeof import('./plantaService.js').criarPlantaService>,
 *   eventos: ReturnType<typeof import('../realtime/eventos.js').criarBarramentoEventos>}} deps
 */
export function criarNaoConformidadeService({ db, models, registro, plantas, eventos }) {
  return {
    /**
     * Reporta um desperdício. O galho seco da planta é podado na hora; o
     * crescimento vem quando a gestora aceitar a NC.
     */
    abrir(usuario, { tipo, local }) {
      if (usuario.perfil === 'gestor') throw proibido('A gestora trata as não conformidades; quem reporta são colaboradores e fornecedores.');
      const nc = transacao(db, () => {
        const codigo = models.ncs.proximoCodigo();
        const id = models.ncs.criar({ codigo, tipo, local, reportadoPor: usuario.id });
        plantas.recompensar(usuario.id, { removerGalho: true });
        registro.feed(usuario.nome, `podou um galho seco: ${codigo} (${tipo.toLowerCase()}).`, 'poda');
        registro.auditar(usuario.nome, `Abriu ${codigo}`, `${tipo} · ${local}`);
        return models.ncs.buscar(id);
      });
      eventos.emitir('nc.atualizada', nc, { perfil: 'gestor' });
      return nc;
    },

    /** Gestora vê todas; os demais veem as que reportaram. */
    listar(usuario, { status } = {}) {
      if (usuario.perfil === 'gestor') return models.ncs.listar({ status });
      return models.ncs.listar({ status, reportadoPor: usuario.id });
    },

    /**
     * Move a NC no fluxo de tratamento.
     * @param {{id: number, nome: string}} gestor
     * @param {number} id
     * @param {{acao: 'aceitar'|'fechar'|'improcedente', responsavel?: string, acaoCorretiva?: string,
     *          motivo?: string, eficaciaVerificada?: boolean}} dados
     */
    tratar(gestor, id, dados) {
      const atualizada = transacao(db, () => {
        const nc = models.ncs.buscar(id);
        if (!nc) throw naoEncontrado('Não conformidade não encontrada.');
        if (nc.status !== ORIGEM_EXIGIDA[dados.acao]) {
          throw conflito(`Não é possível "${dados.acao}" uma NC com status "${nc.status}".`);
        }

        if (dados.acao === 'aceitar') {
          models.ncs.atualizar(id, { status: 'em_acao', responsavel: dados.responsavel, acaoCorretiva: dados.acaoCorretiva });
          const reporter = models.usuarios.buscarPorId(nc.reportadoPor);
          plantas.recompensar(nc.reportadoPor, {
            xp: REGRAS.ncXp,
            pontos: reporter.perfil === 'colaborador' ? REGRAS.ncPontos : 0,
          });
          registro.notificar(nc.reportadoPor, `${nc.codigo} foi aceita: +${REGRAS.ncXp} de crescimento. Obrigado por reportar.`);
          registro.auditar(gestor.nome, `Aceitou e atribuiu ${nc.codigo}`, `Responsável: ${dados.responsavel} · ${dados.acaoCorretiva}`);
        } else if (dados.acao === 'fechar') {
          if (!dados.eficaciaVerificada) {
            throw entidadeInvalida('eficacia_nao_verificada', 'Confirme que verificou a eficácia da ação corretiva antes de fechar.');
          }
          models.ncs.atualizar(id, { status: 'fechada', fechar: true });
          registro.notificar(nc.reportadoPor, `${nc.codigo} foi resolvida e fechada.`);
          registro.feed(null, `${nc.codigo} resolvida: ${nc.acaoCorretiva}.`, 'marco');
          registro.auditar(gestor.nome, `Verificou a eficácia e fechou ${nc.codigo}`, nc.acaoCorretiva);
        } else {
          models.ncs.atualizar(id, { status: 'improcedente', motivo: dados.motivo, fechar: true });
          registro.notificar(nc.reportadoPor, `${nc.codigo} foi considerada improcedente: ${dados.motivo}.`);
          registro.auditar(gestor.nome, `Marcou como improcedente ${nc.codigo}`, dados.motivo);
        }
        return models.ncs.buscar(id);
      });
      eventos.emitir('nc.atualizada', atualizada, 'autenticados');
      return atualizada;
    },
  };
}
