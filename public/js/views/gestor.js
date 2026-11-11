/**
 * @file Telas da gestora ambiental: painel ISO 14031, validação de evidências,
 * não conformidades, metas e medições, plantios, auditoria e relatório 9.3.
 */
import { api, baixarArquivo, urlProtegida } from '../core/api.js';
import {
  abrirJanela, aviso, chip, dataHora, esc, fecharJanela, fmtN, itensFeed, kpi, opcoes, pct, pilulaSol, reducao,
} from '../core/ui.js';
import { tabelaPlantios } from './publico.js';

export const abas = [
  ['painel', 'Painel'], ['validacao', 'Validação'], ['ncs', 'Não conformidades'], ['metas', 'Metas e medições'],
  ['plantios', 'Plantios'], ['auditoria', 'Auditoria'], ['relatorio', 'Relatório'],
];

export async function contadores() {
  const { alertas } = await api('/indicadores/painel');
  return { validacao: alertas.evidenciasPendentes, ncs: alertas.ncAbertas, plantios: alertas.plantiosAgendados };
}

const TUDO = ['planta.atualizada', 'validacao.nova', 'validacao.decidida', 'nc.atualizada', 'plantio.agendado', 'floresta.atualizada', 'setor.atualizado', 'canteiro.atualizado'];
const mesAtual = () => new Date().toISOString().slice(0, 7);

// ---------------------------------------------------------------- painel
function grafico(meses, meta) {
  const W = 340; const H = 150; const topo = 14; const x0 = 40;
  const maximo = Math.max(meta, ...meses.map((m) => m.energiaKwh)) * 1.05;
  const minimo = Math.min(meta, ...meses.map((m) => m.energiaKwh)) * 0.9;
  const y = (v) => topo + H - ((v - minimo) / (maximo - minimo)) * H;
  const largura = 34; const espaco = (W - x0 - 10 - meses.length * largura) / Math.max(1, meses.length - 1);
  const marcas = [minimo, (minimo + maximo) / 2, maximo];
  let svg = marcas.map((t) => `<line x1="${x0}" x2="${W - 4}" y1="${y(t)}" y2="${y(t)}" stroke="var(--muted)" stroke-opacity=".3"/><text x="${x0 - 6}" y="${y(t) + 4}" text-anchor="end">${(t / 1000).toFixed(1)}k</text>`).join('');
  meses.forEach((m, i) => {
    const x = x0 + 6 + i * (largura + espaco); const ultimo = i === meses.length - 1;
    svg += `<rect x="${x}" y="${y(m.energiaKwh)}" width="${largura}" height="${topo + H - y(m.energiaKwh)}" fill="${ultimo ? 'var(--water)' : 'var(--muted)'}" fill-opacity="${ultimo ? 1 : 0.45}"/>
      <text x="${x + largura / 2}" y="${topo + H + 16}" text-anchor="middle">${esc(m.rotulo)}</text>`;
    if (ultimo) svg += `<text class="em" x="${x + largura / 2}" y="${y(m.energiaKwh) - 5}" text-anchor="middle">${fmtN(m.energiaKwh)}</text>`;
  });
  svg += `<line x1="${x0}" x2="${W - 4}" y1="${y(meta)}" y2="${y(meta)}" stroke="var(--bad)" stroke-width="2" stroke-dasharray="6 4"/>`;
  return `<svg viewBox="0 0 ${W} ${topo + H + 24}" role="img" aria-label="Consumo de energia por mês com a linha da meta">${svg}</svg>
    <div class="legend"><span><b></b>último mês medido</span><span><i></i>meta: ${fmtN(meta)} kWh (−10% sobre a linha de base)</span></div>`;
}

