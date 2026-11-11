/**
 * @file Dados de demonstração (fictícios), espelhando o protótipo aprovado pelo grupo.
 */

/** Setores com linha de base e a medição do mês anterior ("atual"). */
export const SETORES = [
  { id: 'fin', nome: 'Financeiro', pontos: 930, baseEnergiaKwh: 4200, basePapelFolhas: 9000, atual: { energia: 3870, papel: 7020, recic: 61 } },
  { id: 'ti', nome: 'TI', pontos: 820, baseEnergiaKwh: 6800, basePapelFolhas: 3000, atual: { energia: 6050, papel: 2700, recic: 74 } },
  { id: 'rh', nome: 'RH', pontos: 640, baseEnergiaKwh: 2600, basePapelFolhas: 6000, atual: { energia: 2510, papel: 4800, recic: 58 } },
  { id: 'ops', nome: 'Operações', pontos: 510, baseEnergiaKwh: 9800, basePapelFolhas: 4000, atual: { energia: 9300, papel: 3700, recic: 66 } },
  { id: 'com', nome: 'Comercial', pontos: 380, baseEnergiaKwh: 3600, basePapelFolhas: 8000, atual: { energia: 3500, papel: 7400, recic: 48 } },
];

/** Colaboradores: [chave, nome, setor, estágio, água, adubo, galho seco, espécie?] */
export const COLABORADORES = [
  ['higor', 'Higor', 'fin', 2, 40, 55, true, 'Ipê-amarelo'],
  ['breno', 'Breno', 'fin', 3, 80, 70, false],
  ['joao', 'João', 'fin', 2, 30, 45, true],
  ['ana', 'Ana', 'fin', 4, 90, 85, false],
  ['carlos', 'Carlos', 'fin', 1, 20, 30, false],
  ['julia', 'Júlia', 'fin', 3, 60, 55, false],
  ['marcos', 'Marcos', 'fin', 0, 75, 60, false],
  ['paula', 'Paula', 'fin', 4, 55, 40, false],
  ['diego', 'Diego', 'ti', 3, 70, 65, false],
  ['fernanda', 'Fernanda', 'ti', 2, 85, 50, false],
  ['lucas', 'Lucas', 'ti', 4, 60, 80, false],
  ['bianca', 'Bianca', 'ti', 1, 45, 35, false],
  ['rafael', 'Rafael', 'ti', 2, 50, 60, false],
  ['camila', 'Camila', 'rh', 3, 65, 75, false],
  ['pedro', 'Pedro', 'rh', 1, 35, 40, false],
  ['larissa', 'Larissa', 'rh', 2, 70, 55, false],
  ['thiago', 'Thiago', 'rh', 4, 80, 70, false],
  ['gustavo', 'Gustavo', 'ops', 2, 40, 45, false],
  ['renata', 'Renata', 'ops', 3, 75, 60, false],
  ['felipe', 'Felipe', 'ops', 1, 30, 25, false],
  ['aline', 'Aline', 'ops', 0, 55, 40, false],
  ['sergio', 'Sérgio', 'ops', 2, 60, 50, false],
  ['beatriz', 'Beatriz', 'com', 2, 50, 45, false],
  ['eduardo', 'Eduardo', 'com', 1, 25, 30, false],
  ['natalia', 'Natália', 'com', 3, 70, 65, false],
  ['vinicius', 'Vinícius', 'com', 0, 40, 20, false],
];

/** Quem não fez nenhum treinamento ainda. */
export const SEM_TREINAMENTO = ['higor', 'joao', 'carlos', 'aline', 'vinicius'];

