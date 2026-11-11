/**
 * @file Popula o banco com os dados de demonstração.
 *
 * - `popularSeVazio(db)`: usado ao subir o servidor; só insere se não houver setores.
 * - `npm run db:seed`: apaga o banco configurado e recria tudo do zero.
 *
 * Todas as contas usam a senha "silvia123".
 */
import bcrypt from 'bcryptjs';
import { existsSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { abrirBanco, transacao } from './conexao.js';
import { migrar } from './migrar.js';
import { carregarConfig } from '../config/index.js';
import { criarModels } from '../models/index.js';
import { ESPECIES_NATIVAS, XP_PARA_PROXIMO } from '../domain/constantes.js';
import { deslocarMes, diasAtras, mesDe } from '../utils/datas.js';
import { logger } from '../utils/logger.js';
import {
  ACOES_PENDENTES, COLABORADORES, FORNECEDORES, LOCAIS_HISTORICOS, MODULOS, NAO_CONFORMIDADES, SEM_TREINAMENTO, SETORES,
} from './dadosIniciais.js';

export const SENHA_DEMO = 'silvia123';

/**
 * Insere todos os dados de demonstração.
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{custoHash?: number}} [opcoes] custo do bcrypt (os testes usam um valor baixo)
 */
export function popular(db, { custoHash = 10 } = {}) {
  const m = criarModels(db);
  const senhaHash = bcrypt.hashSync(SENHA_DEMO, custoHash);
  const ids = {};
  let semente = 11;

  transacao(db, () => {
    // Setores e medições dos últimos 6 meses (da linha de base até o valor atual)
    const mesPassado = deslocarMes(mesDe(), -1);
    for (const s of SETORES) {
      m.setores.criar(s);
      for (let k = 0; k <= 5; k++) {
        const fator = k / 5;
        m.setores.salvarMedicao({
          setorId: s.id,
          mes: deslocarMes(mesPassado, k - 5),
          energiaKwh: Math.round(s.baseEnergiaKwh + (s.atual.energia - s.baseEnergiaKwh) * fator),
          papelFolhas: Math.round(s.basePapelFolhas + (s.atual.papel - s.basePapelFolhas) * fator),
          reciclavelPct: Math.round(50 + (s.atual.recic - 50) * fator),
        });
      }
    }

    // Gestora ambiental
    ids.gestor = m.usuarios.criar({ nome: 'Marina', email: 'marina@silvia.local', senhaHash, perfil: 'gestor' });

    // Colaboradores e suas plantas
    COLABORADORES.forEach(([chave, nome, setorId, estagio, agua, adubo, galhoSeco, especie], i) => {
      ids[chave] = m.usuarios.criar({ nome, email: `${chave}@silvia.local`, senhaHash, perfil: 'colaborador', setorId });
      m.plantas.criar({
        usuarioId: ids[chave],
        especie: especie ?? ESPECIES_NATIVAS[(nome.length * 5 + i) % ESPECIES_NATIVAS.length],
        estagio,
        xp: chave === 'higor' ? 64 : Math.round(XP_PARA_PROXIMO[estagio] * 0.4),
        agua,
        adubo,
        galhoSeco,
        semente: (semente += 7),
      });
    });

    // Fornecedores, requisitos e plantas
    for (const f of FORNECEDORES) {
      const fornecedorId = m.fornecedores.criar({
        nome: f.nome, ramo: f.ramo, requisitos: f.requisitos.map(([nome, atendido]) => ({ nome, atendido })),
      });
      ids[f.chave] = m.usuarios.criar({ nome: f.nome, email: `${f.chave}@silvia.local`, senhaHash, perfil: 'fornecedor', fornecedorId });
      const [estagio, agua, adubo, galhoSeco, especie] = f.planta;
      m.plantas.criar({ usuarioId: ids[f.chave], especie, estagio, xp: Math.round(XP_PARA_PROXIMO[estagio] * 0.4), agua, adubo, galhoSeco, semente: (semente += 7) });
    }

    // Treinamentos e conclusões
    for (const modulo of MODULOS) m.treinamentos.criarModulo({ ...modulo, ordem: Number(modulo.id.slice(1)) });
    COLABORADORES.forEach(([chave], i) => {
      if (SEM_TREINAMENTO.includes(chave)) return;
      const quantos = 1 + (i % 4);
      for (let j = 1; j <= quantos; j++) m.treinamentos.registrarConclusao(ids[chave], `m${j}`, 2 + ((i + j) % 2));
    });

    // Não conformidades
    NAO_CONFORMIDADES.forEach(([quem, tipo, local, status, responsavel, acaoCorretiva, dias], i) => {
      m.ncs.criar({
        codigo: `NC-${String(34 + i).padStart(3, '0')}`, tipo, local, status, reportadoPor: ids[quem],
        responsavel, acaoCorretiva, abertaEm: diasAtras(dias), fechadaEm: status === 'fechada' ? diasAtras(Math.max(0, dias - 10)) : null,
      });
    });

    // Ações pendentes de validação (sem arquivo: dados de demonstração)
    ACOES_PENDENTES.forEach(([quem, categoria, descricao, arquivo], i) => {
      m.acoes.criar({
        usuarioId: ids[quem], tipo: quem === 'embalasul' ? 'fornecedor' : 'regar', categoria, descricao,
        evidenciaNome: arquivo, criadoEm: diasAtras(1 - i * 0.1),
      });
    });

    // 37 árvores já plantadas nos últimos meses
    for (let i = 0; i < 37; i++) {
      m.plantios.criar({
        setorId: SETORES[i % SETORES.length].id,
        especie: ESPECIES_NATIVAS[(i * 5) % ESPECIES_NATIVAS.length],
        status: 'plantado',
        local: LOCAIS_HISTORICOS[i % LOCAIS_HISTORICOS.length],
        agendadoEm: diasAtras(190 - i * 5),
        plantadoEm: diasAtras(185 - i * 5),
      });
    }

    // Feed, auditoria e avisos iniciais
    m.feed.criar({ ator: 'Paula', texto: 'registrou: vim de carona, bike ou transporte público.', tipo: 'agua', criadoEm: diasAtras(1) });
    m.feed.criar({ ator: 'Financeiro', texto: 'atingiu a meta de papel: o canteiro recebeu sol.', tipo: 'marco', criadoEm: diasAtras(0.9) });
    m.feed.criar({ ator: 'Ana', texto: 'podou um galho seco: NC-041 (lixo reciclável misturado).', tipo: 'poda', criadoEm: diasAtras(0.8) });
    m.feed.criar({ ator: 'Ana', texto: 'concluiu o treinamento "Resíduos no escritório" (3/3).', tipo: 'geral', criadoEm: diasAtras(0.7) });
    m.auditoria.criar('Marina', 'Lançou medição', `Medições de ${mesPassado} dos 5 setores`, diasAtras(2));
    m.auditoria.criar('Marina', 'Aceitou e atribuiu NC-040', 'Responsável: Manutenção', diasAtras(1.5));
    m.auditoria.criar('Ana', 'Abriu NC-041', 'Lixo reciclável misturado · Refeitório', diasAtras(0.8));
    m.notificacoes.criar(ids.higor, 'Bem-vindo ao Silvia! Sua muda de Ipê-amarelo está esperando por você.');
    m.notificacoes.criar(ids.higor, 'Sua muda tem um galho seco. Reporte um desperdício para podar.');
    m.notificacoes.criar(ids.joao, 'Sua muda está com sede. Registre uma ação ambiental.');
    m.notificacoes.criar(ids.gestor, '4 evidências aguardando validação.');
  });
  return ids;
}

/**
 * Popula apenas se o banco estiver vazio.
 * @param {import('node:sqlite').DatabaseSync} db
 */
export function popularSeVazio(db) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM setores').get();
  if (n > 0) return false;
  popular(db);
  logger.info(`Banco populado com dados de demonstração (senha de todas as contas: ${SENHA_DEMO}).`);
  return true;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { arquivo } = carregarConfig().banco;
  for (const sufixo of ['', '-wal', '-shm']) if (existsSync(arquivo + sufixo)) rmSync(arquivo + sufixo);
  const db = abrirBanco(arquivo);
  migrar(db);
  popular(db);
  logger.info(`Banco recriado em ${arquivo}. Senha de todas as contas: ${SENHA_DEMO}`);
  db.close();
}
