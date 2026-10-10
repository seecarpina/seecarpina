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

A tela inicial `.loading` é encerrada ao evento `load`, com saída de 180ms e remoção da interação. O script também funciona quando iniciado depois que a página já carregou. O encerramento da tela inicial não espera consultas do Firebase. Cada módulo continua controlando seus próprios dados; os cards de gráficos mostram o indicador até seus dados ficarem prontos, os cards de Atendimento às escolas substituem o indicador pelos totais após carregar todos os módulos permitidos, e os links úteis também usam um indicador local. Falhas exibem uma mensagem e encerram os indicadores; a área de atendimento é ocultada para usuários sem permissão.

A mudança abrange o portal da secretaria, que utiliza o CSS e scripts compartilhados. O portal dos gestores tem estrutura própria e não usava esse SVG.

As tabelas de ofícios, circulares, contratos/ARPs, servidores e DFDs mostram o componente na primeira pintura e mantêm o estado pendente durante alterações de filtros. Servidores só apresenta uma lista vazia após a consulta dos registros responder; atualizações de locais de exercício não encerram a espera. Erros de consulta têm mensagem própria e não são interpretados como resultado vazio. Respostas vazias também limpam os registros anteriores.

Botões de salvar e de desligar servidor usam `tamanho="pequeno"`, com os mesmos bloqueios e restauração em `finally`. Os demais estados de lista (usuários, eventos, categorias administrativas, movimentações, solicitações e lotes) também usam o componente. Textos de carregamento dentro de opções de `select` continuam sendo texto, pois esses elementos não aceitam o indicador.
