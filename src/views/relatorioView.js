/**
 * @file Views do servidor: documentos gerados para download.
 *
 * No MVC deste projeto a View principal é o front-end em `public/`. Estas
 * views geram os arquivos exportados: o relatório da análise crítica (HTML)
 * e a trilha de auditoria (CSV).
 */

const escapar = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pct = (n) => `${(Math.round(n * 10) / 10).toLocaleString('pt-BR')}%`;
const reducao = (r) => `${r >= 0 ? '−' : '+'}${pct(Math.abs(r))}`;
const num = (n) => Math.round(n).toLocaleString('pt-BR');

/**
 * Relatório da análise crítica pela direção (ISO 14001, 9.3) em HTML.
 * @param {ReturnType<ReturnType<typeof import('../services/indicadorService.js').criarIndicadorService>['analiseCritica']>} r
 * @returns {string}
 */
export function relatorioAnaliseCriticaHtml(r) {
  const d = r.desempenho;
  const lista = (itens) => `<ul>${itens.map((i) => `<li>${escapar(i)}</li>`).join('')}</ul>`;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Análise crítica pela direção · Silvia</title>
<style>body{font-family:Arial,sans-serif;max-width:780px;margin:40px auto;padding:0 16px;line-height:1.5;color:#222}
h1{font-size:22px}h2{font-size:17px;margin-top:24px;border-bottom:1px solid #ccc}table{border-collapse:collapse;width:100%}
td,th{border:1px solid #ccc;padding:4px 8px;text-align:left}</style></head><body>
<h1>Análise crítica pela direção (ISO 14001, 9.3)</h1>
<p>Gerado pelo sistema Silvia em ${escapar(new Date(r.geradoEm).toLocaleString('pt-BR'))}.</p>
<h2>Desempenho ambiental</h2>
${lista([
    `Energia: ${num(d.energia.kwh)} kWh (${reducao(d.energia.reducaoPct)}; meta −${d.energia.metaPct}%).`,
    `Papel: ${num(d.papel.folhas)} folhas (${reducao(d.papel.reducaoPct)}; meta −${d.papel.metaPct}%).`,
    `Reciclável: média de ${pct(d.reciclavel.mediaPct)} (meta ${d.reciclavel.metaPct}%).`,
  ])}
<table><thead><tr><th>Setor</th><th>Sol (metas atingidas)</th><th>Pontos para a próxima árvore</th></tr></thead><tbody>
${r.setores.map((s) => `<tr><td>${escapar(s.setor)}</td><td>${s.sol}%</td><td>${num(s.pontos)}</td></tr>`).join('')}
</tbody></table>
<h2>Não conformidades (10.2)</h2>
${lista([`${r.naoConformidades.fechadas} de ${r.naoConformidades.total} fechadas; ${r.naoConformidades.abertas} sem triagem e ${r.naoConformidades.emAcao} em ação corretiva.`])}
<h2>Competência e conscientização (7.2, 7.3)</h2>
${lista([`${pct(r.competencia.treinadosPct)} dos colaboradores concluíram ao menos um módulo.`, `${r.competencia.plantasMurchas} planta(s) murcha(s).`])}
<h2>Comunicação e partes interessadas (7.4, 4.2)</h2>
${lista([
    `${r.comunicacao.arvoresPlantadas} árvores nativas plantadas e publicadas na página pública; ${r.comunicacao.plantiosAgendados} agendada(s).`,
    ...r.comunicacao.fornecedores.map((f) => `Fornecedor ${f.nome}: ${f.requisitosAtendidosPct}% dos requisitos ambientais atendidos.`),
  ])}
<h2>Oportunidades de melhoria (10.3)</h2>
${r.oportunidadesDeMelhoria.length ? lista(r.oportunidadesDeMelhoria) : '<p>Nenhuma meta fora do alvo.</p>'}
</body></html>`;
}

/** Marca de ordem de bytes: faz o Excel reconhecer o arquivo como UTF-8. */
const BOM = String.fromCharCode(0xfeff);
const FIM_DE_LINHA = String.fromCharCode(13, 10);

/**
 * Trilha de auditoria em CSV (separador ";" e BOM para abrir certo no Excel).
 * @param {{ator: string, acao: string, detalhe: string|null, criadoEm: string}[]} linhas
 * @returns {string}
 */
export function auditoriaCsv(linhas) {
  const campo = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const corpo = linhas.map((l) => [new Date(l.criadoEm).toLocaleString('pt-BR'), l.ator, l.acao, l.detalhe].map(campo).join(';'));
  return BOM + ['data;autor;acao;detalhe', ...corpo].join(FIM_DE_LINHA);
}
