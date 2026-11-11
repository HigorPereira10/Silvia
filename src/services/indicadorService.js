/**
 * @file Indicadores ambientais (ISO 14031), relatório da análise crítica (9.3)
 * e dados da página pública (7.4).
 *
 * Categorias da ISO 14031 usadas no painel:
 *  - IDG: indicadores de desempenho de gestão (treinamentos, NCs)
 *  - IDO: indicadores de desempenho operacional (energia, papel, reciclável)
 *  - ICA: indicadores de condição ambiental (árvores plantadas)
 */
import { atingimentoMetas, calcularSolFornecedor, estagioPorIdade, estaMurcha } from '../domain/regras.js';
import { mesDe, rotuloMes } from '../utils/datas.js';

const formatarPct = (n) => `${(Math.round(n * 10) / 10).toLocaleString('pt-BR')}%`;
const reducaoTexto = (r) => `${r >= 0 ? '−' : '+'}${formatarPct(Math.abs(r))}`;

/**
 * @param {{models: import('../models/index.js').Models,
 *   plantas: ReturnType<typeof import('./plantaService.js').criarPlantaService>,
 *   setores: ReturnType<typeof import('./setorService.js').criarSetorService>}} deps
 */
export function criarIndicadorService({ models, plantas, setores }) {
  /** Consolida os números da empresa a partir das últimas medições de cada setor. */
  function consolidar() {
    const lista = setores.listar();
    let energiaBase = 0;
    let energia = 0;
    let papelBase = 0;
    let papel = 0;
    let reciclavel = 0;
    for (const s of lista) {
      energiaBase += s.baseEnergiaKwh;
      papelBase += s.basePapelFolhas;
      energia += s.ultimaMedicao?.energiaKwh ?? s.baseEnergiaKwh;
      papel += s.ultimaMedicao?.papelFolhas ?? s.basePapelFolhas;
      reciclavel += s.ultimaMedicao?.reciclavelPct ?? 0;
    }
    const colaboradores = models.usuarios.contarPorPerfil('colaborador');
    const treinados = models.treinamentos.contarColaboradoresTreinados();
    const ncs = models.ncs.contarPorStatus();
    const todas = models.plantas.listarTodas().map((p) => plantas.apresentar(p));
    return {
      setores: lista,
      energiaKwh: energia,
      energiaBaseKwh: energiaBase,
      energiaReducaoPct: ((energiaBase - energia) / energiaBase) * 100,
      papelFolhas: papel,
      papelReducaoPct: ((papelBase - papel) / papelBase) * 100,
      reciclavelMediaPct: lista.length ? reciclavel / lista.length : 0,
      colaboradores,
      treinados,
      treinadosPct: colaboradores ? (treinados / colaboradores) * 100 : 0,
      ncFechadas: ncs.fechada,
      ncTotal: ncs.aberta + ncs.em_acao + ncs.fechada,
      ncAbertas: ncs.aberta,
      ncEmAcao: ncs.em_acao,
      arvores: models.plantios.contar('plantado'),
      plantiosAgendados: models.plantios.contar('agendado'),
      evidenciasPendentes: models.acoes.contarPorStatus('pendente'),
      murchas: todas.filter((p) => estaMurcha(p.saude)).map((p) => p.dono),
    };
  }

  /** Oportunidades de melhoria geradas a partir das metas fora do alvo. */
  function melhorias(c) {
    const saida = [];
    for (const s of c.setores) {
      const a = atingimentoMetas(s, s.ultimaMedicao);
      if (a.energia < 75) saida.push(`${s.nome}: energia ${reducaoTexto(a.reducaoEnergiaPct)} contra meta de −${s.metaEnergiaPct}%. Rever horários do ar-condicionado e equipamentos ligados fora do expediente.`);
      if (a.papel < 75) saida.push(`${s.nome}: papel ${reducaoTexto(a.reducaoPapelPct)} contra meta de −${s.metaPapelPct}%. Ampliar o uso de assinatura digital.`);
      if (a.reciclavel < 90) saida.push(`${s.nome}: reciclável em ${s.ultimaMedicao?.reciclavelPct ?? 0}%. Reforçar o módulo "Resíduos no escritório".`);
    }
    for (const f of models.fornecedores.listar()) {
      const pendentes = models.fornecedores.requisitos(f.id).filter((r) => !r.atendido);
      if (pendentes.length) saida.push(`Fornecedor ${f.nome}: pendente ${pendentes.map((r) => r.nome.toLowerCase()).join(', ')}.`);
    }
    return saida;
  }

  const servico = {
    /** Dados do painel da gestora. */
    painel() {
      const c = consolidar();
      const { setores: lista, ...kpis } = c;
      return {
        mesReferencia: rotuloMes(mesDe()),
        kpis: { ...kpis, murchas: c.murchas.length },
        alertas: {
          evidenciasPendentes: c.evidenciasPendentes,
          ncAbertas: c.ncAbertas,
          plantiosAgendados: c.plantiosAgendados,
          plantasMurchas: c.murchas,
        },
        ranking: lista.map((s) => ({ id: s.id, nome: s.nome, pontos: s.pontos, sol: s.sol })).sort((a, b) => b.pontos - a.pontos),
        energiaPorMes: models.setores.energiaPorMes(6).map((m) => ({ ...m, rotulo: rotuloMes(m.mes) })),
        metaEnergiaKwh: Math.round(c.energiaBaseKwh * 0.9),
      };
    },

    /** Dados estruturados da análise crítica pela direção (9.3). */
    analiseCritica() {
      const c = consolidar();
      return {
        geradoEm: new Date().toISOString(),
        desempenho: {
          energia: { kwh: c.energiaKwh, reducaoPct: c.energiaReducaoPct, metaPct: 10 },
          papel: { folhas: c.papelFolhas, reducaoPct: c.papelReducaoPct, metaPct: 15 },
          reciclavel: { mediaPct: c.reciclavelMediaPct, metaPct: 70 },
        },
        setores: c.setores.map((s) => ({ setor: s.nome, sol: s.sol, pontos: s.pontos })),
        naoConformidades: { fechadas: c.ncFechadas, total: c.ncTotal, abertas: c.ncAbertas, emAcao: c.ncEmAcao },
        competencia: { treinadosPct: c.treinadosPct, plantasMurchas: c.murchas.length },
        comunicacao: {
          arvoresPlantadas: c.arvores,
          plantiosAgendados: c.plantiosAgendados,
          fornecedores: models.fornecedores.listar().map((f) => ({
            nome: f.nome,
            requisitosAtendidosPct: calcularSolFornecedor(models.fornecedores.requisitos(f.id)),
          })),
        },
        oportunidadesDeMelhoria: melhorias(c),
      };
    },

    /** Dados da página pública: floresta real e indicadores (sem login). */
    floresta() {
      const c = consolidar();
      const agora = Date.now();
      const plantados = models.plantios.listar({ status: 'plantado' }).map((p) => ({
        id: p.id,
        especie: p.especie,
        local: p.local,
        setor: p.setorNome,
        plantadoEm: p.plantadoEm,
        estagioVisual: estagioPorIdade((agora - Date.parse(p.plantadoEm)) / 864e5),
      }));
      return {
        arvores: plantados.length,
        plantios: plantados,
        indicadores: {
          energiaReducaoPct: c.energiaReducaoPct,
          papelReducaoPct: c.papelReducaoPct,
          reciclavelMediaPct: c.reciclavelMediaPct,
          treinadosPct: c.treinadosPct,
        },
      };
    },
  };
  return servico;
}
