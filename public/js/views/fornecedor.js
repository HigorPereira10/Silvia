/**
 * @file Telas do fornecedor (provedor externo, cláusula 8.1 da ISO 14001).
 *
 * O "sol" do fornecedor é a porcentagem de requisitos ambientais atendidos.
 * Ações aprovadas dão água e adubo; comprovar um requisito o marca como atendido.
 */
import { api } from '../core/api.js';
import { canvasPlanta } from '../core/planta.js';
import { barrasPlanta, esc } from '../core/ui.js';
import { canteiro, historico } from './colaborador.js';
import {
  anexarExemplo, blocoFeed, blocoPendencias, enviarAcao, enviarPoda, gavetaAcao, gavetaPoda, mostrarPrevia, secaoFeed,
} from './compartilhado.js';

export const abas = [['inicio', 'Meu canteiro'], ['historico', 'Histórico']];

const EVENTOS = ['planta.atualizada', 'validacao.decidida', 'canteiro.atualizado'];

const inicio = {
  html: () => `<div class="grid2"><div class="col">
      <section class="px sec"><div id="b-planta"></div>
        <div class="actions two">
          <button class="act" type="button" data-a="gaveta" data-g="acao"><i style="background:var(--water)"></i>Registrar ação<small>com comprovante</small></button>
          <button class="act" type="button" data-a="gaveta" data-g="podar"><i style="background:var(--bad)"></i>Podar<small>reportar desperdício</small></button>
        </div><div id="b-gaveta"></div></section>
      <section class="px sec" id="b-requisitos"></section>
    </div><div class="col">
      <section class="px sec"><div class="sechead"><h2>Canteiro dos fornecedores</h2><span class="iso">8.1 provedores externos</span></div><div id="b-canteiro"></div></section>
      <section class="px sec"><div class="sechead"><h2>Minhas pendências</h2></div><div id="b-pend"></div></section>
      ${secaoFeed}
    </div></div>`,

  blocos: {
    'b-planta': {
      eventos: EVENTOS,
      async render(ctx) {
        const eu = await ctx.atualizarEu();
        const p = eu.planta;
        return `<div class="sechead"><h2>Muda da ${esc(eu.usuario.fornecedorNome)}</h2><span class="lbl">${esc(p.especie)} · ${esc(p.estagioNome)}</span></div>
          <div class="me-card"><div class="stage">${canvasPlanta(p, 10)}</div><div class="bars">${barrasPlanta(p)}
          <p class="note">Para fornecedores, o sol é a porcentagem de requisitos ambientais atendidos. Cada ação aprovada dá água e adubo.</p></div></div>`;
      },
    },
    'b-gaveta': {
      async render(ctx) {
        if (ctx.local.gaveta === 'acao') return gavetaAcao(await api('/acoes/categorias'), ctx.local.requisito ?? null);
        if (ctx.local.gaveta === 'podar') return gavetaPoda(ctx.catalogo.categoriasDesperdicio);
        return '';
      },
    },
    'b-requisitos': {
      eventos: EVENTOS,
      async render(ctx) {
        const { fornecedor } = await ctx.atualizarEu();
        return `<div class="sechead"><h2>Requisitos ambientais</h2><span class="lbl">sol ${fornecedor.sol}%</span></div>
          <div class="plist">${fornecedor.requisitos.map((r) => `<div class="pi">${r.atendido ? '<span class="chip ok">Atendido</span>' : '<span class="chip bad">Pendente</span>'}
            <span>${esc(r.nome)}</span>${r.atendido ? '' : `<button class="btn ghost sm" type="button" data-a="comprovar" data-id="${r.id}">Enviar comprovante</button>`}</div>`).join('')}</div>
          <p class="note">A empresa exige estes itens dos fornecedores (8.1). Cada requisito aprovado aumenta o sol do seu canteiro.</p>`;
      },
    },
    'b-canteiro': { eventos: EVENTOS, render: async (ctx) => canteiro(await api('/fornecedores/canteiro'), ctx.eu.usuario.id) },
    'b-pend': blocoPendencias,
    'b-feed': blocoFeed,
  },

  acoes: {
    async gaveta({ g }, _el, ctx) {
      ctx.local.gaveta = g || null;
      ctx.local.requisito = null;
      await ctx.renderizar('b-gaveta');
    },
    async comprovar({ id }, _el, ctx) {
      ctx.local.gaveta = 'acao';
      ctx.local.requisito = Number(id);
      await ctx.renderizar('b-gaveta');
      document.getElementById('b-gaveta').scrollIntoView({ block: 'nearest' });
    },
    exemplo: () => anexarExemplo(),
  },

  formularios: {
    async 'f-acao'(form, ctx) {
      await enviarAcao(form);
      ctx.local.gaveta = null;
      await Promise.all([ctx.renderizar('b-gaveta'), ctx.renderizar('b-pend')]);
    },
    async 'f-podar'(form, ctx) {
      await enviarPoda(form);
      ctx.local.gaveta = null;
      await Promise.all(['b-gaveta', 'b-pend', 'b-planta'].map(ctx.renderizar));
    },
  },

  mudancas: { 'ev-file': (campo) => mostrarPrevia(campo.files[0]) },
};

export const telas = { inicio, historico };
