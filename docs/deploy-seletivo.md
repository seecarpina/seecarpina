# Publicação independente dos portais

O repositório usa npm workspaces, com três pacotes:

- `secretaria`: site principal, incluindo a API de revisão de texto.
- `gestao-escolar`: portal dos gestores.
- `packages/compartilhado`: gerador de PDF, timbre dos pedidos e CSS do login usados pelos dois portais.

Os dois portais declaram dependência de `@see/compartilhado`. O build copia seus três recursos para as URLs locais de cada site. Os arquivos copiados são gerados e não devem ser editados; altere a fonte em `packages/compartilhado/src`.

## Configuração necessária na Vercel

Este PR prepara o repositório; não altera as configurações da conta Vercel.
Depois de mesclar, em **Settings → Build and Deployment** dos projetos existentes:

| Campo | seecarpina | gestao-escolar-see-carpina |
| --- | --- | --- |
| Root Directory | `secretaria` | `gestao-escolar` |
| Include source files outside of the Root Directory in the Build Step | Ativado | Ativado |
| Skip deployment (projetos não afetados) | Ativado | Ativado |
| Framework Preset | Other | Other |
| Build Command | `npm run build` | `npm run build` |
| Output Directory | `.` | `.` |
| Install Command | padrão, npm | padrão, npm |

Remova um eventual Ignored Build Step personalizado: ele não é necessário para esta estratégia.
Mantenha os mesmos projetos, domínios, branch de produção `main` e variáveis de ambiente, incluindo `GROQ_API_KEY` da secretaria. Não crie projetos novos.

O `vercel.json` na raiz desativa publicações Git **apenas para projetos ainda apontando à raiz antiga**. Isso evita publicar uma raiz sem páginas durante a migração. O site já publicado continua disponível. Ao mudar Root Directory para `secretaria`, a Vercel passa a ler `secretaria/vercel.json`, que permite publicação normalmente.

Após configurar e liberar a cota atual, publique a versão mais recente de `main` uma vez em cada projeto. Não use Redeploy de um commit anterior à migração, pois ele não contém a nova pasta `secretaria`. Se não houver registro desse commit, uma nova alteração em cada pacote pode iniciar a primeira publicação. Confira primeiro as URLs de preview, incluindo login, solicitações, impressão de pedido e revisão de texto.

## Resultado esperado e limites

- Alterações apenas em `secretaria/` afetam a secretaria.
- Alterações apenas em `gestao-escolar/` afetam o portal dos gestores.
- Alterações em `packages/compartilhado/` afetam os dois, por dependência declarada.
- Alterações fora dos workspaces (por exemplo, configurações da raiz, testes, docs e regras Firebase) são consideradas globais pela Vercel e podem publicar os dois.
- A ativação no painel e a primeira publicação precisam ser verificadas na Vercel. Os testes locais não comprovam a contagem da cota nem a decisão do serviço de ignorar projetos.

Documentação oficial: https://vercel.com/docs/monorepos#skipping-unaffected-projects

## Desenvolvimento e validação

Na raiz: `npm ci` e `npm test`. O pretest prepara os recursos dos dois portais. Para preparar somente um: `npm run build --workspace=@see/secretaria` ou `npm run build --workspace=@see/gestores`.

Sirva `secretaria/` ou `gestao-escolar/` como raiz do respectivo site local. As URLs públicas continuam `/servidores`, `/solicitacoes`, `/api/revisar-texto`, etc.; o nome da pasta do repositório não entra no endereço público. Ajuste a pasta servida no Live Server, se o utiliza. O redirecionamento local de gestor ainda usa `/gestao-escolar/`; teste esse fluxo com a raiz do repositório servida ou abra o portal local diretamente.

Para reverter: reverta este PR e restaure Root Directory da secretaria para vazio/raiz. O portal dos gestores continua em `gestao-escolar`.
