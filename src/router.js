/** router.js — 路由分派 + teardown */
import { $, el } from "./core/dom.js";
import { T } from "./core/i18n.js";
import { getRoute } from "./core/nav.js";
import { destroyEditor } from "./state/editor.js";
import { aiState } from "./state/ai-state.js";
import { genState } from "./state/gen-state.js";
import { runner, setRandom as _setRandom, setPage } from "./state/runner.js";
import { renderRunner } from "./pages/home.js";
import { renderAbout } from "./pages/about.js";
import { renderGenerator, bindGenerator } from "./pages/generator.js";
import { renderAIAssistant, bindAIAssistant } from "./pages/ai.js";
import { setActiveNav } from "./sidebar.js";

export function teardown() {
  if (aiState.busy) {
    if (aiState.abortController) { try { aiState.abortController.abort(); } catch (e) {} }
    aiState.streamToken += 1; aiState.busy = false;
    const sendBtn = $("#aiSendBtn"); if (sendBtn) sendBtn.disabled = false;
  }
  if (genState.busy) {
    if (genState.abortController) { try { genState.abortController.abort(); } catch (e) {} }
    genState.streamToken += 1; genState.busy = false;
    const genBtn = $("#genSendBtn"); if (genBtn) genBtn.disabled = false;
  }
  destroyEditor();
  document.body.classList.remove("preview-lock");
  const appEl = $("#app");
  if (appEl) {
    // 先清空 iframe srcdoc 触发内部 WebGL/p5 实例回收
    const iframe = appEl.querySelector("iframe");
    if (iframe) { try { iframe.srcdoc = ""; } catch (e) {} }
    appEl.style.position = ""; appEl.style.top = ""; appEl.style.left = "";
    appEl.style.width = ""; appEl.style.height = ""; appEl.style.overflow = "";
  }
}

export function render() {
  teardown();
  const path = getRoute();
  const appEl = $("#app");
  if (!appEl) return;

  if (path !== "/" && path !== "" && path !== "/index.html") {
    if (runner.mode === "page") { runner.mode = "random"; runner.pageId = null; }
  }
  if (path === "/" || path === "" || path === "/index.html") {
    setActiveNav("/");
    renderRunner();
    return;
  }

  appEl.classList.remove("preview-mode");
  appEl.classList.remove("ai-mode");
  appEl.classList.remove("generator-mode");
  appEl.replaceChildren();
  delete appEl.dataset.currentPageId;
  setActiveNav(path);

  if (path === "/ai") {
    appEl.classList.add("ai-mode");
    appEl.appendChild(renderAIAssistant());
    bindAIAssistant();
    return;
  }
  if (path === "/about") { appEl.appendChild(renderAbout()); return; }
  if (path === "/generator") {
    appEl.classList.add("generator-mode");
    appEl.appendChild(renderGenerator());
    bindGenerator();
    return;
  }
  const wrap = document.createElement("div");
  wrap.appendChild(el("h1", null, T("page.notFoundTitle", { path })));
  wrap.appendChild(el("p", null, T("page.notFoundBody")));
  appEl.appendChild(wrap);
}

export function setRandom() { _setRandom(); }
export function runPage(id) { setPage(id); }