/**
 * Testes unitários das regras de negócio puras (src/domain/regras.js).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  aplicarCrescimento, aplicarDecaimento, atingimentoMetas, calcularSaude, calcularSol, calcularSolFornecedor,
  deveSurgirGalhoSeco, estagioPorIdade, estaMurcha, limitar, resumirPlanta, somarPontosSetor,
} from '../../src/domain/regras.js';

const financeiro = { baseEnergiaKwh: 4200, basePapelFolhas: 9000, metaEnergiaPct: 10, metaPapelPct: 15, metaReciclavelPct: 70 };

describe('limitar', () => {
  it('mantém o valor dentro de 0 a 100', () => {
    assert.equal(limitar(-5), 0);
    assert.equal(limitar(130), 100);
    assert.equal(limitar(42), 42);
  });
});

describe('atingimentoMetas e calcularSol', () => {
  it('calcula o atingimento de cada meta do Financeiro como no protótipo', () => {
    const a = atingimentoMetas(financeiro, { energiaKwh: 3870, papelFolhas: 7020, reciclavelPct: 61 });
    assert.ok(Math.abs(a.reducaoEnergiaPct - 7.857) < 0.01);
    assert.equal(a.reducaoPapelPct, 22);
    assert.ok(Math.abs(a.energia - 78.57) < 0.01);
    assert.equal(a.papel, 100, 'redução acima da meta conta como 100%');
    assert.equal(calcularSol(a), 89);
  });

  it('sem medição, considera a linha de base (nenhuma redução)', () => {
    const a = atingimentoMetas(financeiro, null);
    assert.equal(a.energia, 0);
    assert.equal(a.papel, 0);
    assert.equal(calcularSol(a), 0);
  });

  it('consumo acima da linha de base não gera atingimento negativo', () => {
    const a = atingimentoMetas(financeiro, { energiaKwh: 5000, papelFolhas: 9500, reciclavelPct: 10 });
    assert.equal(a.energia, 0);
    assert.ok(a.reducaoEnergiaPct < 0);
  });
});

describe('calcularSolFornecedor', () => {
  it('é a porcentagem de requisitos atendidos', () => {
    assert.equal(calcularSolFornecedor([{ atendido: true }, { atendido: true }, { atendido: false }]), 67);
    assert.equal(calcularSolFornecedor([]), 0);
  });
});

describe('calcularSaude', () => {
  it('usa 40% água + 30% adubo + 30% sol e penaliza o galho seco', () => {
    assert.equal(calcularSaude({ agua: 40, adubo: 55, galhoSeco: true }, 89), 51, 'saúde do Higor no protótipo');
    assert.equal(calcularSaude({ agua: 40, adubo: 55, galhoSeco: false }, 89), 59);
  });

  it('nunca sai do intervalo 0 a 100', () => {
    assert.equal(calcularSaude({ agua: 0, adubo: 0, galhoSeco: true }, 0), 0);
    assert.equal(calcularSaude({ agua: 100, adubo: 100, galhoSeco: false }, 100), 100);
  });

  it('considera murcha abaixo de 40', () => {
    assert.equal(estaMurcha(39), true);
    assert.equal(estaMurcha(40), false);
  });
});

describe('aplicarCrescimento', () => {
  it('soma XP sem evoluir quando não atinge o limite', () => {
    assert.deepEqual(aplicarCrescimento({ estagio: 2, xp: 64 }, 14), { estagio: 2, xp: 78, evoluiu: false });
  });

  it('evolui de estágio e carrega o XP que sobrou', () => {
    assert.deepEqual(aplicarCrescimento({ estagio: 0, xp: 50 }, 20), { estagio: 1, xp: 10, evoluiu: true });
  });

  it('pode subir mais de um estágio de uma vez', () => {
    const r = aplicarCrescimento({ estagio: 0, xp: 0 }, 170);
    assert.equal(r.estagio, 2);
    assert.equal(r.xp, 10);
  });

  it('não passa do estágio Árvore', () => {
    const r = aplicarCrescimento({ estagio: 4, xp: 170 }, 500);
    assert.equal(r.estagio, 4);
    assert.equal(r.xp, 180);
    assert.equal(r.evoluiu, false);
  });
});

describe('aplicarDecaimento', () => {
  it('tira água e adubo por dia', () => {
    assert.deepEqual(aplicarDecaimento({ agua: 40, adubo: 55 }, false), { agua: 28, adubo: 50 });
  });
  it('não deixa valores negativos', () => {
    assert.deepEqual(aplicarDecaimento({ agua: 5, adubo: 2 }, false), { agua: 0, adubo: 0 });
  });
  it('férias pausam o decaimento', () => {
    assert.deepEqual(aplicarDecaimento({ agua: 40, adubo: 55 }, true), { agua: 40, adubo: 55 });
  });
});

describe('deveSurgirGalhoSeco', () => {
  it('só surge a partir do estágio Muda e quando o sorteio cai abaixo da chance', () => {
    assert.equal(deveSurgirGalhoSeco({ estagio: 2, galhoSeco: false }, 0.1), true);
    assert.equal(deveSurgirGalhoSeco({ estagio: 2, galhoSeco: false }, 0.5), false);
    assert.equal(deveSurgirGalhoSeco({ estagio: 1, galhoSeco: false }, 0.1), false);
    assert.equal(deveSurgirGalhoSeco({ estagio: 3, galhoSeco: true }, 0.1), false);
  });
});

describe('somarPontosSetor', () => {
  it('agenda uma árvore a cada 1.000 pontos e guarda o resto', () => {
    assert.deepEqual(somarPontosSetor(930, 14), { pontos: 944, arvores: 0 });
    assert.deepEqual(somarPontosSetor(990, 14), { pontos: 4, arvores: 1 });
    assert.deepEqual(somarPontosSetor(0, 2500), { pontos: 500, arvores: 2 });
  });
});

describe('estagioPorIdade e resumirPlanta', () => {
  it('árvores reais crescem visualmente com o tempo', () => {
    assert.equal(estagioPorIdade(10), 2);
    assert.equal(estagioPorIdade(60), 3);
    assert.equal(estagioPorIdade(200), 4);
  });

  it('resume a planta com nome do estágio e XP do próximo nível', () => {
    const r = resumirPlanta({ estagio: 2, xp: 64, agua: 40, adubo: 55, galhoSeco: true }, 89);
    assert.equal(r.estagioNome, 'Muda');
    assert.equal(r.xpProximo, 140);
    assert.equal(r.saude, 51);
    assert.equal(r.murcha, false);
  });
});
