# API REST e eventos WebSocket

A documentação completa e interativa está no **Swagger**: rode `npm start` e abra http://localhost:3000/api/docs. A especificação está em `src/docs/openapi.yaml`.

- Base: `/api/v1`
- Formato: JSON (exceto o upload de evidência, em `multipart/form-data`)
- Autenticação: `Authorization: Bearer <token>` obtido em `POST /auth/login`
- Erros: `{ "erro": { "codigo", "mensagem", "detalhes" } }`

## Rotas

Legenda de perfil: **P** público · **L** qualquer usuário logado · **C** colaborador · **F** fornecedor · **G** gestora.

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/saude` | P | Verifica se o serviço está no ar |
| GET | `/catalogo` | P | Listas dos formulários e parâmetros do jogo |
| GET | `/publico/floresta` | P | Floresta real e indicadores públicos |
| POST | `/auth/login` | P | Login, devolve JWT |
| GET | `/auth/contas-demo` | P | Contas de demonstração |
| GET | `/eu` | L | Usuário, planta e avisos não lidos |
| PATCH | `/eu/ferias` | C F | Liga/desliga férias |
| GET | `/eu/notificacoes` | L | Avisos |
| PATCH | `/eu/notificacoes/lidas` | L | Marca avisos como lidos |
| GET | `/feed` | L | Feed "Acontecendo agora" |
| GET | `/setores` | L | Setores com metas e sol |
| GET | `/setores/{id}` | L | Detalhe do setor |
| GET | `/setores/{id}/canteiro` | L | Plantas do setor |
| GET | `/setores/{id}/medicoes` | L | Histórico de medições |
| POST | `/setores/{id}/medicoes` | G | Lança a medição do mês |
| GET | `/fornecedores` | G | Fornecedores e requisitos |
| GET | `/fornecedores/canteiro` | L | Plantas dos fornecedores |
| GET | `/acoes/categorias` | L | Ações que o usuário pode registrar |
| POST | `/acoes` | C F | Registra ação com evidência (multipart) |
| GET | `/acoes/minhas` | L | Histórico de ações do usuário |
| GET | `/acoes?status=pendente` | G | Fila de validação |
| GET | `/acoes/decididas` | G | Últimas decisões |
| GET | `/acoes/{id}/evidencia` | autor ou G | Arquivo da evidência |
| PATCH | `/acoes/{id}/avaliacao` | G | Aprova ou recusa |
| POST | `/ncs` | C F | Reporta desperdício |
| GET | `/ncs` | L | NCs (gestora: todas; demais: as suas) |
| PATCH | `/ncs/{id}` | G | Aceitar, fechar ou improcedente |
| GET | `/treinamentos` | L | Módulos e status |
| POST | `/treinamentos/{id}/tentativas` | C | Inicia tentativa (sem gabarito) |
| POST | `/tentativas/{id}/respostas` | C | Responde e recebe a correção |
| GET | `/plantios` | L | Plantios agendados e realizados |
| PATCH | `/plantios/{id}` | G | Registra plantio (consulta o ViaCEP) |
| GET | `/indicadores/painel` | G | KPIs ISO 14031, alertas, ranking, energia |
| GET | `/relatorios/analise-critica` | G | Relatório 9.3 (`?formato=html` para baixar) |
| GET | `/auditoria` | G | Trilha de auditoria (`?formato=csv` para baixar) |
| POST | `/admin/ciclo-diario` | G | Roda o ciclo diário agora |

## Exemplos

Login:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"higor@silvia.local","senha":"silvia123"}'
```

Registrar uma ação com foto:

```bash
curl -X POST http://localhost:3000/api/v1/acoes \
  -H "Authorization: Bearer $TOKEN" \
  -F "categoria=Vim de carona, bike ou transporte público" \
  -F "descricao=Fui de bike" \
  -F "evidencia=@bicicletario.jpg"
```

Aprovar (gestora):

```bash
curl -X PATCH http://localhost:3000/api/v1/acoes/5/avaliacao \
  -H "Authorization: Bearer $TOKEN_GESTORA" \
  -H "Content-Type: application/json" \
  -d '{"decisao":"aprovar"}'
```

## WebSocket `/tempo-real`

Conecte em `ws://localhost:3000/tempo-real?token=<jwt>`. Sem token, a conexão é pública. Cada mensagem tem o formato:

```json
{ "evento": "planta.atualizada", "dados": { ... }, "em": "2026-11-10T21:05:00.000Z" }
```

| Evento | Quem recebe | Quando |
|---|---|---|
| `conectado` | quem conectou | Logo após conectar |
| `feed.novo` | logados | Novo item no feed |
| `planta.atualizada` | logados | Planta ganhou recompensa ou mudou férias |
| `notificacao.nova` | só o destinatário | Novo aviso pessoal |
| `validacao.nova` | gestora | Nova evidência para validar |
| `validacao.decidida` | logados | Evidência aprovada ou recusada |
| `nc.atualizada` | gestora (nova) / logados (tratada) | NC aberta ou movida no fluxo |
| `setor.atualizado` | logados | Nova medição mudou o sol |
| `plantio.agendado` | logados | Setor completou 1.000 pontos |
| `floresta.atualizada` | **todos**, inclusive público | Árvore real registrada |
| `canteiro.atualizado` | logados | Ciclo diário executado |

Token inválido fecha a conexão com o código `4001`.

## Web service externo consumido: ViaCEP

`GET https://viacep.com.br/ws/{cep}/json/`, chamado pelo servidor em `PATCH /plantios/{id}`:

- CEP com formato inválido → 400 (antes de chamar o serviço externo).
- CEP inexistente (`{"erro": true}`) → 422 `cep_nao_encontrado`.
- Serviço fora do ar ou lento (limite de 4 s) → o plantio é registrado com `enderecoVerificado: false` e um aviso.
