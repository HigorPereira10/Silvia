/**
 * @file Página pública da floresta (sem login): comunicação externa, 7.4 e 4.2.
 * Atualiza em tempo real quando a gestora registra um novo plantio.
 */
import { api } from '../core/api.js';
import { desenharFloresta } from '../core/planta.js';
import { data, esc, kpi, pct, reducao } from '../core/ui.js';

/** Evita buscar os mesmos dados três vezes no mesmo redesenho. */
let cache = { em: 0, dados: null };
async function floresta() {
  if (Date.now() - cache.em > 1000) cache = { em: Date.now(), dados: await api('/publico/floresta') };
  return cache.dados;
}

const EVENTOS = ['floresta.atualizada'];

export const tela = {
  html: () => `<div class="app">
    <header class="apphead">
      <div class="brand"><span class="logo">Silvia</span><span class="lbl">gestão ambiental · ISO 14001</span></div>
      <div class="who">Página pública da floresta</div>
      <a class="sair" href="#/login">Entrar</a>
    </header>
    <section class="px sec" id="b-hero"></section>
    <div class="grid2">
      <section class="px sec" id="b-ind"></section>
      <section class="px sec"><div class="sechead"><h2>Últimos plantios</h2><span class="live">ao vivo</span></div><div id="b-tab"></div></section>
    </div>
    <footer class="rodape"><span>Dados publicados pela empresa para vizinhos, clientes e parceiros.</span><a href="/api/docs" target="_blank" rel="noopener">API pública</a></footer>
  </div>`,

  blocos: {
    'b-hero': {
      eventos: EVENTOS,
      async render() {
        const f = await floresta();
        return `<div class="sechead"><h2>A floresta que a empresa já plantou</h2><span class="iso">7.4 comunicação externa</span></div>
          <div class="trees"><span class="big">${f.arvores}</span><span class="tg">árvores nativas plantadas por meio do Silvia. Cada uma nasceu de 1.000 pontos em ações ambientais reais de um setor da empresa.</span></div>
          <canvas id="forest" class="forest" role="img" aria-label="Floresta em pixel art com ${f.arvores} árvores"></canvas>
          <p class="note">Árvores plantadas há menos de 30 dias aparecem como muda; até 4 meses, como arbusto.</p>`;
      },
      async depois(el) {
        desenharFloresta(el.querySelector('#forest'), (await floresta()).plantios);
      },
    },
    'b-ind': {
      eventos: EVENTOS,
      async render() {
        const i = (await floresta()).indicadores;
        return `<div class="sechead"><h2>Indicadores do mês</h2></div><div class="kpis">
          ${kpi('Energia', reducao(i.energiaReducaoPct), 'sobre a linha de base')}
          ${kpi('Papel', reducao(i.papelReducaoPct), 'folhas impressas sobre a linha de base')}
          ${kpi('Reciclável', pct(i.reciclavelMediaPct), 'média de resíduo separado')}
          ${kpi('Treinados', pct(i.treinadosPct), 'dos colaboradores')}</div>
          <p class="note">Partes interessadas (cláusula 4.2) acompanham o desempenho ambiental da empresa.</p>`;
      },
    },
    'b-tab': {
      eventos: EVENTOS,
      async render() {
        const { plantios } = await floresta();
        return tabelaPlantios(plantios.slice(0, 8));
      },
    },
  },
};

/** Tabela de plantios realizados (também usada pela gestora). */
export function tabelaPlantios(plantios) {
  if (!plantios.length) return '<p class="note">Nenhuma árvore plantada ainda.</p>';
  return `<div class="tbl"><table><thead><tr><th>Espécie</th><th>Local</th><th>Data</th><th>Setor</th></tr></thead><tbody>${plantios.map((p) =>
    `<tr><td>${esc(p.especie)}</td><td>${esc(p.local)}${p.endereco ? `<br><span class="note">${esc(p.endereco)}</span>` : ''}</td><td>${data(p.plantadoEm)}</td><td>${esc(p.setor ?? p.setorNome)}</td></tr>`).join('')}</tbody></table></div>`;
}