export const FORNECEDORES = [
  {
    chave: 'embalasul', nome: 'EmbalaSul', ramo: 'Embalagens', planta: [2, 60, 50, false, 'Jatobá'],
    requisitos: [['Licença ambiental válida', true], ['Plano de gerenciamento de resíduos', true], ['Inventário de emissões (GEE)', false]],
  },
  {
    chave: 'translog', nome: 'TransLog', ramo: 'Transporte', planta: [1, 35, 40, true, 'Aroeira-pimenteira'],
    requisitos: [['Licença ambiental válida', true], ['Plano de manutenção da frota', false], ['Inventário de emissões (GEE)', false]],
  },
  {
    chave: 'graobom', nome: 'Café Grão Bom', ramo: 'Café e copa', planta: [3, 80, 70, false, 'Cambuci'],
    requisitos: [['Licença ambiental válida', true], ['Plano de gerenciamento de resíduos', true], ['Embalagem compostável', true]],
  },
];

/** Módulos de treinamento com perguntas, opções, gabarito e explicação. */
export const MODULOS = [
  {
    id: 'm1', nome: 'Política ambiental e PDCA', descricao: 'Para que serve o SGA e como funciona a melhoria contínua.',
    perguntas: [
      { enunciado: 'Qual ciclo estrutura a melhoria contínua na ISO 14001?', opcoes: ['PDCA: planejar, fazer, checar e agir', 'Análise SWOT', 'Quadro Kanban'], correta: 0, explicacao: 'A norma é organizada no ciclo PDCA.' },
      { enunciado: 'Quem deve demonstrar liderança e comprometimento com o SGA?', opcoes: ['Somente o setor de qualidade', 'A alta direção', 'Apenas consultores externos'], correta: 1, explicacao: 'A cláusula 5.1 cobra liderança e comprometimento da alta direção.' },
      { enunciado: 'A política ambiental da empresa deve ser:', opcoes: ['Mantida em sigilo pela diretoria', 'Revisada só quando houver multa', 'Comunicada dentro da empresa e disponível às partes interessadas'], correta: 2, explicacao: 'A cláusula 5.2 pede que a política seja comunicada e esteja disponível às partes interessadas.' },
    ],
  },
  {
    id: 'm2', nome: 'Aspectos e impactos', descricao: 'A diferença entre a causa e a consequência ambiental.',
    perguntas: [
      { enunciado: 'O que é um aspecto ambiental?', opcoes: ['Elemento das atividades que interage ou pode interagir com o meio ambiente', 'Uma multa ambiental', 'O relatório anual de sustentabilidade'], correta: 0, explicacao: 'Aspecto é a causa (ex.: consumo de energia). Impacto é a consequência.' },
      { enunciado: 'O consumo de energia elétrica é um aspecto. Qual é um impacto ligado a ele?', opcoes: ['Aumento do número de funcionários', 'Uso de recursos naturais e emissões na geração de energia', 'Redução do faturamento'], correta: 1, explicacao: 'Gerar energia consome recursos naturais e pode emitir gases de efeito estufa.' },
      { enunciado: 'Luz acesa em sala vazia durante a noite é:', opcoes: ['Um impacto ambiental positivo', 'Um requisito legal', 'Desperdício ligado ao aspecto consumo de energia'], correta: 2, explicacao: 'É desperdício de energia. No Silvia, dá para reportar com Podar.' },
    ],
  },
  {
    id: 'm3', nome: 'Resíduos no escritório', descricao: 'Separação, descarte correto e logística reversa.',
    perguntas: [
      { enunciado: 'Pilhas e baterias usadas devem ir para:', opcoes: ['Pontos de coleta específicos (logística reversa)', 'O lixo comum', 'O coletor de papel'], correta: 0, explicacao: 'Pilhas e baterias têm logística reversa obrigatória pela Política Nacional de Resíduos Sólidos.' },
      { enunciado: 'Guardanapo de papel sujo de gordura normalmente vai para:', opcoes: ['O coletor de papel reciclável', 'O rejeito (lixo comum)', 'A coleta de eletrônicos'], correta: 1, explicacao: 'Papel engordurado contamina a reciclagem e vai para o rejeito.' },
      { enunciado: 'Qual é a ordem de prioridade na gestão de resíduos?', opcoes: ['Reciclar primeiro, depois reduzir', 'Jogar tudo no mesmo coletor e separar depois', 'Não gerar, reduzir, reutilizar, reciclar, tratar e dispor'], correta: 2, explicacao: 'É a ordem definida pela Lei 12.305/2010 (PNRS).' },
    ],
  },
  {
    id: 'm4', nome: 'Não conformidade e ação corretiva', descricao: 'O que acontece depois que alguém reporta um problema.',
    perguntas: [
      { enunciado: 'Ao identificar uma não conformidade, a empresa deve:', opcoes: ['Reagir, corrigir e avaliar a ação para eliminar a causa', 'Esperar a próxima auditoria externa', 'Registrar só se gerar multa'], correta: 0, explicacao: 'É o que pede a cláusula 10.2.' },
      { enunciado: 'Uma ação corretiva serve para:', opcoes: ['Punir quem reportou', 'Eliminar a causa para que o problema não se repita', 'Esconder o problema do auditor'], correta: 1, explicacao: 'O foco da ação corretiva é a causa, não a pessoa.' },
      { enunciado: 'Quem pode reportar um desperdício no Silvia?', opcoes: ['Só a gestora ambiental', 'Só a diretoria', 'Qualquer colaborador ou fornecedor'], correta: 2, explicacao: 'Todo mundo pode podar: quanto mais olhos, menos desperdício.' },
    ],
  },
];

