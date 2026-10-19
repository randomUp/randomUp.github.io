/** core/dom.js — 纯 DOM 工具，零依赖 */
const FLASH_TIP_MS = 1200;

export function $(sel, root) { return (root || document).querySelector(sel); }
export function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
export function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}
export function rightGroup() { return el("div", "right-group"); }
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
export function escapeScriptClose(str) {
  const LT = "\x3C";
  return String(str)
    .replace(new RegExp(LT + "/script", "gi"), LT + "\\/script")
    .replace(new RegExp(LT + "!--", "g"), LT + "\\!--")
    .replace(new RegExp(LT + "script", "gi"), LT + "\\script");
}
export function flashTip(anchorEl, text) {
  if (!anchorEl) return;
  try { if (window.getComputedStyle(anchorEl).position === "static") anchorEl.style.position = "relative"; } catch (e) {}
  const tip = el("div", "msg-flash-tip", text);
  anchorEl.appendChild(tip);
  setTimeout(() => { if (tip.parentNode) tip.parentNode.removeChild(tip); }, FLASH_TIP_MS);
}