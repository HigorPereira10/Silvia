# Banco de dados

SQLite (módulo nativo `node:sqlite` do Node 22). O esquema está em `src/database/migracoes/001_esquema_inicial.sql` e é aplicado por `src/database/migrar.js`, que registra cada migração na tabela `_migracoes`.

Regras de integridade ficam no próprio banco: chaves estrangeiras ligadas, `CHECK` em status, faixas (0–100, estágio 0–4) e formato de mês (`AAAA-MM`), e `UNIQUE` onde há unicidade (uma medição por setor e mês, uma planta por usuário, código de NC).

## Modelo entidade-relacionamento

```mermaid
erDiagram
  SETORES ||--o{ USUARIOS : "tem colaboradores"
  SETORES ||--o{ MEDICOES : "recebe"
  SETORES ||--o{ PLANTIOS : "conquista"
  FORNECEDORES ||--o{ USUARIOS : "tem login"
  FORNECEDORES ||--o{ REQUISITOS_FORNECEDOR : "deve cumprir"
  USUARIOS ||--|| PLANTAS : "cuida de"
  USUARIOS ||--o{ ACOES : "registra"
  USUARIOS ||--o{ NAO_CONFORMIDADES : "reporta"
  USUARIOS ||--o{ NOTIFICACOES : "recebe"
  USUARIOS ||--o{ TENTATIVAS_TREINAMENTO : "faz"
  USUARIOS ||--o{ CONCLUSOES_TREINAMENTO : "conclui"
  MODULOS_TREINAMENTO ||--o{ PERGUNTAS : "contém"
  MODULOS_TREINAMENTO ||--o{ TENTATIVAS_TREINAMENTO : ""
  REQUISITOS_FORNECEDOR ||--o{ ACOES : "comprovado por"

  SETORES { text id PK  text nome  int pontos  real base_energia_kwh  real base_papel_folhas  real meta_energia_pct  real meta_papel_pct  real meta_reciclavel_pct }
  USUARIOS { int id PK  text nome  text email UK  text senha_hash  text perfil  text setor_id FK  int fornecedor_id FK  int ferias }
  PLANTAS { int id PK  int usuario_id FK  text especie  int estagio  int xp  int agua  int adubo  int galho_seco  int semente }
  MEDICOES { int id PK  text setor_id FK  text mes  real energia_kwh  real papel_folhas  real reciclavel_pct }
  ACOES { int id PK  int usuario_id FK  text tipo  text categoria  text evidencia_nome  text evidencia_arquivo  text status  text motivo  int pontos }
  NAO_CONFORMIDADES { int id PK  text codigo UK  text tipo  text local  text status  text responsavel  text acao_corretiva }
  PLANTIOS { int id PK  text setor_id FK  text especie  text status  text local  text cep  text endereco  int endereco_verificado }
```

Tabelas auxiliares: `feed` (itens do "Acontecendo agora"), `auditoria` (trilha 9.2) e `notificacoes`.

## Tabelas e requisitos da norma

| Tabela | Para que serve | ISO 14001 |
|---|---|---|
| `setores`, `medicoes` | Linha de base, metas e medições mensais | 6.2, 9.1 |
| `acoes` | Ações ambientais com evidência e decisão | 8.1, 7.5 |
| `nao_conformidades` | Desperdícios e ações corretivas | 10.2 |
| `modulos_treinamento`, `perguntas`, `tentativas_treinamento`, `conclusoes_treinamento` | Treinamentos | 7.2, 7.3 |
| `plantios` | Árvores reais | 7.4 |
| `fornecedores`, `requisitos_fornecedor` | Requisitos para provedores externos | 8.1 |
| `auditoria` | Rastreabilidade de tudo que muda | 9.2 |

## Comandos

```bash
npm run db:migrar   # aplica migrações pendentes no banco configurado
npm run db:seed     # apaga e recria o banco com dados de demonstração
```

Para mudar o esquema, crie um novo arquivo `002_descricao.sql` em `src/database/migracoes/`. Nunca edite uma migração já aplicada.
