/** pages/about.js — 关于页 */
import { el } from "../core/dom.js";
import { T } from "../core/i18n.js";

export function renderAbout() {
  const wrap = document.createElement("div");
  wrap.appendChild(el("h1", null, T("about.title")));
  ["p1", "p2", "p3", "p4", "p5", "p6", "p7"].forEach((k) => {
    const key = "about." + k;
    const text = T(key);
    if (text && text !== key) wrap.appendChild(el("p", null, text));
  });
  return wrap;
}