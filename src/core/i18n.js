/**
 * core/i18n.js — 国际化
 * 自读 localStorage 的 p5_lang，不依赖 storage.js（断环）
 */
const LANG_KEY = "p5_lang";

let I18N = {};
let LANG = "zh";
let DEFAULT_LANG = null;
let _i18nCache = null;

function _readLangRaw() {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch (e) { return raw; }
  } catch (e) { return null; }
}
function _writeLangRaw(code) {
  try { localStorage.setItem(LANG_KEY, JSON.stringify(code)); } catch (e) {}
}

export function getI18N() { return I18N; }
export function getLang() { return LANG; }

export function setI18nData(i18nData, defaultLang) {
  I18N = i18nData && typeof i18nData === "object" ? i18nData : {};
  DEFAULT_LANG = typeof defaultLang === "string" && defaultLang ? defaultLang : null;
  _i18nCache = null;
}

export function setLang(code) {
  if (!code || !I18N[code]) {
    code = I18N.zh ? "zh" : I18N.en ? "en" : code || "zh";
  }
  LANG = code;
  _writeLangRaw(code);
  try { document.documentElement.lang = code === "zh" ? "zh-CN" : "en"; } catch (e) {}
}

export function detectLang() {
  const saved = _readLangRaw();
  if (saved && I18N[saved]) return saved;
  const nav = (navigator.language || "zh").toLowerCase();
  if (nav.indexOf("zh") === 0) return "zh";
  if (nav.indexOf("en") === 0) return "en";
  if (DEFAULT_LANG && I18N[DEFAULT_LANG]) return DEFAULT_LANG;
  return "en";
}

export function T(key, params) {
  const pack = I18N[LANG] || I18N.zh || {};
  let text = pack[key];
  if (text == null) text = (I18N.zh && I18N.zh[key]) || key;
  if (params) {
    text = String(text).replace(/\{(\w+)\}/g, (m, k) =>
      params[k] != null ? String(params[k]) : m,
    );
  }
  return text;
}

function _collectI18nNodes() {
  _i18nCache = {
    text: Array.from(document.querySelectorAll("[data-i18n]")),
    placeholder: Array.from(document.querySelectorAll("[data-i18n-placeholder]")),
    title: Array.from(document.querySelectorAll("[data-i18n-title]")),
    aria: Array.from(document.querySelectorAll("[data-i18n-aria]")),
  };
}

export function applyI18nToStatic() {
  if (!_i18nCache) _collectI18nNodes();

  _i18nCache.text.forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (!key) return;
    const text = T(key);
    const span = node.querySelector("span");
    if (span) span.textContent = text;
    else node.textContent = text;
  });
  _i18nCache.placeholder.forEach((node) => {
    const key = node.getAttribute("data-i18n-placeholder");
    if (!key) return;
    const text = T(key);
    node.setAttribute("placeholder", text);
    node.setAttribute("aria-label", text);
  });
  _i18nCache.title.forEach((node) => {
    const key = node.getAttribute("data-i18n-title");
    if (!key) return;
    node.setAttribute("title", T(key));
  });
  _i18nCache.aria.forEach((node) => {
    const key = node.getAttribute("data-i18n-aria");
    if (!key) return;
    node.setAttribute("aria-label", T(key));
  });
  try {
    if (!document.title || document.title === "") document.title = T("site.title");
  } catch (e) {}
}