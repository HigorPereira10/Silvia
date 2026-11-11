/**
 * @file Serviço de setores, metas e medições mensais (6.2 e 9.1).
 *
 * A medição real lançada pela gestora (conta de luz, contador da impressora,
 * pesagem da coleta) define o "sol" do canteiro, que vale 30% da saúde de
 * todas as plantas do setor.
 */
import { atingimentoMetas, calcularSol } from '../domain/regras.js';
import { naoEncontrado } from '../utils/erros.js';

/**
 * @param {{models: import('../models/index.js').Models,
 *   registro: ReturnType<typeof import('./registroService.js').criarRegistroService>,
 *   plantas: ReturnType<typeof import('./plantaService.js').criarPlantaService>,
 *   eventos: ReturnType<typeof import('../realtime/eventos.js').criarBarramentoEventos>}} deps
 */
export function criarSetorService({ models, registro, plantas, eventos }) {
  /** Setor com metas, atingimento e sol calculados. */
  function detalhar(setor) {
    const ultimaMedicao = models.setores.ultimaMedicao(setor.id);
    const atingimento = atingimentoMetas(setor, ultimaMedicao);
    return {
      ...setor,
      sol: calcularSol(atingimento),
      atingimento,
      ultimaMedicao,
      totalColaboradores: models.usuarios.listarPorSetor(setor.id).length,
    };
  }

  function buscarOuFalhar(id) {
    const setor = models.setores.buscar(id);
    if (!setor) throw naoEncontrado('Setor não encontrado.');
    return setor;
  }

  return {
    listar: () => models.setores.listar().map(detalhar),

    obter: (id) => detalhar(buscarOuFalhar(id)),

    canteiro(id) {
      buscarOuFalhar(id);
      return plantas.canteiroDoSetor(id);
    },

    medicoes(id) {
      buscarOuFalhar(id);
      return models.setores.listarMedicoes(id);
    },

    /**
     * Lança (ou corrige) a medição de um mês.
     * @param {{id: number, nome: string}} gestor
     * @param {string} setorId
     * @param {{mes: string, energiaKwh: number, papelFolhas: number, reciclavelPct: number}} dados
     */
    lancarMedicao(gestor, setorId, dados) {
      const setor = buscarOuFalhar(setorId);
      models.setores.salvarMedicao({ setorId, ...dados, registradoPor: gestor.id });
      const atualizado = detalhar(setor);
      registro.feed(setor.nome, `recebeu uma nova medição: o sol do canteiro agora está em ${atualizado.sol}%.`, 'marco');
      registro.auditar(
        gestor.nome,
        'Lançou medição',
        `${setor.nome} · ${dados.mes} · ${dados.energiaKwh} kWh, ${dados.papelFolhas} folhas, ${dados.reciclavelPct}% reciclável`,
      );
      eventos.emitir('setor.atualizado', { setorId, sol: atualizado.sol }, 'autenticados');
      return atualizado;
    },
  };
}
