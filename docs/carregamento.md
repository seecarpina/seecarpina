# Componente de carregamento

O componente compartilhado está em `src/js/componentes/carregamento.js`, sem dependência de Firebase, e o visual em `src/css/carregamento.css`, importado pelo CSS principal. As páginas do portal carregam o script com `defer`. Elementos inseridos depois, por tabelas ou pelo template do menu, são reconhecidos automaticamente.

Indicador simples:

```html
<see-spinner></see-spinner>
```

Com mensagem e tamanho opcional:

```html
<see-spinner mensagem="Carregando materiais…" tamanho="grande"></see-spinner>
```

Tamanhos: padrão 32px, `pequeno` 20px e `grande` 48px. O elemento informa o estado de carregamento aos leitores de tela e usa as variáveis de cor do sistema. A animação respeita a preferência por movimento reduzido.

A tela inicial `.loading` aguarda o evento `load` e as áreas declaradas em `data-aguardar`, com saída de 180ms e remoção da interação. Sem áreas declaradas, mantém o encerramento no `load`. Na home, aguarda usuário/menu, painel lateral, links úteis, frase, datas comemorativas, calendário, gráficos e atendimento.

```html
<div class="loading" data-aguardar="links oficios">
  <see-spinner mensagem="Carregando o sistema" tamanho="grande"></see-spinner>
</div>
```

Os módulos importam `concluirCarregamento` de `src/js/core/carregamentoPagina.js` e chamam `concluirCarregamento("links")` **depois de renderizar a primeira resposta ou o erro**. Áreas sem permissão também concluem sua espera. Não se espera uma assinatura em tempo real terminar: as próximas atualizações continuam funcionando normalmente e não reabrem a tela. Conclusões anteriores à inicialização do componente são preservadas.

Um limite de 30 segundos libera a interface caso um serviço não responda ou um módulo não consiga iniciar. Ele é uma proteção, não um tempo artificial de espera. Cada módulo continua responsável por seu indicador local e por exibir erros.

A mudança abrange o portal da secretaria, que utiliza o CSS e scripts compartilhados. O portal dos gestores tem estrutura própria e não usava esse SVG.
