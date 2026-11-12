// Service worker do NorthFinance: recebe as notificações mesmo com o app fechado.
self.addEventListener("push", (event) => {
  let data = { title: "NorthFinance", body: "", url: "/" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "northfinance", // um aviso novo substitui o anterior, em vez de empilhar
      data: { url: data.url },
    }),
  );
});

// Tocar no aviso abre o app na tela certa (ou traz para frente, se já estiver aberto)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
