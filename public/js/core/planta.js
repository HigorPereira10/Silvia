/**
 * @file Desenho das plantas em pixel art (canvas).
 *
 * A planta é desenhada numa grade de 16x16 "pixels". O estágio (0 a 4), a
 * saúde (murcha abaixo de 40) e o galho seco mudam o desenho. A `semente`
 * vinda da API garante que cada planta tenha sempre o mesmo formato.
 */

const PALETA = {
  solo: '#8a5a34', soloEscuro: '#5e3b22', soloClaro: '#a8754a', tronco: '#7a4b2a', troncoEscuro: '#4a2c18', semente: '#6b4226',
  folha: ['#9ad86f', '#4f9a3c', '#2f6b2a'], murcha: ['#c4b25e', '#8c7a3a', '#5e4f2a'], flor: '#f2c230', galho: '#a8998a',
};
const ESTAGIOS = ['Semente', 'Broto', 'Muda', 'Arbusto', 'Árvore'];

/** Ruído determinístico: mesmo (x, y, semente) gera sempre o mesmo número. */
function ruido(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/**
 * Desenha uma planta.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{estagio: number, saude: number, px: number, semente: number, galhoSeco: boolean, ox?: number, oy?: number}} o
 */
export function desenharPlanta(ctx, o) {
  const { px, ox = 0, oy = 0 } = o;
  const P = (x, y, cor) => { ctx.fillStyle = cor; ctx.fillRect(ox + x * px, oy + y * px, px, px); };
  const murcha = o.saude < 40;
  const F = murcha ? PALETA.murcha : PALETA.folha;
  const s = o.semente || 1;

  for (let x = 4; x <= 11; x++) P(x, 14, x % 3 ? PALETA.solo : PALETA.soloClaro);
  for (let x = 2; x <= 13; x++) P(x, 15, PALETA.soloEscuro);

  const copa = (cx, cy, r) => {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy * 1.15 > r * r) continue;
        const k = ruido(x, y, s);
        if (k < 0.05 || (murcha && k > 0.72)) continue;
        const sombra = (dx + dy) / r;
        let cor = sombra < -0.45 ? F[0] : sombra > 0.45 ? F[2] : F[1];
        if (k > 0.85 && !murcha) cor = F[0];
        P(x, y, cor);
        if (o.estagio === 4 && !murcha && o.saude >= 60 && k > 0.8 && k < 0.9) P(x, y, PALETA.flor);
      }
    }
  };

  if (o.estagio === 0) { P(7, 13, PALETA.semente); P(8, 13, PALETA.semente); P(8, 12, F[1]); P(9, 11, F[0]); }
  if (o.estagio === 1) {
    for (let y = 10; y <= 13; y++) P(8, y, F[1]);
    P(7, 10, F[0]); P(6, 9, F[1]); P(9, 11, F[0]); P(10, 10, F[1]); P(8, 9, F[0]);
  }
  if (o.estagio === 2) {
    for (let y = 6; y <= 13; y++) P(8, y, F[2]);
    [[11, 1], [9, -1], [7, 1]].forEach(([y, d]) => { P(8 + d, y, F[1]); P(8 + 2 * d, y - 1, F[0]); P(8 - d, y - 1, F[1]); });
    P(8, 5, F[0]); P(7, 5, F[1]);
  }
  if (o.estagio === 3) {
    copa(7.5, 7.5, 4.3);
    for (let y = 11; y <= 13; y++) { P(7, y, PALETA.tronco); P(8, y, PALETA.troncoEscuro); }
  }
  if (o.estagio === 4) {
    copa(7.5, 5, 5.7);
    for (let y = 9; y <= 13; y++) { P(7, y, PALETA.tronco); P(8, y, PALETA.troncoEscuro); }
    P(6, 13, PALETA.troncoEscuro); P(9, 13, PALETA.troncoEscuro);
  }
  if (o.galhoSeco && o.estagio >= 2) {
    const galho = o.estagio === 2 ? [[9, 8], [10, 7], [11, 6], [11, 5]] : [[11, 8], [12, 7], [13, 6], [14, 6], [13, 5]];
    galho.forEach(([x, y]) => P(x, y, PALETA.galho));
  }
}

/**
 * HTML de um canvas que será pintado por `pintarPlantas`.
 * @param {{usuarioId: number, dono: string, estagio: number, saude: number, semente: number, galhoSeco: boolean}} planta
 * @param {number} px tamanho de cada "pixel"
 */
export function canvasPlanta(planta, px) {
  const n = 16 * px;
  return `<canvas width="${n}" height="${n}" style="width:${n}px;height:${n}px" data-planta
    data-estagio="${planta.estagio}" data-saude="${planta.saude}" data-px="${px}" data-semente="${planta.semente}"
    data-galho="${planta.galhoSeco ? 1 : 0}" data-dono="${planta.usuarioId}" role="img"
    aria-label="Planta de ${String(planta.dono).replace(/"/g, '')}: ${ESTAGIOS[planta.estagio]}, saúde ${planta.saude}"></canvas>`;
}

const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Anima gotas de chuva sobre a planta (quando uma ação é aprovada). */
function chover(canvas, o) {
  if (semMovimento) return;
  const ctx = canvas.getContext('2d');
  const gotas = Array.from({ length: 14 }, () => ({ x: 2 + Math.floor(Math.random() * 12), y: -Math.random() * 8 }));
  let quadro = 0;
  (function passo() {
    if (!canvas.isConnected) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    desenharPlanta(ctx, o);
    ctx.fillStyle = '#5aa6e6';
    for (const g of gotas) {
      g.y += 0.5;
      if (g.y > 0 && g.y < 13) ctx.fillRect(g.x * o.px + 3, Math.floor(g.y) * o.px, 4, 8);
    }
    if (++quadro < 40) requestAnimationFrame(passo);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); desenharPlanta(ctx, o); }
  })();
}

/**
 * Pinta todos os canvases de planta dentro de `raiz`.
 * @param {ParentNode} raiz
 * @param {{chuvaPara?: number|null}} [opcoes] id do dono cuja planta recebe chuva
 */
export function pintarPlantas(raiz, { chuvaPara = null } = {}) {
  raiz.querySelectorAll('canvas[data-planta]').forEach((c) => {
    const d = c.dataset;
    const o = { estagio: +d.estagio, saude: +d.saude, px: +d.px, semente: +d.semente, galhoSeco: d.galho === '1' };
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    desenharPlanta(ctx, o);
    if (chuvaPara !== null && Number(d.dono) === chuvaPara && o.px >= 8) chover(c, o);
  });
}

/**
 * Desenha a floresta real (árvores plantadas) num único canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {{estagioVisual: number}[]} arvores
 */
export function desenharFloresta(canvas, arvores) {
  const colunas = 12;
  const celula = 48;
  const linhas = Math.max(1, Math.ceil(arvores.length / colunas));
  canvas.width = colunas * celula;
  canvas.height = linhas * celula + 8;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#7cb35a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = ruido(i, 3, 7) > 0.5 ? '#6aa04a' : '#93c870';
    ctx.fillRect(Math.floor((ruido(i, 1, 7) * canvas.width) / 4) * 4, Math.floor((ruido(i, 2, 7) * canvas.height) / 4) * 4, 4, 4);
  }
  arvores.forEach((a, i) => desenharPlanta(ctx, {
    estagio: a.estagioVisual, saude: 85, px: 3, semente: i * 13 + 5, galhoSeco: false,
    ox: (i % colunas) * celula, oy: Math.floor(i / colunas) * celula + 4,
  }));
}
