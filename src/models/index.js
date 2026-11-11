/**
 * @file Ponto único de criação dos models (camada de acesso a dados).
 */
import { criarUsuarioModel } from './usuarioModel.js';
import { criarPlantaModel } from './plantaModel.js';
import { criarSetorModel } from './setorModel.js';
import { criarAcaoModel } from './acaoModel.js';
import { criarNaoConformidadeModel } from './naoConformidadeModel.js';
import { criarTreinamentoModel } from './treinamentoModel.js';
import { criarPlantioModel } from './plantioModel.js';
import { criarFornecedorModel } from './fornecedorModel.js';
import { criarAuditoriaModel, criarFeedModel, criarNotificacaoModel } from './registroModel.js';

/**
 * @param {import('node:sqlite').DatabaseSync} db
 */
export function criarModels(db) {
  return {
    usuarios: criarUsuarioModel(db),
    plantas: criarPlantaModel(db),
    setores: criarSetorModel(db),
    acoes: criarAcaoModel(db),
    ncs: criarNaoConformidadeModel(db),
    treinamentos: criarTreinamentoModel(db),
    plantios: criarPlantioModel(db),
    fornecedores: criarFornecedorModel(db),
    notificacoes: criarNotificacaoModel(db),
    feed: criarFeedModel(db),
    auditoria: criarAuditoriaModel(db),
  };
}

/** @typedef {ReturnType<typeof criarModels>} Models */
