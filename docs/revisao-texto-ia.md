# Ativar revisão de texto com IA

A página `/revisar-texto` usa uma função Vercel `/api/revisar-texto` e a Groq. O projeto não exige novas regras nem conta de serviço do Firebase: o servidor valida o ID token com o Firebase Auth e lê o controle de acesso com o próprio token. Apenas usuários ativos da secretaria podem usar.

1. Crie uma conta no plano **Free** em https://console.groq.com e gere uma API key. Não ative o plano pago para este teste.
2. No projeto **seecarpina** da Vercel, Settings → Environment Variables, adicione `GROQ_API_KEY` como variável sensível no servidor. Não use prefixo público nem grave a chave no GitHub.
3. Opcional: `GROQ_MODEL`; padrão `openai/gpt-oss-120b`. Confirme a disponibilidade e limites da sua conta em https://console.groq.com/docs/rate-limits.
4. Publique novamente o deployment após cadastrar a variável. Para testar a PR, configure também no ambiente Preview correspondente à branch.
5. Entre na secretaria, abra Ofícios → Revisar texto formal com IA e teste um texto fictício sem dados pessoais. Confira gramática, preservação das informações e CPFs.

Sem a chave, a página funciona visualmente e mostra que a IA não foi ativada ao solicitar revisão. Não há resposta fictícia apresentada como IA. Não é possível validar a qualidade da revisão sem uma chave real.

## Limites e dados

Texto entre 20 e 6.000 caracteres; até 4.000 tokens de conclusão. Há limitação de cinco chamadas por minuto por usuário por instância; ela não é um limitador distribuído. A cota global gratuita é controlada pela Groq, que responde 429 ao exceder limites. A função também consome os limites do plano de hospedagem Vercel existente. Não há promessa de uso ilimitado nem ativação automática de faturamento.

CPFs formatados ou sequências isoladas de 11 dígitos são substituídos antes da chamada à IA e restaurados no resultado. Se a IA remover um marcador, a resposta é rejeitada. Isso não anonimiza nomes, endereços ou demais informações sensíveis: o usuário deve removê-las antes do envio. O aplicativo não persiste os textos em banco ou armazenamento local e não os imprime em logs; o provedor externo processa o texto restante conforme seus termos. A Groq informa não reter conteúdo de inferência por padrão, mas prevê exceções para confiabilidade e abuso; avalie Data Controls antes de uso institucional.

Fontes: https://console.groq.com/docs/your-data, https://console.groq.com/docs/models, https://console.groq.com/docs/openai.
