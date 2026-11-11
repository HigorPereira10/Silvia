/**
 * @file Telas do colaborador: minha muda, treinamentos e histórico.
 */
import { api } from '../core/api.js';
import { canvasPlanta } from '../core/planta.js';
import {
  aviso, barrasPlanta, chip, corSaude, data, esc, fmtN, listaAvisos, pct, reducao,
} from '../core/ui.js';
import {
  anexarExemplo, blocoFeed, blocoPendencias, enviarAcao, enviarPoda, gavetaAcao, gavetaPoda, mostrarPrevia, secaoFeed,
} from './compartilhado.js';

export const abas = [['inicio', 'Minha muda'], ['treinamentos', 'Treinamentos'], ['historico', 'Meu histórico']];

/** Número no selo das abas: módulos ainda não feitos. */
export async function contadores() {
  const modulos = await api('/treinamentos');
  return { treinamentos: modulos.filter((m) => !m.concluido).length };
}

/** Dica contextual sobre o estado da planta. */
function dica(eu) {
  const p = eu.planta;
  if (eu.usuario.ferias) return 'Férias ativas: sua muda não perde água nem adubo.';
  if (p.galhoSeco) return 'Tem um galho seco: reporte um desperdício para podar.';
  if (p.murcha) return 'Sua muda murchou. Registre ações e faça treinamentos para recuperá-la.';
  if (p.agua < 35) return 'Sua muda está com sede: registre uma ação ambiental.';
  if (p.adubo < 35) return 'Falta adubo: faça um treinamento.';
  return 'Muda saudável. Continue assim.';
}

/** Canteiro (grade de plantas), reutilizado pelo fornecedor. */
export function canteiro(plantas, meuId) {
  return `<div class="garden">${plantas.map((p) => `<div class="plot${p.usuarioId === meuId ? ' me' : ''}" title="${esc(p.dono)}: ${esc(p.estagioNome)}, saúde ${p.saude}">
    ${canvasPlanta(p, 4)}<b><span class="dot" style="background:${corSaude(p.saude)}"></span>${esc(p.dono)}${p.usuarioId === meuId ? ' (você)' : ''}</b></div>`).join('')}</div>`;
}

const ATUALIZA_PLANTA = ['planta.atualizada', 'canteiro.atualizado', 'setor.atualizado', 'nc.atualizada'];

