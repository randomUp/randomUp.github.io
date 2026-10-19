/**
 * main.js — 逐模块探针版（仅用于诊断，排查完恢复原版）
 * 每个 import 独立 try/catch，第一个失败的就是问题文件
 */

console.log("[PROBE] main.js 开始");

async function probe() {
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

  for (const path of mods) {
    try {
      const m = await import(path);
      console.log("[PROBE] OK  ", path, "→ exports:", Object.keys(m).join(","));
    } catch (e) {
      console.error("[PROBE] FAIL", path);
      console.error("        ", e && e.message);
      console.error("        stack:", e && e.stack);
      // 继续测下一个，方便一次看全
    }
  }

  console.log("[PROBE] 全部模块加载完毕");
}

probe();