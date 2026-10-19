/** main.js — 应用入口（无构建，纯 ESM） */
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

const CONTENT_URL = "data/content.json";

function initGlobalGuards() {
  ["gesturestart", "gesturechange", "gestureend"].forEach((type) => {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  });

  /** 若触摸发生在 #app.preview-mode 内（iframe 区域），让事件正常进入 iframe */
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
  return fetch(CONTENT_URL, { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((json) => {
      const content = json || {};
      setI18nData(content.i18n || {}, content.defaultLang);
      setAI_MODELS(content.models || []);
      setSettingsFromContent(content.settings);
    });
}

function boot() {
  initModal();
  bindSidebar();
  initGlobalGuards();

  applyTheme(storageGet(THEME_KEY, "light"));
  loadSettings();
  setLang(detectLang());
  initAIState();
  applyI18nToStatic();
  updateSidebarPages();

  onRouteChange(render);
  render();
}

loadContent()
  .then(() => boot())
  .catch((e) => {
    console.warn("[content.json] 加载失败，使用默认空文案降级启动：", e);
    boot();
  });