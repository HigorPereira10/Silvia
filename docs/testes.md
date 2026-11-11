# Testes

Os testes usam o executor nativo do Node (`node:test`) e o `supertest` para chamar a API sem abrir porta. Cada teste de integração cria um **banco em memória** já populado, então os testes são independentes entre si e não tocam no banco real.

```bash
npm test                 # 70 testes
npm run test:cobertura   # com relatório de cobertura
```

## O que é testado

| Arquivo | Tipo | Cobre |
|---|---|---|
| `tests/unit/regras.test.js` | Unitário | Fórmulas de sol, saúde, crescimento, decaimento, galho seco, pontos e árvores |
| `tests/unit/integracoes.test.js` | Unitário | ViaCEP (encontrado, inexistente, fora do ar), roteamento do gateway, agendador |
| `tests/integration/auth.test.js` | Integração | Login, erros 400/401/404/422, rotas públicas, OpenAPI |
| `tests/integration/acoes.test.js` | Integração | Evidência obrigatória, formato de arquivo, aprovação e recompensa, 409, recusa, permissões, download, requisitos de fornecedor |
| `tests/integration/fluxos.test.js` | Integração | NCs (fluxo e transições inválidas), treinamentos (ordem, gabarito, pontuação única), medições, plantio com ViaCEP, painel, relatório, CSV, ciclo diário e férias |
| `tests/integration/tempoReal.test.js` | Integração | WebSocket real: eventos ao vivo, destino por usuário, público sem feed interno, token inválido |

## Dublês

`tests/helpers/ambiente.js` fornece:

- **ViaCEP falso**: `00000-000` não existe, `99999-999` simula serviço fora do ar, qualquer outro CEP é encontrado.
- **Sorteio previsível** (`aleatorio`), para o ciclo diário não gerar galhos secos ao acaso.

## Teste manual da interface

Roteiro sugerido (o mesmo do protótipo):

1. Entre como **Higor**, clique em **Regar**, escolha uma ação e use **Usar imagem de exemplo**. Envie.
2. Em outra janela (anônima), entre como **Marina** e veja a evidência chegar ao vivo na aba **Validação**. Aprove.
3. Volte ao Higor: a muda recebe chuva, água e crescimento sem recarregar a página.
4. Como Higor, use **Podar**; como Marina, aceite e depois feche a NC.
5. Faça um treinamento como Higor.
6. Como Marina, lance uma medição em **Metas e medições** e veja o sol mudar.
7. No **Painel**, clique em **Rodar o ciclo diário agora** e veja as plantas perderem água.
8. Abra `#/publico` em outra aba e registre um plantio como Marina: a floresta cresce ao vivo.
