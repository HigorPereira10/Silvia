/**
 * @file Composição dos serviços (injeção de dependências manual).
 *
 * Cada serviço recebe explicitamente aquilo de que depende. Isso deixa as
 * dependências visíveis e permite trocar peças nos testes (ex.: ViaCEP
 * falso, sorteio previsível).
 */
import { criarModels } from '../models/index.js';
import { criarRegistroService } from './registroService.js';
import { criarPlantioService } from './plantioService.js';
import { criarPlantaService } from './plantaService.js';
import { criarAcaoService } from './acaoService.js';
import { criarNaoConformidadeService } from './naoConformidadeService.js';
import { criarTreinamentoService } from './treinamentoService.js';
import { criarSetorService } from './setorService.js';
import { criarAuthService, criarUsuarioService } from './usuarioService.js';
import { criarIndicadorService } from './indicadorService.js';
import { criarCicloDiarioService } from './cicloDiarioService.js';
import { calcularSolFornecedor } from '../domain/regras.js';

/**
 * @param {{db: import('node:sqlite').DatabaseSync, config: import('../config/index.js').Config,
 *   eventos: ReturnType<typeof import('../realtime/eventos.js').criarBarramentoEventos>,
 *   viacep: ReturnType<typeof import('../integrations/viacep.js').criarClienteViaCep>,
 *   aleatorio?: () => number}} deps
 */
export function criarServicos({ db, config, eventos, viacep, aleatorio = Math.random }) {
  const models = criarModels(db);
  const registro = criarRegistroService({ models, eventos });
  const plantios = criarPlantioService({ db, models, registro, eventos, viacep, aleatorio });
  const plantas = criarPlantaService({ models, registro, plantios, eventos });
  const setores = criarSetorService({ models, registro, plantas, eventos });

  return {
    models,
    registro,
    plantios,
    plantas,
    setores,
    auth: criarAuthService({ models, config, registro }),
    usuarios: criarUsuarioService({ models, registro, plantas, eventos }),
    acoes: criarAcaoService({ db, models, registro, plantas, eventos, pastaUploads: config.uploads.pasta }),
    ncs: criarNaoConformidadeService({ db, models, registro, plantas, eventos }),
    treinamentos: criarTreinamentoService({ db, models, registro, plantas }),
    indicadores: criarIndicadorService({ models, plantas, setores }),
    ciclo: criarCicloDiarioService({ db, models, registro, plantas, eventos, aleatorio }),
    fornecedores: {
      /** Canteiro de todos os fornecedores com o sol de cada um. */
      canteiro: () => plantas.canteiroFornecedores(),
      lista: () => models.fornecedores.listar().map((f) => {
        const requisitos = models.fornecedores.requisitos(f.id);
        return { ...f, requisitos, sol: calcularSolFornecedor(requisitos) };
      }),
    },
  };
}

/** @typedef {ReturnType<typeof criarServicos>} Servicos */
