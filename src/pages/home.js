/** pages/home.js — 首页运行器（p5 / three 双引擎） */
import { $, el } from "../core/dom.js";
import { T } from "../core/i18n.js";
import { injectSessionImage } from "../core/page-html.js";
import { showAlert } from "../core/modal.js";
import { getPages, sessionImages } from "../state/pages-state.js";
import { runner, randomFileRef } from "../state/runner.js";

const P5_DIR = "p5/";
const P5_CDN = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js";
const P5_FILES = ["sketch1.js", "sketch2.js", "sketch3.js"];

function pickRandomP5File() {
  if (!P5_FILES || !P5_FILES.length) return null;
  if (P5_FILES.length === 1) return P5_FILES[0];
  let pool = P5_FILES.filter((f) => f !== randomFileRef.current);
  if (!pool.length) pool = P5_FILES.slice();
  return pool[Math.floor(Math.random() * pool.length)];
}

function encodePath(fileName) {
  return String(fileName).split("/").map((s) => encodeURIComponent(s)).join("/");
}

function buildP5SrcDoc(fileName) {
  const src = P5_DIR + encodePath(fileName);
  return (
    "<!DOCTYPE html>\n" +
    '<html lang="zh-CN">\n' +
    "<head>\n" +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    "  <style>\n" +
    "    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; touch-action: none; }\n" +
    "    canvas { display: block; touch-action: none; }\n" +
    "  </style>\n" +
    '  \x3Cscript src="' + P5_CDN + '">\x3C/script>\n' +
    '  \x3Cscript src="' + src + '">\x3C/script>\n' +
    "</head>\n<body></body>\n</html>"
  );
}

function bindIframeProxy(iframe, engine) {
  let iwin, idoc;
  try { iwin = iframe.contentWindow; idoc = iframe.contentDocument; } catch (e) { return; }
  if (!iwin || !idoc) return;
  function tryAttach() {
    const canvas = idoc.querySelector("canvas");
    if (canvas) {
      if (engine === "three") attachPointerProxy(canvas, iwin, idoc);
      else attachProxy(canvas, iwin, idoc);
      return true;
    }
    return false;
  }
  if (tryAttach()) return;
  const observer = new MutationObserver(() => { if (tryAttach()) observer.disconnect(); });
  observer.observe(idoc.documentElement || idoc, { childList: true, subtree: true });
  setTimeout(() => { try { observer.disconnect(); } catch (e) {} }, 15000);
}

function attachProxy(canvas, iwin, idoc) {
  if (canvas.__proxyAttached) return;
  canvas.__proxyAttached = true;
  const MOUSE_TYPES = ["mousemove", "mousedown", "mouseup", "click", "dblclick"];
  const TOUCH_TYPES = ["touchstart", "touchmove", "touchend", "touchcancel"];
  function relayMouse(e) {
    if (e.target === canvas) return;
    if ((e.type === "mousedown" || e.type === "mouseup" || e.type === "click" || e.type === "dblclick") && e.button !== 0) return;
    let ev;
    try {
      ev = new iwin.MouseEvent(e.type, {
        bubbles: true, cancelable: true, view: iwin,
        detail: e.detail || 1, screenX: e.screenX, screenY: e.screenY,
        clientX: e.clientX, clientY: e.clientY,
        ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey,
        button: e.button, buttons: e.buttons, relatedTarget: null,
      });
    } catch (err) { return; }
    canvas.dispatchEvent(ev);
  }
  function relayTouch(e) {
    if (e.target === canvas) return;
    if (!e.touches || !e.touches.length) return;
    const t = e.touches[0];
    const type = e.type === "touchstart" ? "mousedown" : e.type === "touchmove" ? "mousemove" : e.type === "touchend" ? "mouseup" : null;
    if (!type) return;
    let ev;
    try {
      ev = new iwin.MouseEvent(type, {
        bubbles: true, cancelable: true, view: iwin,
        clientX: t.clientX, clientY: t.clientY, screenX: t.screenX, screenY: t.screenY,
        button: 0, buttons: type === "mouseup" ? 0 : 1,
      });
    } catch (err) { return; }
    canvas.dispatchEvent(ev);
  }
  MOUSE_TYPES.forEach((t) => idoc.addEventListener(t, relayMouse, true));
  TOUCH_TYPES.forEach((t) => idoc.addEventListener(t, relayTouch, { capture: true, passive: true }));
}

