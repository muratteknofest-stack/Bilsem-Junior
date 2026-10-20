(function installBootRecovery(win, doc) {
  "use strict";
  var root = doc.getElementById("root");
  var panel = doc.getElementById("bj-load-recovery");
  var message = doc.getElementById("bj-load-message");
  var retry = doc.getElementById("bj-load-retry");
  var ready = false;
  var originalTitle = doc.title;
  var key = "bilsem:chunk-reload:v1";
  function show(slow) {
    if (!panel) return;
    panel.hidden = false;
    if (root) root.hidden = true;
    if (message) message.textContent = slow
      ? "Yükleme beklenenden uzun sürdü. Bağlantını kontrol edip yeniden deneyebilirsin."
      : win.navigator && win.navigator.onLine === false
        ? "İnternet bağlantısı kurulamadı. Bağlantını kontrol edip yeniden dene."
        : "Uygulama dosyaları yüklenemedi. Güncel sürümü yeniden yükleyebilirsin.";
    doc.title = "Bilsem Junior · Yeniden dene";
  }
  function refresh() {
    try {
      var url = new win.URL(win.location.href);
      url.searchParams.set("bj_refresh", String(Date.now()));
      win.location.replace(url.href);
    } catch (_) {
      win.location.reload();
    }
  }
  function reloadOnce() {
    try {
      var now = Date.now();
      var previous = Number(win.sessionStorage.getItem(key) || 0);
      if (previous > 0 && now - previous < 300000) return false;
      win.sessionStorage.setItem(key, String(now));
      if (win.sessionStorage.getItem(key) !== String(now)) return false;
      refresh();
      return true;
    } catch (_) {
      // Automatic recovery needs a durable per-tab guard to avoid reload loops.
      return false;
    }
  }
  var timer = win.setTimeout(function () { if (!ready) show(true); }, 30000);
  win.__bilsemBoot = {
    ready: function () {
      ready = true;
      win.clearTimeout(timer);
      if (panel) panel.hidden = true;
      if (root) root.hidden = false;
      if (doc.title === "Bilsem Junior · Yeniden dene") doc.title = originalTitle;
    },
    fail: function () { win.clearTimeout(timer); show(false); },
    retry: refresh
  };
  if (retry) retry.addEventListener("click", refresh);
  win.addEventListener("vite:preloadError", function (event) {
    event.preventDefault();
    if (!reloadOnce()) show(false);
  });
  win.addEventListener("error", function (event) {
    if (ready) return;
    var target = event.target;
    if (target && target.tagName === "SCRIPT" && target.type === "module") {
      if (!reloadOnce()) show(false);
    } else if (!target || target === win) show(false);
  }, true);
  win.addEventListener("unhandledrejection", function () {
    if (!ready) show(false);
  });
})(window, document);