const inicio = {
  html: (ctx) => `<div class="grid2"><div class="col">
      <section class="px sec"><div id="b-planta"></div>
        <div class="actions">
          <button class="act" type="button" data-a="gaveta" data-g="regar"><i style="background:var(--water)"></i>Regar<small>registrar ação real</small></button>
          <button class="act" type="button" data-a="aba" data-aba="treinamentos"><i style="background:var(--soil)"></i>Adubar<small>fazer treinamento</small></button>
          <button class="act" type="button" data-a="gaveta" data-g="podar"><i style="background:var(--bad)"></i>Podar<small>reportar desperdício</small></button>
        </div><div id="b-gaveta"></div></section>
      <section class="px sec"><div class="sechead"><h2>Minhas pendências</h2><span class="iso">7.5</span></div><div id="b-pend"></div></section>
      <section class="px sec"><div class="sechead"><h2>Canteiro do ${esc(ctx.eu.usuario.setorNome)}</h2><span class="lbl">plantas dos colegas</span></div><div id="b-canteiro"></div>
        <p class="note">Bolinha: saúde da planta. Verde a partir de 60, amarela de 40 a 59, vermelha abaixo de 40.</p></section>
    </div><div class="col">
      <section class="px sec" id="b-floresta"></section>
      <section class="px sec" id="b-metas"></section>
      ${secaoFeed}
    </div></div>`,

  blocos: {
    'b-planta': {
      eventos: ATUALIZA_PLANTA,
      async render(ctx) {
        const eu = await ctx.atualizarEu();
        const p = eu.planta;
        return `<div class="sechead"><h2>Minha muda</h2><span class="lbl">${esc(p.especie)} · ${esc(p.estagioNome)}</span></div>
          <div class="me-card"><div class="stage">${canvasPlanta(p, 10)}</div><div class="bars">${barrasPlanta(p)}
          <p class="note">${dica(eu)}</p>
          <label class="ck"><input type="checkbox" id="ferias"${eu.usuario.ferias ? ' checked' : ''}> Estou de férias (pausa o decaimento)</label></div></div>`;
      },
    },
    'b-gaveta': {
      async render(ctx) {
        if (ctx.local.gaveta === 'regar') return gavetaAcao(await api('/acoes/categorias'));
        if (ctx.local.gaveta === 'podar') return gavetaPoda(ctx.catalogo.categoriasDesperdicio);
        return '';
      },
    },
    'b-pend': blocoPendencias,
    'b-canteiro': {
      eventos: ATUALIZA_PLANTA,
      render: async (ctx) => canteiro(await api(`/setores/${ctx.eu.usuario.setorId}/canteiro`), ctx.eu.usuario.id),
    },
    'b-floresta': {
      eventos: ['plantio.agendado', 'floresta.atualizada', 'planta.atualizada'],
      async render(ctx) {
        const [setor, floresta, agendados] = await Promise.all([
          api(`/setores/${ctx.eu.usuario.setorId}`), api('/publico/floresta'), api('/plantios?status=agendado'),
        ]);
        const meus = agendados.filter((p) => p.setorId === setor.id).length;
        return `<div class="sechead"><h2>Floresta real</h2><span class="iso">7.4 comunicação</span></div>
          <div class="trees"><span class="big">${floresta.arvores}</span><div class="tg"><span>árvores nativas plantadas pela empresa</span>
          <div class="track"><div class="fill" style="width:${setor.pontos / ctx.catalogo.regras.pontosPorArvore * 100}%;background:var(--leaf)"></div></div>
          <span class="note">${esc(setor.nome)}: ${fmtN(setor.pontos)} de ${fmtN(ctx.catalogo.regras.pontosPorArvore)} pontos para a próxima árvore${meus ? ` · ${meus} ${meus > 1 ? 'plantios agendados' : 'plantio agendado'}` : ''}</span></div></div>`;
      },
    },
    'b-metas': {
      eventos: ['setor.atualizado'],
      render: async (ctx) => metasDoSetor(await api(`/setores/${ctx.eu.usuario.setorId}`)),
    },
    'b-feed': blocoFeed,
  },

  acoes: {
    async gaveta({ g }, _el, ctx) {
      ctx.local.gaveta = g || null;
      await ctx.renderizar('b-gaveta');
      document.querySelector('#b-gaveta select')?.focus();
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

  mudancas: {
    'ev-file': (campo) => mostrarPrevia(campo.files[0]),
    async ferias(campo, ctx) {
      await api('/eu/ferias', { metodo: 'PATCH', corpo: { ferias: campo.checked } });
      aviso(campo.checked ? 'Férias ativadas: sua muda não vai murchar.' : 'Bem-vindo de volta!');
      await ctx.renderizar('b-planta');
    },
  },
};

/** Metas do setor (sol): barras de energia, papel e reciclável. */
export function metasDoSetor(s) {
  const a = s.atingimento;
  const meta = (rotulo, texto, v) => {
    const classe = v >= 100 ? 'ok' : v >= 75 ? 'warn' : 'bad';
    return `<div class="goal"><div class="goal-row"><span>${rotulo}</span><span class="pill ${classe}">${texto}</span></div>
      <div class="track"><div class="fill" style="width:${v}%;background:var(--${classe === 'warn' ? 'sun' : classe})"></div></div></div>`;
  };
  return `<div class="sechead"><h2>Metas do setor · sol ${s.sol}%</h2><span class="iso">6.2 · 9.1</span></div>
    ${meta('Energia elétrica (kWh)', `${reducao(a.reducaoEnergiaPct)} / meta −${s.metaEnergiaPct}%`, a.energia)}
    ${meta('Folhas impressas', `${reducao(a.reducaoPapelPct)} / meta −${s.metaPapelPct}%`, a.papel)}
    ${meta('Resíduo reciclável separado', `${pct(s.ultimaMedicao?.reciclavelPct ?? 0)} / meta ${s.metaReciclavelPct}%`, a.reciclavel)}
    <p class="note">Medições reais lançadas pela gestora: conta de luz, contador da impressora e pesagem da coleta. O sol vale 30% da saúde de todas as plantas do setor.</p>`;
}

// ---------------------------------------------------------------- treinamentos
function quiz(q) {
  if (q.resultado) {
    const r = q.resultado;
    return `<section class="px sec"><h2>${esc(q.modulo.nome)}</h2><p>Você acertou <b>${r.acertos} de ${q.perguntas.length}</b>.</p>
      <p>${r.pontuou ? `Sua muda recebeu +${r.recompensa.adubo} de adubo e o setor ganhou ${r.recompensa.pontos} pontos.` : 'Este módulo já tinha sido concluído, então não houve pontos desta vez.'}</p>
      <div class="row"><button class="btn" type="button" data-a="aba" data-aba="inicio">Ver minha muda</button><button class="btn ghost" type="button" data-a="fecharQuiz">Fechar</button></div></section>`;
  }
  const pergunta = q.perguntas[q.indice];
  const resp = q.correcao;
  return `<section class="px sec"><div class="sechead"><h2>${esc(q.modulo.nome)}</h2><span class="lbl">pergunta ${q.indice + 1} de ${q.perguntas.length}</span></div>
    <p class="qp">${esc(pergunta.enunciado)}</p>
    <div class="quiz">${pergunta.opcoes.map((o, i) => {
      const classe = resp ? (i === resp.opcaoCorreta ? 'certo' : i === q.escolhida ? 'errado' : '') : '';
      return `<button type="button" class="${classe}" data-a="responder" data-opcao="${i}"${resp ? ' disabled' : ''}>${esc(o)}</button>`;
    }).join('')}</div>
    ${resp ? `<p class="${resp.correta ? 'ok-t' : 'bad-t'}"><b>${resp.correta ? 'Correto.' : 'Não foi dessa vez.'}</b> ${esc(resp.explicacao)}</p>
      <div class="row"><button class="btn" type="button" data-a="proxima">${resp.finalizada ? 'Ver resultado' : 'Próxima pergunta'}</button></div>` : ''}</section>`;
}

const treinamentos = {
  html: () => `<section class="px sec"><div class="sechead"><h2>Treinamentos</h2><span class="iso">7.2 competência · 7.3 conscientização</span></div>
    <p class="note">Cada módulo tem 3 perguntas. Cada acerto vale +12 de adubo e 4 pontos para o setor. Os pontos contam só na primeira vez.</p>
    <div id="b-modulos"></div></section><div id="b-quiz"></div>`,
  blocos: {
    'b-modulos': {
      async render() {
        const modulos = await api('/treinamentos');
        return `<div class="mods">${modulos.map((m) => `<div class="mod"><div><h3>${esc(m.nome)}</h3><p class="note">${esc(m.descricao)}</p></div>
          <div class="row">${m.concluido ? `<span class="chip ok">Concluído · ${m.acertos}/${m.totalPerguntas}</span>` : '<span class="chip pend">Pendente</span>'}
          <button class="btn${m.concluido ? ' ghost' : ''}" type="button" data-a="iniciar" data-modulo="${esc(m.id)}">${m.concluido ? 'Refazer' : 'Começar'}</button></div></div>`).join('')}</div>`;
      },
    },
    'b-quiz': { render: async (ctx) => (ctx.local.quiz ? quiz(ctx.local.quiz) : '') },
  },
  acoes: {
    async iniciar({ modulo }, _el, ctx) {
      const t = await api(`/treinamentos/${modulo}/tentativas`, { metodo: 'POST' });
      ctx.local.quiz = { ...t, indice: 0, correcao: null, escolhida: null, resultado: null };
      await ctx.renderizar('b-quiz');
      document.getElementById('b-quiz').scrollIntoView({ block: 'nearest' });
    },
    async responder({ opcao }, _el, ctx) {
      const q = ctx.local.quiz;
      if (!q || q.correcao) return;
      q.escolhida = Number(opcao);
      q.correcao = await api(`/tentativas/${q.tentativaId}/respostas`, { metodo: 'POST', corpo: { pergunta: q.indice, opcao: q.escolhida } });
      await ctx.renderizar('b-quiz');
    },
    async proxima(_d, _el, ctx) {
      const q = ctx.local.quiz;
      if (q.correcao.finalizada) {
        q.resultado = q.correcao;
        if (q.resultado.pontuou) aviso(`+${q.resultado.recompensa.adubo} de adubo para sua muda`);
        await ctx.recarregar();
        return;
      }
      q.indice += 1;
      q.correcao = null;
      q.escolhida = null;
      await ctx.renderizar('b-quiz');
    },
    async fecharQuiz(_d, _el, ctx) {
      ctx.local.quiz = null;
      await ctx.renderizar('b-quiz');
    },
  },
};

// ---------------------------------------------------------------- histórico
export const historico = {
  html: () => `<section class="px sec"><div class="sechead"><h2>Minhas ações</h2><span class="iso">7.5 informação documentada</span></div><div id="b-acoes"></div></section>
    <section class="px sec"><div class="sechead"><h2>Desperdícios que reportei</h2><span class="iso">10.2</span></div><div id="b-ncs"></div></section>
    <section class="px sec"><div class="sechead"><h2>Avisos</h2></div><div id="b-avisos"></div></section>`,
  blocos: {
    'b-acoes': {
      eventos: ['validacao.decidida'],
      async render() {
        const acoes = await api('/acoes/minhas');
        if (!acoes.length) return '<p class="note">Nenhuma ação registrada ainda.</p>';
        return `<div class="tbl"><table><thead><tr><th>Data</th><th>Ação</th><th>Evidência</th><th>Status</th><th>Resultado</th></tr></thead><tbody>${acoes.map((a) =>
          `<tr><td>${data(a.criadoEm)}</td><td>${esc(a.categoria)}${a.descricao ? `<br><span class="note">${esc(a.descricao)}</span>` : ''}</td>
          <td><span class="file">${esc(a.evidenciaNome)}</span></td><td>${chip(a.status)}</td>
          <td>${a.status === 'aprovada' ? `+30 de água${a.pontos ? ` · +${a.pontos} pts` : ''}` : a.status === 'recusada' ? esc(a.motivo) : '—'}</td></tr>`).join('')}</tbody></table></div>`;
      },
    },
    'b-ncs': {
      eventos: ['nc.atualizada'],
      async render() {
        const ncs = await api('/ncs');
        if (!ncs.length) return '<p class="note">Você ainda não reportou nenhum desperdício.</p>';
        return `<div class="tbl"><table><thead><tr><th>Código</th><th>Problema</th><th>Status</th><th>Ação corretiva</th></tr></thead><tbody>${ncs.map((n) =>
          `<tr><td>${n.codigo}</td><td>${esc(n.tipo)}<br><span class="note">${esc(n.local)}</span></td><td>${chip(n.status)}</td><td>${esc(n.acaoCorretiva ?? n.motivo ?? '—')}</td></tr>`).join('')}</tbody></table></div>`;
      },
    },
    'b-avisos': { eventos: ['notificacao.nova'], render: async () => listaAvisos((await api('/eu/notificacoes')).itens) },
  },
};

export const telas = { inicio, treinamentos, historico };
