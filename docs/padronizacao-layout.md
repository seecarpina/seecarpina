# Revisão de consistência visual

Revisão da estrutura HTML e dos estilos de 28 páginas: 21 arquivos da raiz e 7 do portal de gestão escolar. Referência: a linguagem visual aprovada da secretaria, centralizada em `portal-refinado.css`.

## Divergências corrigidas

| Página/componente | Problema identificado | Ajuste |
| --- | --- | --- |
| Quadros | Variáveis `--color-*` inexistentes em botões, indicadores e divisórias; cinco indicadores com largura mínima fixa | Tokens `--clr-*` existentes; grade ajustada à largura disponível; ações adaptadas à coluna |
| Checklist | Checkbox com cores fixas claras e CSS embutido no HTML | Cores do tema e estilo em `checklist.css` |
| Eventos e tarefas | Abas com texto dependente da cor de superfície no dark; ações de exclusão e atrasos com vermelhos distintos | Abas compartilhadas, cores semânticas e tons legíveis dos rótulos de categorias no dark |
| Escolas, administração, servidores, estoque e solicitações | Abas com formatos e espaçamentos diferentes | Mesmo tamanho mínimo, tipografia, borda, arredondamento e indicação de seleção |
| Buscas de ofícios, contratos, servidores, escolas, usuários, estoque e administração | Estilo compartilhado reaplicava borda e fundo dentro da caixa de busca existente | Uma única caixa de busca e foco no conjunto |
| Administração | Aviso referenciava `--clr-warning`, que não existe | Cor semântica de atenção |
| Ofícios | Badge de disponibilidade com variável inexistente | Token violeta existente |
| Estoque | Ícone de edição e foco com variáveis inexistentes | Cor de texto e cor primária do tema |
| Solicitações | Área de materiais de manutenção com variável de fundo inexistente | Cor de fundo do tema |
| Contratos, DFD e histórico | Referências antigas `--color-*`, exclusão em vermelho fixo e cabeçalho de DFD sem contraste consistente no dark | Tokens existentes, vermelho semântico e texto branco no cabeçalho colorido |
| Usuários, administração, escolas e estoque | Larguras mínimas dos cards podiam exceder uma coluna estreita | Grade limita a largura mínima ao espaço real disponível |
| Cards de eventos, tarefas, usuários, escolas, quadros e históricos | Raios variados | Token de arredondamento compartilhado |

## Páginas conferidas

| Área | Arquivos |
| --- | --- |
| Home e conta | `index.html`, `configuracoes.html`, `usuarios.html`, `admin.html` |
| Documentos | `oficios.html`, `oficios-circulares.html`, `contratos.html`, `dfd.html`, `declaracao-comparecimento.html`, `revisar-texto.html`, `checklist.html` |
| Operação | `servidores.html`, `escolas.html`, `quadros.html`, `estoque.html`, `solicitacoes.html`, `eventos.html`, `tarefas.html` |
| Acesso e erro | `login.html`, `cadastro.html`, `404.html` |
| Portal gestor | `gestao-escolar/index.html`, `insumos.html`, `manutencao.html`, `materiais-expediente.html`, `materiais-limpeza.html`, `minhas-solicitacoes.html`, `login.html` |

O portal gestor e as telas de autenticação usam sua própria camada visual consistente, com os tokens declarados em seus estilos. Os ajustes deste PR se concentram nas divergências da secretaria.

## Validação e revisão visual

- Conferência das referências de variáveis CSS sem fallback: nenhuma referência indefinida restante nos estilos da secretaria ou do gestor.
- Verificação dos caminhos locais de CSS das 28 páginas.
- Suíte existente de testes e `git diff --check`.
- Revisão por código; o layout completo não foi renderizado em um navegador nesta etapa.

No preview, conferir as abas e buscas em ambos os temas; os indicadores de Quadros; os checkboxes do Checklist e de Tarefas; os cards de Administração; e a seleção de coordenadores em Escolas. Verificar também uma janela de desktop estreita, além do celular, pois a coluna central depende da largura dos menus laterais.