const painel = {
  html: () => `<section class="px sec" id="b-kpis"></section>
    <div class="grid2"><div class="col"><section class="px sec" id="b-alertas"></section><section class="px sec" id="b-ranking"></section></div>
    <div class="col"><section class="px sec" id="b-grafico"></section>
    <section class="px sec"><div class="sechead"><h2>Acontecendo agora</h2><span class="live">ao vivo · WebSocket</span></div><ul class="feed" id="b-feed"></ul></section></div></div>`,
  blocos: {
    'b-kpis': {
      eventos: TUDO,
      async render() {
        const { kpis: k, mesReferencia } = await api('/indicadores/painel');
        return `<div class="sechead"><h2>Indicadores ambientais · ${esc(mesReferencia)}</h2><span class="iso">ISO 14031: IDG · IDO · ICA</span></div><div class="kpis">
          ${kpi('IDG · treinados', pct(k.treinadosPct), `${k.treinados} de ${k.colaboradores} colaboradores concluíram ao menos 1 módulo`)}
          ${kpi('IDG · NCs', `${k.ncFechadas} / ${k.ncTotal}`, `fechadas · ${k.ncAbertas} sem triagem, ${k.ncEmAcao} em ação`)}
          ${kpi('IDO · energia', fmtN(k.energiaKwh), `kWh no último mês, ${reducao(k.energiaReducaoPct)} sobre a linha de base`)}
          ${kpi('IDO · papel', fmtN(k.papelFolhas), `folhas no último mês, ${reducao(k.papelReducaoPct)} sobre a linha de base`)}
          ${kpi('IDO · reciclável', pct(k.reciclavelMediaPct), 'média de resíduo separado (meta 70%)')}
          ${kpi('ICA · árvores', String(k.arvores), `nativas plantadas${k.plantiosAgendados ? ` · ${k.plantiosAgendados} agendada(s)` : ''}`)}</div>`;
      },
    },
    'b-alertas': {
      eventos: TUDO,
      async render() {
        const { alertas: a } = await api('/indicadores/painel');
        const itens = [];
        if (a.evidenciasPendentes) itens.push(`<div class="pi"><span class="chip pend">${a.evidenciasPendentes}</span><span>evidência(s) para validar</span><button class="btn ghost sm" type="button" data-a="aba" data-aba="validacao">Validar</button></div>`);
        if (a.ncAbertas) itens.push(`<div class="pi"><span class="chip bad">${a.ncAbertas}</span><span>não conformidade(s) sem triagem</span><button class="btn ghost sm" type="button" data-a="aba" data-aba="ncs">Triar</button></div>`);
        if (a.plantiosAgendados) itens.push(`<div class="pi"><span class="chip pend">${a.plantiosAgendados}</span><span>plantio(s) para registrar</span><button class="btn ghost sm" type="button" data-a="aba" data-aba="plantios">Registrar</button></div>`);
        if (a.plantasMurchas.length) itens.push(`<div class="pi"><span class="chip bad">${a.plantasMurchas.length}</span><span>planta(s) murcha(s): ${a.plantasMurchas.slice(0, 6).map(esc).join(', ')}${a.plantasMurchas.length > 6 ? '…' : ''}. O aviso automático já foi enviado.</span></div>`);
        return `<div class="sechead"><h2>O que precisa de você</h2><span class="iso">9.1</span></div>
          ${itens.length ? `<div class="plist">${itens.join('')}</div>` : '<p class="note">Tudo em dia.</p>'}
          <div class="row"><button class="btn ghost sm" type="button" data-a="ciclo">Rodar o ciclo diário agora</button>
          <span class="note">O ciclo roda sozinho todo dia. Use o botão para demonstrar o decaimento das plantas.</span></div>`;
      },
    },
    'b-ranking': {
      eventos: TUDO,
      async render() {
        const { ranking } = await api('/indicadores/painel');
        return `<div class="sechead"><h2>Canteiros por setor</h2><span class="lbl">pontos para a próxima árvore</span></div>
          <div class="rank">${ranking.map((s) => `<div><span>${esc(s.nome)}</span><div class="track"><div class="fill" style="width:${s.pontos / 10}%;background:var(--leaf)"></div></div><span class="n">${fmtN(s.pontos)}</span>${pilulaSol(s.sol)}</div>`).join('')}</div>`;
      },
    },
    'b-grafico': {
      eventos: ['setor.atualizado'],
      async render() {
        const { energiaPorMes, metaEnergiaKwh } = await api('/indicadores/painel');
        return `<div class="sechead"><h2>Energia da empresa (kWh)</h2><span class="iso">9.1</span></div>${grafico(energiaPorMes, metaEnergiaKwh)}
          <p class="note">Soma das medições mensais de todos os setores.</p>`;
      },
    },
    'b-feed': { eventos: ['feed.novo'], render: async () => itensFeed(await api('/feed?limite=14')) },
  },
  acoes: {
    async ciclo(_d, el, ctx) {
      el.disabled = true;
      const r = await api('/admin/ciclo-diario', { metodo: 'POST' });
      aviso(`Ciclo executado: ${r.plantas} plantas, ${r.galhosSecos} galho(s) seco(s), ${r.murcharam.length} murcharam.`);
      await ctx.recarregar();
    },
  },
};