/** Não conformidades: [reportado por, tipo, local, status, responsável, ação corretiva, dias atrás] */
export const NAO_CONFORMIDADES = [
  ['diego', 'Luz ou ar-condicionado ligado sem uso', 'Sala de reunião 3', 'fechada', 'Facilities', 'Sensor de presença instalado', 30],
  ['julia', 'Impressões abandonadas na impressora', 'Impressora do 3º andar', 'fechada', 'TI', 'Liberação de impressão por crachá', 20],
  ['camila', 'Vazamento de água', 'Copa do RH', 'fechada', 'Manutenção', 'Troca da válvula da pia', 45],
  ['renata', 'Equipamento ligado fora do expediente', 'Almoxarifado', 'fechada', 'TI', 'Tomadas com temporizador', 60],
  ['natalia', 'Lixo reciclável misturado', 'Recepção', 'fechada', 'Facilities', 'Coletores identificados por cor', 75],
  ['lucas', 'Luz ou ar-condicionado ligado sem uso', 'Data center (antessala)', 'fechada', 'Facilities', 'Rotina de desligamento às 19h', 90],
  ['carlos', 'Vazamento de água', 'Torneira do banheiro, 2º andar', 'em_acao', 'Manutenção', 'Trocar o reparo e incluir a torneira na inspeção semanal', 6],
  ['ana', 'Lixo reciclável misturado', 'Refeitório', 'aberta', null, null, 1],
];

/** Ações aguardando validação: [autor, categoria, descrição, nome do arquivo] */
export const ACOES_PENDENTES = [
  ['paula', 'Vim de carona, bike ou transporte público', 'Carona solidária com 3 colegas', 'foto_carona.jpg'],
  ['carlos', 'Descartei pilhas ou eletrônicos no ponto de coleta', '2 pilhas e 1 carregador', 'ponto_coleta.jpg'],
  ['diego', 'Desliguei equipamentos ao sair', '14 monitores desligados no fim do expediente', 'checklist_ti.pdf'],
  ['embalasul', 'Troca para embalagem retornável', 'Lote de outubro entregue em caixas retornáveis', 'nota_fiscal_lote_10.pdf'],
];

export const LOCAIS_HISTORICOS = [
  'Área de restauração 1 · ONG parceira',
  'Área de restauração 2 · ONG parceira',
  'Escola municipal parceira',
  'Praça comunitária do bairro',
  'Mata ciliar do córrego',
];
