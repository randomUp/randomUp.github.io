/** main.js — 运行时探针版（诊断用） */
import { $, $$ } from "./core/dom.js";
import { detectLang, setLang, setI18nData, applyI18nToStatic } from "./core/i18n.js";
import { applyTheme } from "./core/theme.js";
import { loadSettings, setSettingsFromContent } from "./core/settings.js";
import { storageGet, THEME_KEY } from "./core/storage.js";
import { initModal, closeModal, isModalOpen } from "./core/modal.js";
import { getRoute, onRouteChange } from "./core/nav.js";
import { setAI_MODELS, initAIState } from "./state/ai-state.js";
import { runner, setRandom } from "./state/runner.js";
import { refreshEditor } from "./state/editor.js";
import {
  bindSidebar, updateSidebarPages, closeSidebar, isSidebarOpen,
} from "./sidebar.js";
import { render } from "./router.js";

// ========== 运行时探针：页面上显示每一步 ==========
const diagBox = document.createElement("div");
diagBox.id = "__diag";
diagBox.style.cssText =
  "position:fixed;bottom:0;left:0;right:0;z-index:99999;" +
  "background:rgba(0,0,0,0.92);color:#0f0;" +
  "font-family:monospace;font-size:11px;line-height:1.5;" +
  "padding:8px;max-height:45vh;overflow:auto;" +
  "white-space:pre-wrap;word-break:break-all;";
diagBox.textContent = "[BOOT] 开始\n";
document.body.appendChild(diagBox);

function log(msg, color) {
  const d = document.createElement("div");
  d.textContent = msg;
  if (color) d.style.color = color;
  diagBox.appendChild(d);
  diagBox.scrollTop = diagBox.scrollHeight;
}

window.addEventListener("error", (e) =>
  log("[ERR] " + (e.message || "") + "\n  " + (e.filename || "") + ":" + (e.lineno || ""), "#f66"),
);
window.addEventListener("unhandledrejection", (e) =>
  log("[REJ] " + ((e.reason && e.reason.message) || String(e.reason || "?")), "#f66"),
);
// =================================================

/** ⚠️ 按你实际 json 文件名改 */
const CONTENT_URL = "data/contents.json";

function initGlobalGuards() {
  ["gesturestart", "gesturechange", "gestureend"].forEach((type) => {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  });
  function _isInPreviewArea(target) {
    try { return !!(target && target.closest && target.closest("#app.preview-mode")); }
    catch (e) { return false; }
  }
  document.addEventListener("touchstart", (e) => {
    if (e.touches && e.touches.length > 1) {
      if (_isInPreviewArea(e.target)) return;
      e.preventDefault();
    }
  }, { passive: false });
  document.addEventListener("touchmove", (e) => {
    if (e.touches && e.touches.length > 1) {
      if (_isInPreviewArea(e.target)) return;
      e.preventDefault();
    }
  }, { passive: false });
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      const t = e.target;
      const tag = t && t.tagName ? t.tagName.toLowerCase() : "";
      if (tag !== "input" && tag !== "textarea" && tag !== "button" && tag !== "select" && tag !== "a") {
        e.preventDefault();
      }
    }
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener("pointerdown", (e) => {
    const aiMenu = $("#aiModelMenu");
    if (aiMenu && aiMenu.classList.contains("show")) {
      const picker = aiMenu.parentNode;
      if (picker && !picker.contains(e.target)) aiMenu.classList.remove("show");
    }
    const genMenu = $("#genModelMenu");
    if (genMenu && genMenu.classList.contains("show")) {
      const gPicker = genMenu.parentNode;
      if (gPicker && !gPicker.contains(e.target)) genMenu.classList.remove("show");
    }
    if (!e.target.closest(".ai-msg")) {
      $$(".ai-msg.actions-visible").forEach((el) => el.classList.remove("actions-visible"));
    }
  });
  document.addEventListener("pointerdown", (e) => {
    const t = e.target;
    if (!t || !t.closest) return;
    if (t.closest("input, textarea, select, [contenteditable]")) return;
    if (t.closest(".CodeMirror")) return;
    if (t.closest(".ai-model-picker")) return;
    if (t.closest(".modal-backdrop")) return;
    if (t.closest("button")) return;
    const active = document.activeElement;
    if (!active) return;
    const tag = active.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || active.isContentEditable) active.blur();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (isModalOpen()) closeModal();
    else if (isSidebarOpen()) closeSidebar();
    else if (runner.mode === "page" && getRoute() === "/") setRandom();
  });
  window.addEventListener("orientationchange", () => refreshEditor());
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    const appEl = $("#app");
    if (appEl && appEl.classList.contains("preview-mode")) {
      appEl.style.width = window.innerWidth + "px";
      appEl.style.height = window.innerHeight + "px";
    }
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resizeTimer = null; refreshEditor(); }, 100);
  });
}

