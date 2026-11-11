/**
 * @file Peças de tela usadas por colaborador e fornecedor.
 */
import { api } from '../core/api.js';
import { desenharPlanta } from '../core/planta.js';
import { aviso, chip, esc, itensFeed, opcoes } from '../core/ui.js';

/** Bloco do feed "Acontecendo agora" (atualiza ao vivo). */
export const blocoFeed = {
  eventos: ['feed.novo'],
  render: async () => itensFeed(await api('/feed?limite=14')),
};

export const secaoFeed = `<section class="px sec"><div class="sechead"><h2>Acontecendo agora</h2><span class="live">ao vivo · WebSocket</span></div><ul class="feed" id="b-feed"></ul></section>`;

/**
 * Gaveta com o formulário de ação ("regar") com evidência.
 * @param {{categorias: string[], requisitosPendentes: {id: number, nome: string}[]}} opcoesAcao
 * @param {number|null} requisitoId requisito pré-selecionado (fornecedor)
 */
export function gavetaAcao({ categorias, requisitosPendentes }, requisitoId = null) {
  const requisitos = requisitosPendentes.map((r) => `<option value="req:${r.id}"${r.id === requisitoId ? ' selected' : ''}>Comprovar: ${esc(r.nome)}</option>`).join('');
  return `<div class="drawer"><h3>Registrar ação ambiental</h3>
    <form id="f-acao" class="form" novalidate>
      <label for="ac-cat">O que foi feito?<select id="ac-cat" name="escolha">${requisitos}${opcoes(categorias)}</select></label>
      <label for="ac-desc">Detalhes (opcional)<input type="text" id="ac-desc" name="descricao" maxlength="120" placeholder="Ex.: carona com 2 colegas"></label>
      <div class="evf">
        <label for="ev-file">Evidência (foto ou PDF, até 8 MB)<input type="file" id="ev-file" name="evidencia" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"></label>
        <button class="btn ghost sm" type="button" data-a="exemplo">Usar imagem de exemplo</button>
        <div id="ev-prev" class="row"><span class="note">Nenhum arquivo anexado.</span></div>
      </div>
      <p class="err" role="alert"></p>
      <div class="row"><button class="btn" type="submit">Enviar para validação</button><button class="btn ghost" type="button" data-a="gaveta" data-g="">Cancelar</button></div>
      <p class="note">A gestora ambiental confere a evidência. Água e pontos entram depois da aprovação.</p>
    </form></div>`;
}

/** Gaveta com o formulário de desperdício ("podar"). */
export function gavetaPoda(categorias) {
  return `<div class="drawer"><h3>Reportar desperdício</h3>
    <form id="f-podar" class="form" novalidate>
      <label for="pd-tipo">Tipo<select id="pd-tipo" name="tipo">${opcoes(categorias)}</select></label>
      <label for="pd-local">Onde?<input type="text" id="pd-local" name="local" maxlength="80" placeholder="Ex.: copa do 3º andar"></label>
      <p class="err" role="alert"></p>
      <div class="row"><button class="btn bad" type="submit">Abrir não conformidade</button><button class="btn ghost" type="button" data-a="gaveta" data-g="">Cancelar</button></div>
      <p class="note">O galho seco sai na hora. O crescimento entra quando a gestora aceitar a não conformidade.</p>
    </form></div>`;
}

/** Mostra a prévia do arquivo escolhido. */
export function mostrarPrevia(arquivo) {
  const alvo = document.getElementById('ev-prev');
  if (!alvo) return;
  if (!arquivo) { alvo.innerHTML = '<span class="note">Nenhum arquivo anexado.</span>'; return; }
  const imagem = arquivo.type.startsWith('image/') ? `<img class="thumb" src="${URL.createObjectURL(arquivo)}" alt="Prévia da evidência">` : '';
  alvo.innerHTML = `${imagem}<span class="file">${esc(arquivo.name)}</span>`;
}

/**
 * Gera uma imagem PNG de exemplo (pixel art) e a coloca no campo de arquivo,
 * para testar o envio real de evidência sem ter uma foto à mão.
 */
export async function anexarExemplo() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const c = canvas.getContext('2d');
  c.fillStyle = '#bfe3f0'; c.fillRect(0, 0, 256, 192);
  c.fillStyle = '#7cb35a'; c.fillRect(0, 140, 256, 52);
  desenharPlanta(c, { estagio: 4, saude: 90, px: 8, semente: 42, galhoSeco: false, ox: 64, oy: 16 });
  c.fillStyle = '#2b2118'; c.font = '16px monospace'; c.fillText('evidência de exemplo', 30, 180);
  const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png'));
  const arquivo = new File([blob], 'evidencia_exemplo.png', { type: 'image/png' });
  const campo = document.getElementById('ev-file');
  const transferencia = new DataTransfer();
  transferencia.items.add(arquivo);
  campo.files = transferencia.files;
  mostrarPrevia(arquivo);
}

/**
 * Envia o formulário de ação (multipart/form-data) para POST /acoes.
 * @param {HTMLFormElement} form
 */
export async function enviarAcao(form) {
  const dados = new FormData(form);
  const escolha = String(dados.get('escolha'));
  dados.delete('escolha');
  if (escolha.startsWith('req:')) dados.set('requisitoId', escolha.slice(4));
  else dados.set('categoria', escolha);
  if (!form.querySelector('#ev-file').files.length) dados.delete('evidencia');
  await api('/acoes', { metodo: 'POST', form: dados });
  aviso('Enviado para validação da gestora.');
}

/** Envia o formulário de desperdício (POST /ncs). */
export async function enviarPoda(form) {
  const nc = await api('/ncs', { metodo: 'POST', corpo: { tipo: form.tipo.value, local: form.local.value.trim() } });
  aviso(`${nc.codigo} aberta. Galho podado.`);
}

/** Bloco "Minhas pendências": ações aguardando e NCs sem triagem. */
export const blocoPendencias = {
  eventos: ['validacao.decidida', 'nc.atualizada', 'planta.atualizada'],
  async render() {
    const [acoes, ncs] = await Promise.all([api('/acoes/minhas'), api('/ncs?status=aberta')]);
    const pendentes = acoes.filter((a) => a.status === 'pendente');
    const recentes = acoes.filter((a) => a.status !== 'pendente').slice(0, 3);
    if (!pendentes.length && !ncs.length && !recentes.length) return '<p class="note">Nada pendente. Registre uma ação para regar sua muda.</p>';
    const linhas = [
      ...pendentes.map((a) => `<div class="pi">${chip('pendente')}<span>${esc(a.categoria)}</span></div>`),
      ...ncs.map((n) => `<div class="pi">${chip('triagem')}<span>${n.codigo}: ${esc(n.tipo)}</span></div>`),
      ...recentes.map((a) => `<div class="pi">${chip(a.status)}<span>${esc(a.categoria)}${a.status === 'recusada' ? ` · ${esc(a.motivo)}` : ''}</span></div>`),
    ];
    return `<div class="plist">${linhas.join('')}</div>`;
  },
};
