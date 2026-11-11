/**
 * @file Ponto de entrada do front-end (a View do MVC).
 *
 * Responsabilidades:
 *  - rotas por hash: #/login, #/publico e #/<aba> da área logada;
 *  - montar o "casco" da área logada (cabeçalho, abas, avisos);
 *  - renderizar as telas, que são compostas de BLOCOS;
 *  - repassar eventos do WebSocket aos blocos interessados, que se
 *    redesenham sozinhos (tempo real), sem apagar formulários abertos.
 *
 * Contrato de uma tela (ver js/views/*.js):
 *   { html(ctx): string,
 *     blocos: { 'b-id': { render: async (ctx) => string, eventos?: string[], depois?: (el, ctx) => void } },
 *     acoes?: { nome: async (dataset, elemento, ctx) => void },
 *     formularios?: { 'f-id': async (form, ctx) => void },
 *     mudancas?: { 'id-do-campo': async (campo, ctx) => void } }
 */
import { api, ErroApi } from './core/api.js';
import { sessao } from './core/sessao.js';
import { conectarTempoReal } from './core/tempoReal.js';
import { pintarPlantas } from './core/planta.js';
import { abrirJanela, aviso, esc, fecharJanela, listaAvisos } from './core/ui.js';
import * as telaLogin from './views/login.js';
import * as telaPublica from './views/publico.js';
import * as colaborador from './views/colaborador.js';
import * as gestor from './views/gestor.js';
import * as fornecedor from './views/fornecedor.js';

const MODULOS = { colaborador, gestor, fornecedor };
const raiz = document.getElementById('raiz');

/** Estado global da página. */
const estado = { eu: null, catalogo: null, tela: null, conexao: null, chuvaPara: null, estadoTelas: {} };

/** Contexto entregue às telas. */
const ctx = {
  get eu() { return estado.eu; },
  get catalogo() { return estado.catalogo; },
  /** Estado de interface da tela atual (gaveta aberta, quiz em andamento...). */
  get local() { return (estado.estadoTelas[location.hash] ??= {}); },
  renderizar: (id) => renderizarBloco(id, true),
  recarregar: () => renderizarTela(),
  atualizarEu,
  irPara: (aba) => { location.hash = `#/${aba}`; },
  chover(usuarioId) { estado.chuvaPara = usuarioId; },
};

// ---------------------------------------------------------------- blocos
const pendentes = new Map();

/** Desenha um bloco da tela atual. */
async function renderizarBloco(id, forcar = false) {
  const bloco = estado.tela?.blocos?.[id];
  const el = document.getElementById(id);
  if (!bloco || !el) return;
  try {
    const html = await bloco.render(ctx);
    if (!forcar && el.dataset.html === html) return;
    el.dataset.html = html;
    el.innerHTML = html;
    pintarPlantas(el, { chuvaPara: estado.chuvaPara });
    await bloco.depois?.(el, ctx);
    if (el.querySelector(`canvas[data-dono="${estado.chuvaPara}"]`)) estado.chuvaPara = null;
    el.querySelectorAll('.live').forEach((l) => l.classList.toggle('off', document.body.dataset.tempoReal === 'off'));
  } catch (erro) {
    el.innerHTML = `<p class="err">${esc(erro.message)}</p>`;
  }
}

/** Agenda o redesenho (agrupa vários eventos seguidos em um só). */
function agendarBloco(id) {
  clearTimeout(pendentes.get(id));
  pendentes.set(id, setTimeout(() => renderizarBloco(id), 250));
}

// ---------------------------------------------------------------- telas
function telaAtual() {
  const modulo = MODULOS[estado.eu.usuario.perfil];
  const aba = location.hash.replace('#/', '') || modulo.abas[0][0];
  const valida = modulo.abas.some(([id]) => id === aba);
  return { modulo, aba: valida ? aba : modulo.abas[0][0] };
}

async function renderizarTela() {
  const { modulo, aba } = telaAtual();
  estado.tela = modulo.telas[aba];
  await renderizarCasco(modulo, aba);
  const view = document.getElementById('view');
  view.innerHTML = estado.tela.html(ctx);
  await Promise.all(Object.keys(estado.tela.blocos).map((id) => renderizarBloco(id, true)));
}

/** Cabeçalho, abas e avisos da área logada. */
async function renderizarCasco(modulo, aba) {
  if (!document.getElementById('view')) {
    raiz.innerHTML = `<div class="app">
      <header class="apphead">
        <div class="brand"><span class="logo">Silvia</span><span class="lbl">gestão ambiental · ISO 14001</span></div>
        <div class="who" id="who"></div>
        <button class="bell" id="bell" type="button" data-a="avisos">Avisos<span class="bdg" id="bell-n"></span></button>
        <button class="sair" type="button" data-a="sair">Sair</button>
      </header>
      <nav class="nav" id="nav" role="tablist" aria-label="Seções"></nav>
      <main id="view"></main>
      <footer class="rodape"><span>Silvia · APS Ciência da Computação</span><a href="/api/docs" target="_blank" rel="noopener">Documentação da API (Swagger)</a><a href="#/publico">Página pública da floresta</a></footer>
    </div>`;
  }
  const u = estado.eu.usuario;
  const detalhe = u.perfil === 'gestor' ? 'Gestora ambiental' : u.perfil === 'fornecedor' ? `fornecedor de ${esc(u.fornecedorRamo?.toLowerCase() ?? '')}` : esc(u.setorNome);
  document.getElementById('who').innerHTML = `<b>${esc(u.nome)}</b> · ${detalhe}`;
  document.getElementById('bell-n').textContent = estado.eu.naoLidas || '';
  const contagens = (await modulo.contadores?.(ctx).catch(() => ({}))) ?? {};
  document.getElementById('nav').innerHTML = modulo.abas.map(([id, rotulo]) =>
    `<button class="tab" role="tab" type="button" data-a="aba" data-aba="${id}" aria-selected="${id === aba}">${rotulo}${contagens[id] ? `<span class="bdg">${contagens[id]}</span>` : ''}</button>`).join('');
}

