/**
 * @file Esquemas de validação das entradas da API (biblioteca zod).
 *
 * Toda entrada externa é validada antes de chegar aos serviços. As mensagens
 * são escritas para o usuário final e aparecem direto na interface.
 */
import { z } from 'zod';
import {
  CATEGORIAS_DESPERDICIO, LOCAIS_PLANTIO, MOTIVOS_IMPROCEDENCIA, MOTIVOS_RECUSA, RESPONSAVEIS,
} from '../domain/constantes.js';

const id = z.coerce.number().int().positive();

export const esquemas = {
  idParam: z.object({ id }),
  setorParam: z.object({ id: z.string().min(1).max(20) }),
  moduloParam: z.object({ id: z.string().min(1).max(20) }),

  login: z.object({
    email: z.email('Informe um e-mail válido.'),
    senha: z.string().min(1, 'Informe a senha.'),
  }),

  ferias: z.object({ ferias: z.boolean() }),

  filtroStatusAcao: z.object({ status: z.enum(['pendente', 'aprovada', 'recusada']).optional() }),

  acaoCriar: z.object({
    categoria: z.string().trim().max(120).optional(),
    descricao: z.string().trim().max(120).optional(),
    requisitoId: id.optional(),
  }),

  avaliacao: z.discriminatedUnion('decisao', [
    z.object({ decisao: z.literal('aprovar') }),
    z.object({ decisao: z.literal('recusar'), motivo: z.enum(MOTIVOS_RECUSA, 'Escolha um motivo da lista.') }),
  ]),

  ncCriar: z.object({
    tipo: z.enum(CATEGORIAS_DESPERDICIO, 'Escolha um tipo de desperdício da lista.'),
    local: z.string().trim().min(3, 'Diga onde está o problema, por exemplo: copa do 3º andar.').max(80),
  }),

  filtroStatusNc: z.object({ status: z.enum(['aberta', 'em_acao', 'fechada', 'improcedente']).optional() }),

  ncTratar: z.discriminatedUnion('acao', [
    z.object({
      acao: z.literal('aceitar'),
      responsavel: z.enum(RESPONSAVEIS, 'Escolha um responsável da lista.'),
      acaoCorretiva: z.string().trim().min(5, 'Descreva a ação corretiva: o que será feito para eliminar a causa.').max(140),
    }),
    z.object({ acao: z.literal('fechar'), eficaciaVerificada: z.boolean() }),
    z.object({ acao: z.literal('improcedente'), motivo: z.enum(MOTIVOS_IMPROCEDENCIA, 'Escolha um motivo da lista.') }),
  ]),

  resposta: z.object({
    pergunta: z.number().int().min(0),
    opcao: z.number().int().min(0),
  }),

  medicao: z.object({
    mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Informe o mês no formato AAAA-MM.'),
    energiaKwh: z.number('Informe a energia em kWh.').positive('A energia deve ser maior que zero.'),
    papelFolhas: z.number('Informe as folhas impressas.').min(0, 'As folhas não podem ser negativas.'),
    reciclavelPct: z.number('Informe o percentual reciclável.').min(0).max(100, 'O reciclável deve ficar entre 0 e 100.'),
  }),

  filtroPlantio: z.object({ status: z.enum(['agendado', 'plantado']).optional() }),

  plantio: z.object({
    local: z.enum(LOCAIS_PLANTIO, 'Escolha um local da lista.'),
    cep: z.string().trim().min(8, 'Informe um CEP com 8 dígitos.').max(9),
  }),

  limite: z.object({ limite: z.coerce.number().int().min(1).max(500).optional() }),
};
