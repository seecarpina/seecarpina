# Corrigir responsáveis antigos

Corrige somente o campo `responsavel` cujo valor seja exatamente `Raphael`, substituindo por `Raphael Silva`. Abrange todos os anos de ofícios e ofícios circulares. Não altera outros nomes, números, datas, conteúdo ou UID. O script não é executado automaticamente pelo site.

Depois de publicar este PR, entre no portal da secretaria com uma conta que tenha permissão de leitura e alteração dos ofícios. Abra o console do navegador (F12 → Console) e execute:

```js
const { corrigirResponsavelRaphael } = await import('/src/js/corrigirResponsavelRaphael.js');
await corrigirResponsavelRaphael();
```

A primeira execução mostra uma tabela e a quantidade de registros encontrados, sem gravar nada. Para aplicar:

```js
await corrigirResponsavelRaphael({ aplicar: true });
```

A correção consulta os dados novamente e usa uma transação em cada campo: se o responsável tiver mudado desde a leitura, a alteração é ignorada. A transação também não recria registros removidos. As regras existentes do Firebase continuam valendo.

Confira `alterados`, `ignorados` e `falhas` no resultado. Se houver falhas, a operação pode ter sido aplicada parcialmente; o resultado lista os caminhos com erro. É possível executar novamente: registros já corrigidos não são alterados. Faça uma última prévia para conferir se ainda há registros como `Raphael`.
