# Regras de negócio e ISO 14001

O princípio que sustenta o projeto: **nenhuma ação do jogo existe sozinha.** Cada clique corresponde a uma ação ambiental real, com comprovação, ligada a um requisito da ISO 14001. Sem isso, o sistema seria só um jogo com tema verde.

Todos os números abaixo ficam em `src/domain/constantes.js` (`REGRAS`) e as fórmulas em `src/domain/regras.js`, cobertas por testes unitários.

## Mapeamento jogo → norma

| No jogo | Na vida real | Requisito |
|---|---|---|
| Regar | Registrar uma ação do dia a dia com evidência (carona, desligar equipamentos, descarte correto, impressão evitada) | 8.1 controle operacional · 7.5 informação documentada |
| Adubar | Concluir microtreinamento sobre a política e os aspectos ambientais | 7.2 competência · 7.3 conscientização |
| Podar | Reportar desperdício; vira não conformidade com responsável e ação corretiva | 10.2 não conformidade e ação corretiva |
| Sol | Meta do setor medida com dado real (kWh, folhas, % reciclável) | 6.1.2 aspectos · 6.2 objetivos · 9.1 medição |
| Murchar | Sem ações ou com meta fora do alvo, a saúde cai e todos são avisados | 9.1 avaliação · 10.3 melhoria contínua |
| Árvore real | A cada 1.000 pontos do setor a empresa planta uma árvore nativa, com local e endereço verificados | 7.4 comunicação · 4.2 partes interessadas |
| Painel da gestora | Indicadores, fila de evidências, NCs, relatório para a direção, histórico completo | 9.2 auditoria interna · 9.3 análise crítica |
| Página pública e fornecedores | Comunidade vê a floresta e os indicadores; fornecedores comprovam requisitos | 4.2 partes interessadas · 8.1 provedores externos |

## Indicadores (ISO 14031)

| Categoria | Indicador no painel |
|---|---|
| IDG (desempenho de gestão) | % de colaboradores treinados; NCs fechadas / total |
| IDO (desempenho operacional) | kWh no mês; folhas impressas; % médio de reciclável |
| ICA (condição ambiental) | árvores nativas plantadas |

## Fórmulas

**Atingimento de cada meta** (0 a 100):

- Energia: `redução% = (base − atual) / base × 100`; atingimento = `min(1, max(0, redução% / meta%)) × 100`
- Papel: igual à energia, com a meta de papel.
- Reciclável: `min(1, atual% / meta%) × 100`

**Sol do setor** = média dos três atingimentos. Sem medição, vale a linha de base (sol 0).

**Sol do fornecedor** = % de requisitos ambientais atendidos.

**Saúde da planta** = `0,4 × água + 0,3 × adubo + 0,3 × sol − (8 se houver galho seco)`, limitada a 0–100. Abaixo de **40** a planta está **murcha**.

Exemplo (Higor no início): água 40, adubo 55, sol 89, galho seco → `16 + 16,5 + 26,7 − 8 = 51`.

## Recompensas

| Evento | Água | Adubo | Crescimento (XP) | Pontos do setor |
|---|---|---|---|---|
| Ação aprovada (colaborador) | +30 | — | +14 | +14 |
| Ação aprovada (fornecedor) | +30 | +15 | +14 | — |
| Treinamento, por acerto (só 1ª vez) | — | +12 | +6 | +4 |
| NC aceita pela gestora | — | — | +10 | +12 (colaborador) |
| Reportar desperdício | remove o galho seco na hora | | | |

Ação **recusada** não dá nada; o autor recebe o motivo.

## Crescimento

| Estágio | XP para evoluir |
|---|---|
| 0 Semente | 60 |
| 1 Broto | 100 |
| 2 Muda | 140 |
| 3 Arbusto | 180 |
| 4 Árvore | (máximo) |

O XP que sobra passa para o próximo estágio; uma recompensa grande pode subir mais de um estágio.

## Ciclo diário

Roda sozinho uma vez por dia (`CICLO_DIARIO_HORA`) e também pode ser disparado pela gestora para demonstração:

1. Água −12 e adubo −5 em todas as plantas, **exceto de quem marcou férias**.
2. Plantas a partir do estágio Muda têm 20% de chance de ganhar um **galho seco** (convite a procurar desperdícios).
3. Quem cruza o limite de murcha recebe um aviso, e a gestora também.

## Árvores reais

Cada vez que um setor acumula 1.000 pontos:

1. Um **plantio é agendado** com uma espécie nativa da Mata Atlântica; os colaboradores do setor e a gestora são avisados.
2. A gestora registra o plantio com local e **CEP**; o servidor consulta o **ViaCEP** para completar o endereço.
3. A árvore aparece na **página pública** em tempo real; sua figura cresce conforme a idade (muda até 30 dias, arbusto até 4 meses).

## Regras anti-trapaça

- Ação sem evidência não é aceita (422); sem aprovação, não há pontos.
- Cada evidência é avaliada uma única vez (409 na segunda tentativa).
- Treinamento só pontua na primeira conclusão; as respostas são corrigidas uma a uma, em ordem, e o gabarito nunca é enviado antes da resposta.
- Uma NC só pode ser fechada depois de aceita e com a eficácia verificada.
- Tudo fica na trilha de auditoria.
