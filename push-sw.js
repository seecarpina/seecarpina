// Recebe mensagens de dados enviadas pelo Firebase Cloud Messaging.
self.addEventListener("push", event => {
  let payload;
  try { payload = event.data?.json(); } catch { return; }
  const aviso = payload?.data;
  if (!aviso?.title || !aviso?.url) return;
  const url = new URL(aviso.url, self.location.origin);
  if (url.origin !== self.location.origin || url.pathname !== "/solicitacoes.html") return;
  event.waitUntil(self.registration.showNotification(aviso.title, {
    body: aviso.body || "Há um novo pedido para atendimento.",
    icon: "/src/images/app/icon-192.png?v=2",
    tag: aviso.tag,
    data: { url: url.href },
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/solicitacoes.html", self.location.origin);
  if (url.origin !== self.location.origin || url.pathname !== "/solicitacoes.html") return;
  event.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const janela of janelas) {
      if (new URL(janela.url).origin === url.origin && "navigate" in janela) {
        await janela.navigate(url.href);
        return janela.focus();
      }
    }
    return self.clients.openWindow(url.href);
  })());
});
