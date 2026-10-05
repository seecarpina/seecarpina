# Ativar notificações de solicitações

Esta integração está preparada, mas fica desativada até a configuração do Firebase e a publicação da função. Integrar a PR na Vercel, por si só, não ativa o envio.

## Configuração pública

No projeto `see-carpina-2a774`, abrir **Configurações do projeto → Geral → Seus aplicativos → aplicativo Web**. Copiar os valores públicos `messagingSenderId` e `appId`.

Em **Configurações do projeto → Cloud Messaging → Certificados de push da Web**, gerar ou localizar o par de chaves e copiar apenas a **chave pública VAPID**.

Preencher `push-config.json` com esses três valores. Usar `enabled: true` somente depois de publicar as regras e a função. Esses valores são públicos; não inserir conta de serviço, chave privada VAPID, senha ou token de acesso no repositório.

## Publicação do envio

Cloud Functions exige plano Blaze. Revisar o plano e o faturamento no Firebase antes de publicar. A região configurada é `us-central1`; conferir a região da instância Realtime Database antes da publicação.

Com uma conta autorizada no Firebase CLI:

```sh
npm ci --prefix functions
firebase login
firebase deploy --only database,functions:notificacoes --project see-carpina-2a774
```

No parâmetro `ORIGEM_SECRETARIA`, informar a origem HTTPS de produção do sistema da secretaria, por exemplo `https://seecarpina.online` **somente se esse for o endereço correto**. Os dispositivos registrados em domínios de preview não recebem envios de produção.

A implantação das regras usa o arquivo completo `database.rules.json`. Comparar com as regras ativas no console antes de publicar, preservando alterações que existam apenas no console.

## Uso e validação

1. Abrir Central de Solicitações no celular ou notebook de um usuário ativo com permissão para um módulo.
2. Clicar em **Ativar notificações neste dispositivo** e aceitar a permissão do navegador. Repetir em cada dispositivo.
3. No iPhone/iPad, instalar na tela inicial e abrir pelo ícone; Web Push exige iOS/iPadOS 16.4 ou posterior.
4. Fechar a janela e enviar um novo pedido pelo Portal do Gestor. Usuários com acesso ao módulo, incluindo ADM, recebem o aviso. Usuários inativos, gestores escolares, perfis sem acesso e o próprio solicitante são excluídos.
5. Tocar no aviso e conferir abertura do pedido, também após login.
6. Testar os quatro módulos, desativação por dispositivo, logout e troca de usuário. O logout tenta remover a inscrição antes de encerrar a sessão; falha de rede não impede sair. O aviso não contém escola nem conteúdo do pedido.

A função consulta permissões atuais antes do envio. Tokens inválidos são removidos. Sucessos ficam registrados para não reenviar em novas tentativas; falhas temporárias permitem retentativa. Como o gatilho tem entrega pelo menos uma vez, uma falha entre envio e registro pode repetir um aviso; a tag por pedido substitui a notificação anterior no dispositivo.

A entrega depende de permissões, conexão, suporte do navegador e configurações do sistema operacional. Não foi validada com credenciais ou dispositivos de produção nesta etapa.

Referências: https://firebase.google.com/docs/cloud-messaging/web/get-started ; https://firebase.google.com/docs/functions/database-events ; https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
