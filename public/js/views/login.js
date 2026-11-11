/**
 * @file Tela de login, com atalhos para as contas de demonstração.
 */
import { api } from '../core/api.js';
import { sessao } from '../core/sessao.js';
import { esc } from '../core/ui.js';

const PERFIS = { colaborador: ['ok', 'colaborador'], gestor: ['pend', 'gestora'], fornecedor: ['mut', 'fornecedor'] };

export const tela = {
  html: () => `<div class="login">
    <div>
      <h1>Silvia</h1>
      <span class="lbl">do latim silva: floresta, mata</span>
      <p class="tese">Cada colaborador cuida de uma muda virtual que só cresce com ações ambientais reais e comprovadas.
      Quando o setor junta 1.000 pontos, a empresa planta uma árvore de verdade.</p>
    </div>
    <div class="login-grid">
      <section class="px sec">
        <h2>Entrar</h2>
        <form id="f-login" class="form" novalidate>
          <label for="lg-email">E-mail<input type="email" id="lg-email" name="email" autocomplete="username" placeholder="nome@silvia.local"></label>
          <label for="lg-senha">Senha<input type="password" id="lg-senha" name="senha" autocomplete="current-password"></label>
          <p class="err" role="alert"></p>
          <div class="row"><button class="btn" type="submit">Entrar</button></div>
        </form>
        <p class="note">Sem login, você pode ver a <a href="#/publico">página pública da floresta</a> ou a
        <a href="/api/docs" target="_blank" rel="noopener">documentação da API</a>.</p>
      </section>
      <section class="px sec">
        <div class="sechead"><h2>Contas de demonstração</h2><span class="lbl">senha silvia123</span></div>
        <div id="b-contas"></div>
      </section>
    </div>
  </div>`,

  blocos: {
    'b-contas': {
      async render() {
        const { contas, senha } = await api('/auth/contas-demo');
        return `<p class="note">Clique numa conta para preencher o login.</p><div class="contas">${contas.map((c) => {
          const [classe, rotulo] = PERFIS[c.perfil];
          return `<button type="button" class="conta" data-a="preencher" data-email="${esc(c.email)}" data-senha="${esc(senha)}">
            <b>${esc(c.nome)}</b><span class="chip ${classe}">${rotulo}</span><small>${esc(c.email)} · ${esc(c.detalhe)}</small></button>`;
        }).join('')}</div>`;
      },
    },
  },

  acoes: {
    preencher({ email, senha }) {
      document.getElementById('lg-email').value = email;
      document.getElementById('lg-senha').value = senha;
      document.querySelector('#f-login [type=submit]').focus();
    },
  },

  formularios: {
    async 'f-login'(form) {
      const email = form.email.value.trim();
      const senha = form.senha.value;
      const { token, usuario } = await api('/auth/login', { metodo: 'POST', corpo: { email, senha } });
      sessao.entrar(token, usuario);
      location.hash = '#/';
    },
  },
};
