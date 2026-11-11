/**
 * @file Controllers da gestão ambiental (painel, relatório, auditoria, ciclo)
 * e da área pública.
 */
import {
  CATEGORIAS_ACAO, CATEGORIAS_DESPERDICIO, CATEGORIAS_FORNECEDOR, ESTAGIOS, LOCAIS_PLANTIO,
  MOTIVOS_IMPROCEDENCIA, MOTIVOS_RECUSA, REGRAS, RESPONSAVEIS,
} from '../domain/constantes.js';
import { auditoriaCsv, relatorioAnaliseCriticaHtml } from '../views/relatorioView.js';

/** @param {import('../services/index.js').Servicos} s */
export function criarGestaoController(s) {
  return {
    /** GET /indicadores/painel */
    painel(_req, res) {
      res.json(s.indicadores.painel());
    },

    /** GET /relatorios/analise-critica[?formato=html] */
    analiseCritica(req, res) {
      const relatorio = s.indicadores.analiseCritica();
      if (req.query.formato === 'html') {
        res.setHeader('Content-Disposition', 'attachment; filename="analise-critica-silvia.html"');
        res.type('html').send(relatorioAnaliseCriticaHtml(relatorio));
        return;
      }
      res.json(relatorio);
    },

    /** GET /auditoria[?formato=csv] */
    auditoria(req, res) {
      const limite = req.validado.query.limite ?? 100;
      const linhas = s.models.auditoria.listar(req.query.formato === 'csv' ? 500 : limite);
      if (req.query.formato === 'csv') {
        res.setHeader('Content-Disposition', 'attachment; filename="auditoria-silvia.csv"');
        res.type('text/csv; charset=utf-8').send(auditoriaCsv(linhas));
        return;
      }
      res.json(linhas);
    },

    /** POST /admin/ciclo-diario: dispara o ciclo manualmente (demonstração) */
    cicloDiario(req, res) {
      res.json(s.ciclo.executar(req.usuario.nome));
    },
  };
}

/** @param {import('../services/index.js').Servicos} s */
export function criarPublicoController(s) {
  return {
    /** GET /saude */
    saude(_req, res) {
      res.json({ status: 'ok', servico: 'silvia', versao: '1.0.0', horario: new Date().toISOString() });
    },

    /** GET /publico/floresta */
    floresta(_req, res) {
      res.json(s.indicadores.floresta());
    },

    /** GET /catalogo: listas usadas nos formulários do front-end */
    catalogo(_req, res) {
      res.json({
        estagios: ESTAGIOS,
        regras: REGRAS,
        categoriasAcao: CATEGORIAS_ACAO,
        categoriasDesperdicio: CATEGORIAS_DESPERDICIO,
        categoriasFornecedor: CATEGORIAS_FORNECEDOR,
        responsaveis: RESPONSAVEIS,
        locaisPlantio: LOCAIS_PLANTIO,
        motivosRecusa: MOTIVOS_RECUSA,
        motivosImprocedencia: MOTIVOS_IMPROCEDENCIA,
      });
    },
  };
}
