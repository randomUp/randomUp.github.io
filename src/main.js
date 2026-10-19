/**
 * main.js — 可视化探针版（仅诊断用，手机上直接显示）
 */
(function () {
  const box = document.createElement("div");
  box.style.cssText =
    "position:fixed;top:0;left:0;right:0;z-index:99999;" +
    "background:rgba(0,0,0,0.9);color:#0f0;" +
    "font-family:monospace;font-size:12px;line-height:1.4;" +
    "padding:8px;max-height:70vh;overflow:auto;" +
    "white-space:pre-wrap;word-break:break-all;";
  box.textContent = "[BOOT] main.js 开始\n";
  document.body.appendChild(box);

  function log(msg, color) {
    const line = document.createElement("div");
    line.textContent = msg;
    if (color) line.style.color = color;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  window.addEventListener("error", (e) => {
    log(
      "[ERROR] " + e.message + "\n  " + (e.filename || "") + ":" + (e.lineno || ""),
      "#f66",
    );
  });
  window.addEventListener("unhandledrejection", (e) => {
    log("[REJECT] " + ((e.reason && e.reason.message) || e.reason), "#f66");
  });

  const mods = [
    "./core/dom.js",
    "./core/nav.js",
    "./core/storage.js",
    "./core/i18n.js",
    "./core/modal.js",
    "./core/settings.js",
    "./core/theme.js",
    "./core/clipboard.js",
    "./core/page-html.js",
    "./core/download.js",
    "./state/pages-state.js",
    "./state/ai-state.js",
    "./state/gen-state.js",
    "./state/editor.js",
    "./state/runner.js",
    "./ai/providers.js",
    "./ai/tools.js",
    "./ai/model-menu.js",
    "./pages/home.js",
    "./pages/about.js",
    "./pages/generator.js",
    "./pages/ai.js",
    "./features/backup.js",
    "./features/settings-dialog.js",
    "./sidebar.js",
    "./router.js",
  ];

  (async () => {
    for (const path of mods) {
      try {
        await import(path);
        log("OK   " + path);
      } catch (e) {
        log("FAIL " + path + "\n     " + ((e && e.message) || e), "#f66");
      }
    }
    log("=== 模块加载完毕 ===");
  })();
})();