// ---------------------------------------------------------------- validação
const validacao = {
  html: () => `<section class="px sec"><div class="sechead"><h2>Evidências para validar</h2><span class="iso">7.5 · 9.2</span></div><div id="b-fila"></div>
    <p class="note">Ação sem evidência aprovada não gera pontos. Cada decisão fica registrada na auditoria com autor e data.</p></section>
    <section class="px sec"><div class="sechead"><h2>Decididas recentemente</h2></div><div id="b-decididas"></div></section>`,
  blocos: {
    'b-fila': {
      eventos: ['validacao.nova', 'validacao.decidida'],
      async render() {
        const fila = await api('/acoes?status=pendente');
        if (!fila.length) return '<p class="note">Fila vazia. Todas as evidências foram analisadas.</p>';
        return `<div class="queue">${fila.map((a) => `<div class="q"><div class="qm">
            <div class="row"><b>${esc(a.autorNome)}</b><span class="lbl">${a.autorPerfil === 'fornecedor' ? 'fornecedor' : esc(a.setorNome)}</span><span class="note">${dataHora(a.criadoEm)}</span></div>
            <div>${esc(a.categoria)}${a.descricao ? ` · <span class="note">${esc(a.descricao)}</span>` : ''}</div>
            <div class="row">${a.temArquivo && a.evidenciaMime?.startsWith('image/') ? `<button class="thumbbtn" type="button" data-a="evidencia" data-id="${a.id}" aria-label="Ampliar evidência"><img class="thumb" data-evidencia="${a.id}" alt="Evidência de ${esc(a.autorNome)}"></button>` : ''}
              ${a.temArquivo ? `<button class="btn ghost sm" type="button" data-a="evidencia" data-id="${a.id}">Abrir ${esc(a.evidenciaNome)}</button>` : `<span class="file">${esc(a.evidenciaNome)}</span><span class="note">(dado de demonstração, sem arquivo)</span>`}</div>
            </div>
            <div class="qb"><button class="btn" type="button" data-a="aprovar" data-id="${a.id}">Aprovar</button>
            <button class="btn ghost" type="button" data-a="recusar" data-id="${a.id}">Recusar</button></div></div>`).join('')}</div>`;
      },
      async depois(el) {
        for (const img of el.querySelectorAll('img[data-evidencia]')) {
          urlProtegida(`/acoes/${img.dataset.evidencia}/evidencia`).then((url) => { img.src = url; }).catch(() => {});
        }
      },
    },
    'b-decididas': {
      eventos: ['validacao.decidida'],
      async render() {
        const lista = await api('/acoes/decididas');
        if (!lista.length) return '<p class="note">Nenhuma decisão ainda.</p>';
        return `<div class="plist">${lista.map((a) => `<div class="pi">${chip(a.status)}<span><b>${esc(a.autorNome)}</b> · ${esc(a.categoria)}${a.status === 'recusada' ? ` · ${esc(a.motivo)}` : ''} <span class="note">por ${esc(a.avaliadorNome ?? '')}</span></span></div>`).join('')}</div>`;
      },
    },
  },
  acoes: {
    async aprovar({ id }, el) {
      el.disabled = true;
      await api(`/acoes/${id}/avaliacao`, { metodo: 'PATCH', corpo: { decisao: 'aprovar' } });
      aviso('Evidência aprovada. A muda do autor foi regada.');
    },
    recusar({ id }, _el, ctx) {
      abrirJanela(`<h3>Recusar evidência</h3><form id="f-recusar" data-id="${esc(id)}" class="form" novalidate>
        <label for="rc-motivo">Motivo<select id="rc-motivo" name="motivo">${opcoes(ctx.catalogo.motivosRecusa)}</select></label>
        <p class="err" role="alert"></p><div class="row"><button class="btn bad" type="submit">Recusar</button></div></form>`);
    },
    async evidencia({ id }) {
      const arquivo = await api(`/acoes/${id}/evidencia`);
      const url = URL.createObjectURL(arquivo);
      abrirJanela(arquivo.type.startsWith('image/')
        ? `<h3>Evidência</h3><img class="big-img" src="${url}" alt="Evidência enviada">`
        : `<h3>Evidência</h3><p>O arquivo é um PDF.</p><a class="btn" href="${url}" target="_blank" rel="noopener">Abrir o PDF em outra aba</a>`);
    },
  },
  formularios: {
    async 'f-recusar'(form) {
      await api(`/acoes/${form.dataset.id}/avaliacao`, { metodo: 'PATCH', corpo: { decisao: 'recusar', motivo: form.motivo.value } });
      fecharJanela();
      aviso('Evidência recusada. O autor recebeu o motivo.');
    },
  },
};