function loadContent() {
  // 加 5 秒超时，防 iOS Safari fetch hang 导致 boot 永不执行
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("loadContent timeout (5s)")), 5000),
  );
  return Promise.race([
    fetch(CONTENT_URL, { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }),
    timeoutPromise,
  ]).then((json) => {
    const content = json || {};
    setI18nData(content.i18n || {}, content.defaultLang);
    setAI_MODELS(content.models || []);
    setSettingsFromContent(content.settings);
  });
}

function boot() {
  log("STEP 1: initModal()");
  try { initModal(); log("  ✓ initModal"); }
  catch (e) { log("  ✗ initModal: " + e.message + "\n" + e.stack, "#f66"); return; }

  log("STEP 2: bindSidebar()");
  try { bindSidebar(); log("  ✓ bindSidebar"); }
  catch (e) { log("  ✗ bindSidebar: " + e.message + "\n" + e.stack, "#f66"); return; }

  log("STEP 3: initGlobalGuards()");
  try { initGlobalGuards(); log("  ✓ initGlobalGuards"); }
  catch (e) { log("  ✗ initGlobalGuards: " + e.message, "#f66"); }

  log("STEP 4: applyTheme()");
  try { applyTheme(storageGet(THEME_KEY, "light")); log("  ✓ applyTheme"); }
  catch (e) { log("  ✗ applyTheme: " + e.message, "#f66"); }

  log("STEP 5: loadSettings()");
  try { loadSettings(); log("  ✓ loadSettings"); }
  catch (e) { log("  ✗ loadSettings: " + e.message, "#f66"); }

  log("STEP 6: setLang()");
  try { setLang(detectLang()); log("  ✓ setLang"); }
  catch (e) { log("  ✗ setLang: " + e.message, "#f66"); }

  log("STEP 7: initAIState()");
  try { initAIState(); log("  ✓ initAIState"); }
  catch (e) { log("  ✗ initAIState: " + e.message, "#f66"); }

  log("STEP 8: applyI18nToStatic()");
  try { applyI18nToStatic(); log("  ✓ applyI18nToStatic"); }
  catch (e) { log("  ✗ applyI18nToStatic: " + e.message, "#f66"); }

  log("STEP 9: updateSidebarPages()");
  try { updateSidebarPages(); log("  ✓ updateSidebarPages"); }
  catch (e) { log("  ✗ updateSidebarPages: " + e.message, "#f66"); }

  log("STEP 10: onRouteChange(render)");
  try { onRouteChange(render); log("  ✓ onRouteChange"); }
  catch (e) { log("  ✗ onRouteChange: " + e.message, "#f66"); }

  log("STEP 11: render()");
  try { render(); log("  ✓ render"); }
  catch (e) { log("  ✗ render: " + e.message + "\n" + e.stack, "#f66"); return; }

  log("=== BOOT DONE ===", "#0ff");
}

log("loadContent() 开始...");
loadContent()
  .then(() => { log("loadContent() OK"); boot(); })
  .catch((e) => {
    log("loadContent() FAIL: " + (e && e.message), "#f66");
    log("降级执行 boot()");
    boot();
  });