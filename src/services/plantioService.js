/**
 * @file Serviço de pontos dos setores e plantio de árvores reais.
 *
 * Cada 1.000 pontos de um setor agendam o plantio de uma árvore nativa. A
 * gestora registra o plantio com local e CEP; o endereço é completado pelo
 * web service externo ViaCEP.
 */
import { ESPECIES_NATIVAS, LOCAIS_PLANTIO } from '../domain/constantes.js';
import { somarPontosSetor } from '../domain/regras.js';
import { formatarEndereco, normalizarCep } from '../integrations/viacep.js';
import { conflito, entidadeInvalida, naoEncontrado, requisicaoInvalida } from '../utils/erros.js';
import { transacao } from '../database/conexao.js';

/**
 * @param {{db: import('node:sqlite').DatabaseSync, models: import('../models/index.js').Models,
 *   registro: ReturnType<typeof import('./registroService.js').criarRegistroService>,
 *   eventos: ReturnType<typeof import('../realtime/eventos.js').criarBarramentoEventos>,
 *   viacep: ReturnType<typeof import('../integrations/viacep.js').criarClienteViaCep>,
 *   aleatorio: () => number}} deps
 */
export function criarPlantioService({ db, models, registro, eventos, viacep, aleatorio }) {
  /** Agenda o plantio de uma árvore para o setor. */
  function agendar(setorId) {
    const setor = models.setores.buscar(setorId);
    const especie = ESPECIES_NATIVAS[Math.floor(aleatorio() * ESPECIES_NATIVAS.length)];
    const id = models.plantios.criar({ setorId, especie });
    registro.feed(setor.nome, `completou 1.000 pontos. Plantio de um ${especie} agendado.`, 'marco');
    for (const u of models.usuarios.listarPorSetor(setorId)) {
      registro.notificar(u.id, `Seu setor completou 1.000 pontos! A empresa vai plantar um ${especie}.`);
    }
    registro.notificarGestores(`Plantio agendado para o ${setor.nome}. Registre quando a árvore for plantada.`);
    registro.auditar('Sistema', 'Agendou plantio', `${especie} · ${setor.nome}`);
    eventos.emitir('plantio.agendado', models.plantios.buscar(id), 'autenticados');
    return id;
  }

  return {
    /**
     * Soma pontos ao setor e agenda as árvores conquistadas.
     * @returns {{pontos: number, arvoresAgendadas: number}}
     */
    adicionarPontos(setorId, pontos) {
      const setor = models.setores.buscar(setorId);
      if (!setor || pontos <= 0) return { pontos: setor?.pontos ?? 0, arvoresAgendadas: 0 };
      const resultado = somarPontosSetor(setor.pontos, pontos);
      models.setores.definirPontos(setorId, resultado.pontos);
      for (let i = 0; i < resultado.arvores; i++) agendar(setorId);
      return { pontos: resultado.pontos, arvoresAgendadas: resultado.arvores };
    },

    /** @param {{status?: 'agendado'|'plantado'}} filtro */
    listar(filtro = {}) {
      return models.plantios.listar(filtro);
    },

    locais: () => LOCAIS_PLANTIO,

    /**
     * Registra que a árvore foi plantada. Consulta o ViaCEP para completar o endereço;
     * se o serviço externo estiver fora do ar, registra mesmo assim, sem verificação.
     * @param {{id: number, nome: string}} gestor
     * @param {number} id
     * @param {{local: string, cep: string}} dados
     */
    async registrar(gestor, id, { local, cep }) {
      const plantio = models.plantios.buscar(id);
      if (!plantio) throw naoEncontrado('Plantio não encontrado.');
      if (plantio.status !== 'agendado') throw conflito('Este plantio já foi registrado.');
      const cepLimpo = normalizarCep(cep);
      if (!cepLimpo) throw requisicaoInvalida('Informe um CEP com 8 dígitos.', { campo: 'cep' });

      const consulta = await viacep.consultar(cepLimpo);
      if (consulta.situacao === 'nao_encontrado') {
        throw entidadeInvalida('cep_nao_encontrado', 'O CEP informado não existe. Confira e tente de novo.', { campo: 'cep' });
      }
      const endereco = consulta.situacao === 'encontrado' ? formatarEndereco(consulta.endereco) : null;

      transacao(db, () => {
        models.plantios.registrarPlantio(id, {
          local, cep: cepLimpo, endereco, enderecoVerificado: Boolean(endereco), registradoPor: gestor.id,
        });
        const total = models.plantios.contar('plantado');
        registro.feed(null, `Árvore real nº ${total} plantada: ${plantio.especie} em ${local}.`, 'marco');
        for (const u of models.usuarios.listarPorSetor(plantio.setorId)) {
          registro.notificar(u.id, `A árvore do seu setor foi plantada: ${plantio.especie} em ${local}.`);
        }
        registro.auditar(gestor.nome, 'Registrou plantio', `${plantio.especie} · ${local} · CEP ${cepLimpo}${endereco ? '' : ' (endereço não verificado)'}`);
      });
      const atualizado = models.plantios.buscar(id);
      eventos.emitir('floresta.atualizada', { arvores: models.plantios.contar('plantado'), plantio: atualizado }, 'todos');
      return { plantio: atualizado, enderecoVerificado: Boolean(endereco), avisoCep: endereco ? null : 'O serviço de CEP não respondeu; o endereço ficou sem verificação.' };
    },
  };
}