// ---------------------------------------------------------------- não conformidades
const ncs = {
  html: () => `<section class="px sec"><div class="sechead"><h2>Não conformidades</h2><span class="iso">10.2</span></div>
    <p class="note">Fluxo: aberta, aceita com responsável e ação corretiva, fechada depois de verificar a eficácia.</p><div id="b-ncs"></div></section>`,
  blocos: {
    'b-ncs': {
      eventos: ['nc.atualizada'],
      async render() {
        const lista = await api('/ncs');
        return `<div class="tbl"><table><thead><tr><th>Código</th><th>Problema</th><th>Reportado por</th><th>Status</th><th>Responsável e ação</th><th></th></tr></thead><tbody>${lista.map((n) => `<tr>
          <td>${n.codigo}</td><td>${esc(n.tipo)}<br><span class="note">${esc(n.local)}</span></td><td>${esc(n.reportadoPorNome)}<br><span class="note">${dataHora(n.abertaEm)}</span></td>
          <td>${chip(n.status)}</td><td>${n.responsavel ? `<b>${esc(n.responsavel)}</b><br>` : ''}${esc(n.acaoCorretiva ?? n.motivo ?? '—')}</td>
          <td class="acts">${n.status === 'aberta' ? `<button class="btn sm" type="button" data-a="aceitar" data-id="${n.id}" data-codigo="${n.codigo}">Aceitar</button><button class="btn ghost sm" type="button" data-a="improcedente" data-id="${n.id}" data-codigo="${n.codigo}">Improcedente</button>`
            : n.status === 'em_acao' ? `<button class="btn sm" type="button" data-a="fechar" data-id="${n.id}" data-codigo="${n.codigo}" data-acao="${esc(n.acaoCorretiva)}">Fechar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
      },
    },
  },
  acoes: {
    aceitar({ id, codigo }, _el, ctx) {
      abrirJanela(`<h3>Aceitar ${esc(codigo)}</h3><form id="f-aceitar" data-id="${esc(id)}" class="form" novalidate>
        <label for="nc-resp">Responsável<select id="nc-resp" name="responsavel">${opcoes(ctx.catalogo.responsaveis)}</select></label>
        <label for="nc-acao">Ação corretiva<input type="text" id="nc-acao" name="acaoCorretiva" maxlength="140" placeholder="Ex.: trocar o reparo e incluir na inspeção semanal"></label>
        <p class="err" role="alert"></p><div class="row"><button class="btn" type="submit">Aceitar e atribuir</button></div></form>`);
    },
    improcedente({ id, codigo }, _el, ctx) {
      abrirJanela(`<h3>${esc(codigo)} é improcedente?</h3><form id="f-improcedente" data-id="${esc(id)}" class="form" novalidate>
        <label for="im-motivo">Motivo<select id="im-motivo" name="motivo">${opcoes(ctx.catalogo.motivosImprocedencia)}</select></label>
        <p class="err" role="alert"></p><div class="row"><button class="btn bad" type="submit">Marcar como improcedente</button></div></form>`);
    },
    fechar({ id, codigo, acao }) {
      abrirJanela(`<h3>Fechar ${esc(codigo)}</h3><p><b>Ação corretiva:</b> ${esc(acao)}</p><form id="f-fechar" data-id="${esc(id)}" class="form" novalidate>
        <label class="ck"><input type="checkbox" id="fc-ok" name="eficacia"> Verifiquei no local que a ação eliminou a causa</label>
        <p class="err" role="alert"></p><div class="row"><button class="btn" type="submit">Fechar não conformidade</button></div></form>`);
    },
  },
  formularios: {
    async 'f-aceitar'(form) {
      await api(`/ncs/${form.dataset.id}`, { metodo: 'PATCH', corpo: { acao: 'aceitar', responsavel: form.responsavel.value, acaoCorretiva: form.acaoCorretiva.value.trim() } });
      fecharJanela();
      aviso('Não conformidade aceita e atribuída.');
    },
    async 'f-improcedente'(form) {
      await api(`/ncs/${form.dataset.id}`, { metodo: 'PATCH', corpo: { acao: 'improcedente', motivo: form.motivo.value } });
      fecharJanela();
      aviso('Marcada como improcedente.');
    },
    async 'f-fechar'(form) {
      await api(`/ncs/${form.dataset.id}`, { metodo: 'PATCH', corpo: { acao: 'fechar', eficaciaVerificada: form.eficacia.checked } });
      fecharJanela();
      aviso('Não conformidade fechada.');
    },
  },
};

// ---------------------------------------------------------------- metas e medições
const metas = {
  html: () => `<section class="px sec"><div class="sechead"><h2>Metas por setor</h2><span class="iso">6.2 · 9.1</span></div><div id="b-metas"></div></section>
    <section class="px sec"><div class="sechead"><h2>Lançar medição do mês</h2><span class="lbl">dado real vira sol no canteiro</span></div><div id="b-medicao"></div></section>`,
  blocos: {
    'b-metas': {
      eventos: ['setor.atualizado'],
      async render() {
        const setores = await api('/setores');
        return `<div class="tbl"><table><thead><tr><th>Setor</th><th>Energia (kWh)</th><th>Papel (folhas)</th><th>Reciclável</th><th>Mês</th><th>Sol</th></tr></thead><tbody>${setores.map((s) => {
          const m = s.ultimaMedicao; const a = s.atingimento;
          return `<tr><td><b>${esc(s.nome)}</b></td><td>${fmtN(m?.energiaKwh ?? s.baseEnergiaKwh)}<br><span class="note">${reducao(a.reducaoEnergiaPct)} · meta −${s.metaEnergiaPct}%</span></td>
            <td>${fmtN(m?.papelFolhas ?? s.basePapelFolhas)}<br><span class="note">${reducao(a.reducaoPapelPct)} · meta −${s.metaPapelPct}%</span></td>
            <td>${pct(m?.reciclavelPct ?? 0)}<br><span class="note">meta ${s.metaReciclavelPct}%</span></td><td>${esc(m?.mes ?? '—')}</td><td>${pilulaSol(s.sol)}</td></tr>`;
        }).join('')}</tbody></table></div>`;
      },
    },
    'b-medicao': {
      async render(ctx) {
        const setores = await api('/setores');
        const id = ctx.local.setor ?? 'com';
        const s = setores.find((x) => x.id === id) ?? setores[0];
        const m = s.ultimaMedicao;
        return `<form id="f-medicao" class="form" novalidate>
          <div class="row3"><label for="md-setor">Setor<select id="md-setor" name="setor">${setores.map((x) => `<option value="${x.id}"${x.id === s.id ? ' selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></label>
          <label for="md-mes">Mês<input type="text" id="md-mes" name="mes" value="${mesAtual()}" pattern="\\d{4}-\\d{2}"></label><span></span></div>
          <div class="row3"><label for="md-e">Energia (kWh)<input type="number" id="md-e" name="energiaKwh" min="0" step="1" value="${m?.energiaKwh ?? s.baseEnergiaKwh}"></label>
          <label for="md-p">Folhas impressas<input type="number" id="md-p" name="papelFolhas" min="0" step="1" value="${m?.papelFolhas ?? s.basePapelFolhas}"></label>
          <label for="md-r">Reciclável (%)<input type="number" id="md-r" name="reciclavelPct" min="0" max="100" step="1" value="${m?.reciclavelPct ?? 0}"></label></div>
          <p class="note">Linha de base do ${esc(s.nome)}: ${fmtN(s.baseEnergiaKwh)} kWh e ${fmtN(s.basePapelFolhas)} folhas. Baixe a energia e veja o sol do canteiro subir.</p>
          <p class="err" role="alert"></p><div class="row"><button class="btn" type="submit">Lançar medição</button></div></form>`;
      },
    },
  },
  mudancas: {
    async 'md-setor'(campo, ctx) {
      ctx.local.setor = campo.value;
      await ctx.renderizar('b-medicao');
    },
  },
  formularios: {
    async 'f-medicao'(form, ctx) {
      const numero = (v) => (v === '' ? Number.NaN : Number(v));
      const corpo = {
        mes: form.mes.value.trim(),
        energiaKwh: numero(form.energiaKwh.value),
        papelFolhas: numero(form.papelFolhas.value),
        reciclavelPct: numero(form.reciclavelPct.value),
      };
      const setor = await api(`/setores/${form.setor.value}/medicoes`, { metodo: 'POST', corpo });
      aviso(`Medição lançada. Sol do ${setor.nome}: ${setor.sol}%.`);
      await ctx.renderizar('b-medicao');
    },
  },
};

// ---------------------------------------------------------------- plantios
const plantios = {
  html: () => `<section class="px sec"><div class="sechead"><h2>Plantios agendados</h2><span class="iso">7.4</span></div><div id="b-agendados"></div></section>
    <section class="px sec"><div class="sechead"><h2>Árvores plantadas</h2></div><div id="b-plantados"></div></section>`,
  blocos: {
    'b-agendados': {
      eventos: ['plantio.agendado', 'floresta.atualizada'],
      async render() {
        const lista = await api('/plantios?status=agendado');
        if (!lista.length) return '<p class="note">Nenhum plantio agendado. Um plantio é agendado sempre que um setor completa 1.000 pontos.</p>';
        return `<div class="plist">${lista.map((p) => `<div class="pi">${chip('agendado')}<span><b>${esc(p.especie)}</b> · setor ${esc(p.setorNome)} · desde ${dataHora(p.agendadoEm)}</span>
          <button class="btn sm" type="button" data-a="plantar" data-id="${p.id}" data-especie="${esc(p.especie)}">Registrar plantio</button></div>`).join('')}</div>`;
      },
    },
    'b-plantados': {
      eventos: ['floresta.atualizada'],
      async render() {
        const lista = await api('/plantios?status=plantado');
        return `<p class="note">${lista.length} árvores no total.</p>${tabelaPlantios(lista.slice(0, 10))}`;
      },
    },
  },
  acoes: {
    plantar({ id, especie }, _el, ctx) {
      abrirJanela(`<h3>Registrar plantio</h3><p><b>${esc(especie)}</b></p><form id="f-plantio" data-id="${esc(id)}" class="form" novalidate>
        <label for="pl-local">Local<select id="pl-local" name="local">${opcoes(ctx.catalogo.locaisPlantio)}</select></label>
        <label for="pl-cep">CEP do local<input type="text" id="pl-cep" name="cep" inputmode="numeric" maxlength="9" placeholder="00000-000"></label>
        <p class="note">O servidor consulta o web service ViaCEP para completar e verificar o endereço.</p>
        <p class="err" role="alert"></p><div class="row"><button class="btn" type="submit">Registrar árvore plantada</button></div></form>`);
    },
  },
  formularios: {
    async 'f-plantio'(form) {
      const r = await api(`/plantios/${form.dataset.id}`, { metodo: 'PATCH', corpo: { local: form.local.value, cep: form.cep.value } });
      fecharJanela();
      aviso(r.avisoCep ?? `Árvore registrada em ${r.plantio.endereco}. Ela já aparece na página pública.`);
    },
  },
};

// ---------------------------------------------------------------- auditoria
const auditoria = {
  html: () => `<section class="px sec"><div class="sechead"><h2>Trilha de auditoria</h2><span class="iso">9.2 auditoria interna</span></div>
    <div class="row"><p class="note">Tudo que muda no sistema fica registrado com autor, data e detalhe.</p><button class="btn ghost sm" type="button" data-a="csv">Baixar CSV</button></div>
    <div id="b-auditoria"></div></section>`,
  blocos: {
    'b-auditoria': {
      eventos: TUDO,
      async render() {
        const linhas = await api('/auditoria?limite=80');
        return `<div class="tbl"><table><thead><tr><th>Data</th><th>Autor</th><th>Ação</th><th>Detalhe</th></tr></thead><tbody>${linhas.map((l) =>
          `<tr><td>${dataHora(l.criadoEm)}</td><td>${esc(l.ator)}</td><td>${esc(l.acao)}</td><td>${esc(l.detalhe ?? '')}</td></tr>`).join('')}</tbody></table></div>`;
      },
    },
  },
  acoes: { csv: () => baixarArquivo('/auditoria?formato=csv', 'auditoria-silvia.csv') },
};

// ---------------------------------------------------------------- relatório 9.3
const relatorio = {
  html: () => `<section class="px sec" id="b-relatorio"></section>`,
  blocos: {
    'b-relatorio': {
      async render() {
        const r = await api('/relatorios/analise-critica');
        const d = r.desempenho;
        const lista = (itens) => `<ul>${itens.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
        return `<div class="sechead"><h2>Análise crítica pela direção</h2><span class="iso">9.3</span></div>
          <p class="note">Pacote de entrada da reunião da direção, montado automaticamente com os dados do sistema.</p>
          <div class="rel"><h3>Desempenho ambiental</h3>${lista([
            `Energia: ${fmtN(d.energia.kwh)} kWh (${reducao(d.energia.reducaoPct)}; meta −${d.energia.metaPct}%).`,
            `Papel: ${fmtN(d.papel.folhas)} folhas (${reducao(d.papel.reducaoPct)}; meta −${d.papel.metaPct}%).`,
            `Reciclável: média de ${pct(d.reciclavel.mediaPct)} (meta ${d.reciclavel.metaPct}%).`])}
          <h3>Não conformidades</h3>${lista([`${r.naoConformidades.fechadas} de ${r.naoConformidades.total} fechadas; ${r.naoConformidades.abertas} sem triagem e ${r.naoConformidades.emAcao} em ação corretiva.`])}
          <h3>Competência e conscientização</h3>${lista([`${pct(r.competencia.treinadosPct)} dos colaboradores concluíram ao menos um módulo.`, `${r.competencia.plantasMurchas} planta(s) murcha(s).`])}
          <h3>Comunicação e partes interessadas</h3>${lista([`${r.comunicacao.arvoresPlantadas} árvores plantadas; ${r.comunicacao.plantiosAgendados} agendada(s).`,
            ...r.comunicacao.fornecedores.map((f) => `Fornecedor ${f.nome}: ${f.requisitosAtendidosPct}% dos requisitos atendidos.`)])}
          <h3>Oportunidades de melhoria</h3>${r.oportunidadesDeMelhoria.length ? lista(r.oportunidadesDeMelhoria) : '<p>Nenhuma meta fora do alvo.</p>'}</div>
          <div class="row"><button class="btn ghost" type="button" data-a="baixar">Baixar relatório (.html)</button></div>`;
      },
    },
  },
  acoes: {
    baixar() {
      return baixarArquivo('/relatorios/analise-critica?formato=html', 'analise-critica-silvia.html');
    },
  },
};

export const telas = { painel, validacao, ncs, metas, plantios, auditoria, relatorio };
