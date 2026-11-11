/**
 * @file Utilidades de interface: escape de HTML, formatação, componentes e janelas.
 */

/** Escapa texto para inserir em HTML com segurança. */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const limitar = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
export const fmtN = (n) => Math.round(n).toLocaleString('pt-BR');
export const pct = (n) => `${(Math.round(n * 10) / 10).toLocaleString('pt-BR')}%`;
/** Redução como texto: 7.9 -> "−7,9%", -2 -> "+2%". */
export const reducao = (r) => `${r >= 0 ? '−' : '+'}${pct(Math.abs(r))}`;

/** "14:05" se for hoje; "12/10" se for outro dia. */
export function horaOuData(iso) {
  const d = new Date(iso);
  const hoje = new Date();
  return d.toDateString() === hoje.toDateString()
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
export const data = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
export const dataHora = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Opções de <select> a partir de uma lista de textos. */
export const opcoes = (lista, selecionada) => lista.map((v) => `<option${v === selecionada ? ' selected' : ''}>${esc(v)}</option>`).join('');

/** Barra de progresso rotulada (Saúde, Água...). */
export function barra(rotulo, valor, corVar, texto) {
  return `<div class="bar"><span>${rotulo}</span><div class="track"><div class="fill" style="width:${limitar(valor)}%;background:var(${corVar})"></div></div><span class="num">${texto ?? Math.round(valor)}</span></div>`;
}

/** Barras completas de uma planta vinda da API. */
export function barrasPlanta(p) {
  return barra('Saúde', p.saude, '--leaf') + barra('Água', p.agua, '--water') + barra('Adubo', p.adubo, '--soil')
    + barra('Sol', p.sol, '--sun')
    + barra('Cresc.', p.estagio === 4 ? 100 : (p.xp / p.xpProximo) * 100, '--muted', p.estagio === 4 ? 'máx' : `${p.xp}/${p.xpProximo}`);
}

const CHIPS = {
  pendente: ['pend', 'Aguardando gestora'], triagem: ['pend', 'Aguardando triagem'], aprovada: ['ok', 'Aprovada'],
  recusada: ['bad', 'Recusada'], aberta: ['bad', 'Aberta'], em_acao: ['pend', 'Em ação corretiva'], fechada: ['ok', 'Fechada'],
  improcedente: ['mut', 'Improcedente'], agendado: ['pend', 'Agendado'], plantado: ['ok', 'Plantado'],
};
/** Selo de status. */
export function chip(status) {
  const [classe, texto] = CHIPS[status] ?? ['mut', status];
  return `<span class="chip ${classe}">${texto}</span>`;
}

export const pilulaSol = (s) => `<span class="pill ${s >= 85 ? 'ok' : s >= 60 ? 'warn' : 'bad'}">sol ${s}%</span>`;
export const kpi = (rotulo, valor, detalhe) => `<div class="kpi"><span class="lbl">${rotulo}</span><span class="v">${valor}</span><span class="d">${detalhe}</span></div>`;
export const corSaude = (h) => (h >= 60 ? 'var(--ok)' : h >= 40 ? 'var(--sun)' : 'var(--bad)');

/** Itens do feed "Acontecendo agora". */
export function itensFeed(itens) {
  const classe = { agua: 'w', poda: 'p', marco: 't', geral: '' };
  if (!itens.length) return '<li><time></time><span>Nada por aqui ainda.</span></li>';
  return itens.map((f) => `<li class="${classe[f.tipo] ?? ''}"><time>${horaOuData(f.criadoEm)}</time><span>${f.ator ? `<b>${esc(f.ator)}</b> ` : ''}${esc(f.texto)}</span></li>`).join('');
}

/** Lista de avisos. */
export function listaAvisos(itens) {
  if (!itens.length) return '<p class="note">Sem avisos.</p>';
  return `<ul class="nlist">${itens.map((x) => `<li class="${x.lida ? '' : 'new'}"><time>${horaOuData(x.criadaEm)}</time><span>${esc(x.mensagem)}</span></li>`).join('')}</ul>`;
}

// ---------- aviso flutuante e janela modal ----------
let temporizadorAviso;
/** Mostra uma mensagem curta no rodapé da tela. */
export function aviso(texto) {
  const el = document.getElementById('toast');
  el.textContent = texto;
  el.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { el.hidden = true; }, 3200);
}

/** Abre a janela modal com o HTML informado. */
export function abrirJanela(html) {
  document.getElementById('m-body').innerHTML = html;
  document.getElementById('modal').hidden = false;
  const foco = document.querySelector('#m-body select, #m-body input:not([type=checkbox])') ?? document.getElementById('m-close');
  foco?.focus();
}

export function fecharJanela() {
  document.getElementById('modal').hidden = true;
  document.getElementById('m-body').innerHTML = '';
}

/** Mostra a mensagem de erro dentro de um formulário (elemento .err). */
export function erroNoFormulario(form, mensagem) {
  const el = form.querySelector('.err');
  if (el) el.textContent = mensagem;
}