async function atualizarEu() {
  estado.eu = await api('/eu');
  document.getElementById('bell-n')?.replaceChildren(String(estado.eu.naoLidas || ''));
  return estado.eu;
}

// ---------------------------------------------------------------- tempo real
function aoEvento({ evento, dados }) {
  if (evento === 'notificacao.nova') {
    estado.eu.naoLidas = dados.naoLidas;
    document.getElementById('bell-n').textContent = dados.naoLidas || '';
    aviso(dados.mensagem);
  }
  if (evento === 'planta.atualizada' && dados.planta?.usuarioId === estado.eu?.usuario.id) {
    if (estado.eu.planta && dados.planta.agua > estado.eu.planta.agua) estado.chuvaPara = dados.planta.usuarioId;
    estado.eu.planta = dados.planta;
  }
  for (const [id, bloco] of Object.entries(estado.tela?.blocos ?? {})) {
    if (bloco.eventos?.includes(evento)) agendarBloco(id);
  }
  if (['validacao.nova', 'validacao.decidida', 'nc.atualizada', 'plantio.agendado', 'floresta.atualizada'].includes(evento)) {
    const { modulo, aba } = telaAtual();
    clearTimeout(pendentes.get('casco'));
    pendentes.set('casco', setTimeout(() => renderizarCasco(modulo, aba), 400));
  }
}

// ---------------------------------------------------------------- rotas
async function navegar() {
  fecharJanela();
  const hash = location.hash || '#/';
  if (hash === '#/publico') {
    estado.conexao?.fechar();
    estado.eu = null;
    estado.tela = telaPublica.tela;
    raiz.innerHTML = telaPublica.tela.html(ctx);
    await Promise.all(Object.keys(telaPublica.tela.blocos).map((id) => renderizarBloco(id, true)));
    estado.conexao = conectarTempoReal(null, aoEvento);
    return;
  }
  if (!sessao.token && hash !== '#/login') {
    location.hash = '#/login';
    return;
  }
  if (hash === '#/login') {
    estado.conexao?.fechar();
    estado.conexao = null;
    estado.eu = null;
    estado.tela = telaLogin.tela;
    raiz.innerHTML = telaLogin.tela.html(ctx);
    await Promise.all(Object.keys(telaLogin.tela.blocos).map((id) => renderizarBloco(id, true)));
    return;
  }
  if (!estado.eu) {
    try {
      await atualizarEu();
      estado.catalogo ??= await api('/catalogo');
    } catch {
      sessao.sair();
      location.hash = '#/login';
      return;
    }
    estado.conexao?.fechar();
    estado.conexao = conectarTempoReal(sessao.token, aoEvento);
  }
  await renderizarTela();
}

// ---------------------------------------------------------------- interação
/** Ações globais (valem em qualquer tela). */
const ACOES_GLOBAIS = {
  aba: ({ aba }) => ctx.irPara(aba),
  fechar: () => fecharJanela(),
  sair() {
    sessao.sair();
    estado.eu = null;
    raiz.innerHTML = '';
    location.hash = '#/login';
  },
  async avisos() {
    const { itens } = await api('/eu/notificacoes');
    abrirJanela(`<h3>Avisos</h3>${listaAvisos(itens)}`);
    if (estado.eu.naoLidas) {
      await api('/eu/notificacoes/lidas', { metodo: 'PATCH' });
      estado.eu.naoLidas = 0;
      document.getElementById('bell-n').textContent = '';
    }
  },
};

/** Executa uma ação mostrando erros de forma amigável. */
async function executar(fn, ...args) {
  try {
    await fn(...args);
  } catch (erro) {
    const mensagem = erro instanceof ErroApi ? erro.message : 'Algo deu errado. Tente de novo.';
    const form = args.find((a) => a instanceof HTMLFormElement);
    const alvo = form?.querySelector('.err');
    if (alvo) alvo.textContent = mensagem;
    else aviso(mensagem);
    if (!(erro instanceof ErroApi)) console.error(erro);
  }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const nome = el.dataset.a;
  const fn = estado.tela?.acoes?.[nome] ?? ACOES_GLOBAIS[nome];
  if (!fn) return;
  e.preventDefault();
  executar(fn, el.dataset, el, ctx);
});

document.addEventListener('submit', (e) => {
  const fn = estado.tela?.formularios?.[e.target.id];
  if (!fn) return;
  e.preventDefault();
  const botao = e.target.querySelector('[type=submit]');
  if (botao) botao.disabled = true;
  executar(fn, e.target, ctx).finally(() => { if (botao?.isConnected) botao.disabled = false; });
});

document.addEventListener('change', (e) => {
  const fn = estado.tela?.mudancas?.[e.target.id];
  if (fn) executar(fn, e.target, ctx);
});

document.getElementById('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') fecharJanela(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharJanela(); });
window.addEventListener('hashchange', navegar);
navegar();
