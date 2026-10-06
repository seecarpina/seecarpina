import { validarEntrada, ocultarCPFs, restaurarCPFs, mensagensRevisao } from '../server/revisao.js';

const firebaseKey = 'AIzaSyCl69j1qpqKObNlZFSDOaJY5Ob8arFCr3k'; // Chave pública do projeto, não é credencial de servidor.
const limite = new Map();
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({erro: 'Método não permitido.'});
  }
  const token = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')?.[1];
  if (!token || token.length > 10000) return res.status(401).json({erro: 'Entre no sistema para revisar o texto.'});
  let entrada;
  try { entrada = validarEntrada(req.body); }
  catch (erro) { return res.status(400).json({erro: erro.message}); }
  try {
    const identidade = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseKey}`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({idToken: token}), signal: AbortSignal.timeout(10000),
    });
    if (!identidade.ok) return res.status(401).json({erro: 'Sua sessão expirou. Entre novamente.'});
    const usuario = (await identidade.json()).users?.[0];
    if (!usuario?.localId || usuario.disabled) return res.status(401).json({erro: 'Sessão inválida.'});
    const uid = usuario.localId;
    const url = new URL(`https://see-carpina-2a774-default-rtdb.firebaseio.com/controleAcesso/usuarios/${encodeURIComponent(uid)}.json`);
    url.searchParams.set('auth', token);
    const acesso = await fetch(url, {signal: AbortSignal.timeout(10000)});
    if (!acesso.ok) return res.status(403).json({erro: 'Não foi possível validar seu acesso.'});
    const dados = await acesso.json();
    if (dados?.ativo !== true || !dados.perfil || dados.perfil === 'GESTOR_ESCOLAR') {
      return res.status(403).json({erro: 'Revisão disponível para usuários ativos da secretaria.'});
    }
    if (!process.env.GROQ_API_KEY) return res.status(503).json({erro: 'A revisão com IA ainda não foi ativada. Solicite a configuração ao administrador.'});
    // Proteção local da instância; a cota global continua sendo controlada pela Groq.
    const agora = Date.now();
    for (const [chave, item] of limite) if (item.ate <= agora) limite.delete(chave);
    const uso = limite.get(uid) || {quantidade: 0, ate: agora + 60000};
    if (uso.quantidade >= 5) return res.status(429).json({erro: 'Aguarde um minuto antes de revisar outro texto.'});
    uso.quantidade++;
    limite.set(uid, uso);
    const protegido = ocultarCPFs(entrada.texto);
    const resposta = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(25000),
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}`},
      body: JSON.stringify({model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        messages: mensagensRevisao(protegido.texto, entrada.tipo), temperature: 0.2, max_completion_tokens: 4000}),
    });
    if (resposta.status === 429) return res.status(429).json({erro: 'A cota de uso da IA foi atingida. Tente novamente mais tarde.'});
    if (!resposta.ok) return res.status(502).json({erro: 'O serviço de IA está indisponível. Tente novamente mais tarde.'});
    const resultado = (await resposta.json()).choices?.[0];
    if (resultado?.finish_reason !== 'stop' || !resultado.message?.content?.trim()) {
      return res.status(502).json({erro: 'A IA não concluiu a revisão. Tente um texto menor.'});
    }
    const texto = restaurarCPFs(resultado.message.content.trim(), protegido.mapa);
    return res.status(200).json({texto});
  } catch {
    // Não registrar textos, tokens, URLs autenticadas ou respostas do provedor nos logs.
    return res.status(502).json({erro: 'Não foi possível concluir a revisão. Tente novamente.'});
  }
}
