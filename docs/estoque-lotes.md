# Estoque por lotes

Cada entrada cria um lote separado em `materiais/{id}/lotes/{loteId}`. O saldo total continua em `estoque`. O lote registra código gerado, data de entrada, validade, quantidade inicial, saldo, justificativa e responsável.

Categorias com nome contendo “alimentação”, “gêneros” ou “merenda”, ou com `exigeValidade: true`, exigem validade nas novas entradas. Os demais materiais também são separados por entrada, com validade opcional.

Saídas usam primeiro o menor vencimento (FEFO) e, em empate, a entrada mais antiga. Datas de hoje ainda são válidas. Lotes vencidos não são usados. Alimentos sem validade não são usados até a regularização em “Ver lotes”.

O saldo antigo é preservado em um lote “Estoque anterior”, sem inventar validade ou reconstruir os lotes de entradas antigas. A preparação desse lote ocorre em uma transação por material, quando ele é consultado ou movimentado. Não é necessário migrar todo o banco antes da publicação. Romaneios anteriores sem identificação de lote devolvem os itens ao lote “Estoque anterior”.

Romaneios novos e históricos de saída guardam os lotes efetivamente utilizados. Cancelamentos e exclusões devolvem cada quantidade ao lote de origem. Uma entrada que já teve parte consumida não pode ser excluída, mesmo que outro lote tenha saldo suficiente. Entradas, baixas e devoluções usam atualizações multipath para gravar os saldos e históricos juntos.

## Publicação

Antes de publicar o código, atualizar as regras do Realtime Database com `database.rules.json`. A validação de `materiais/$materialId/lotes/$loteId` impede saldo negativo por lote e saldo acima da quantidade original. Assim, se dois usuários tentarem consumir o mesmo saldo simultaneamente, o Firebase rejeita a operação que ficaria inconsistente inteira, incluindo o romaneio. O usuário deve atualizar e tentar novamente.

As permissões existentes por categoria e perfil foram preservadas. O PR não publica regras nem altera dados de produção. Após publicar, verificar com conta autorizada: entrada de alimento, duas entradas com validades diferentes, romaneio atravessando os dois lotes, cancelamento, baixa por atendimento de solicitação e consulta em celular e nos dois temas.

## Verificações

- `npm test`: regras de vencimento, FEFO, migração idempotente, baixa em vários lotes, devolução ao mesmo lote, datas locais, exclusão de entrada consumida e preparação das atualizações Firebase.
- `scripts/testar-lotes-emulador.mjs`: executado com o emulador local do Realtime Database na porta 9109. Carrega as regras no namespace de demonstração, simula duas saídas concorrentes e verifica que apenas uma é gravada, incluindo saldos, romaneio e histórico. Verifica o estorno e a rejeição de uma segunda tentativa de cancelamento.

Para repetir: configurar o emulador de database na porta 9109 e executar `firebase emulators:exec --only database --project demo-estoque-lotes 'node scripts/testar-lotes-emulador.mjs'`. O script usa apenas localhost e um namespace de demonstração.