function attachPointerProxy(canvas, iwin, idoc) {
  if (canvas.__pointerAttached) return;
  canvas.__pointerAttached = true;
  const TYPES = ["pointerdown", "pointermove", "pointerup", "pointercancel"];
  function relay(e) {
    if (e.target === canvas) return;
    let ev;
    try {
      ev = new iwin.PointerEvent(e.type, {
        bubbles: true, cancelable: true, view: iwin,
        pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: e.isPrimary,
        clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY,
        button: e.button, buttons: e.buttons, width: e.width, height: e.height, pressure: e.pressure,
      });
    } catch (err) { return; }
    canvas.dispatchEvent(ev);
  }
  TYPES.forEach((t) => idoc.addEventListener(t, relay, { capture: true, passive: true }));
}

function lockAppSize() {
  document.body.classList.add("preview-lock");
  const appEl = $("#app");
  if (!appEl) return;
  appEl.style.position = "fixed";
  appEl.style.top = "0";
  appEl.style.left = "0";
  appEl.style.width = window.innerWidth + "px";
  appEl.style.height = window.innerHeight + "px";
  appEl.style.overflow = "hidden";
}
function unlockAppSize() {
  document.body.classList.remove("preview-lock");
  const appEl = $("#app");
  if (!appEl) return;
  appEl.style.position = ""; appEl.style.top = ""; appEl.style.left = "";
  appEl.style.width = ""; appEl.style.height = ""; appEl.style.overflow = "";
}

function buildScreenshotButton(iframe) {
  const btn = el("button", "preview-screenshot-btn", "📷");
  btn.id = "screenshotBtn"; btn.type = "button"; btn.title = T("preview.screenshot");
  btn.addEventListener("click", () => {
    try {
      const doc = iframe.contentDocument;
      if (!doc) throw new Error("no doc");
      const canvas = doc.querySelector("canvas");
      if (!canvas) { showAlert(T("preview.screenshot"), T("preview.noCanvas"), true); return; }
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl; a.download = "canvas_" + Date.now() + ".png";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) { showAlert(T("preview.screenshot"), T("preview.screenshotFail"), true); }
  });
  return btn;
}

export function renderRunner() {
  const appEl = $("#app");
  if (!appEl) return;
  appEl.replaceChildren();
  appEl.classList.remove("preview-mode");
  appEl.classList.remove("ai-mode");

  let html = null;
  let currentPage = null;

  if (runner.mode === "page") {
    const page = getPages().find((p) => p.id === runner.pageId);
    if (page) {
      currentPage = page;
      html = page.html;
      if (sessionImages[page.id]) html = injectSessionImage(html, sessionImages[page.id]);
      appEl.dataset.currentPageId = String(page.id);
    } else { runner.mode = "random"; runner.pageId = null; }
  }
  if (runner.mode === "temp") {
    html = runner.tempHtml || null;
    runner.mode = "random"; runner.tempHtml = null;
    delete appEl.dataset.currentPageId;
  }
  if (html === null) {
    const file = pickRandomP5File();
    if (!file) {
      unlockAppSize(); delete appEl.dataset.currentPageId;
      const wrap = document.createElement("div");
      wrap.appendChild(el("h1", null, T("runner.noScriptTitle")));
      wrap.appendChild(el("p", null, T("runner.noScriptBody")));
      appEl.appendChild(wrap);
      return;
    }
    randomFileRef.current = file;
    html = buildP5SrcDoc(file);
    delete appEl.dataset.currentPageId;
  }

  lockAppSize();
  appEl.classList.add("preview-mode");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "preview");
  iframe.setAttribute("scrolling", "no");
  iframe.srcdoc = html;
  const engine = currentPage ? (currentPage.engine || "p5") : "p5";
  iframe.addEventListener("load", () => bindIframeProxy(iframe, engine));
  appEl.appendChild(iframe);

  if (runner.mode === "page" && currentPage && currentPage.engine !== "three") {
    appEl.appendChild(buildScreenshotButton(iframe));
  }
}