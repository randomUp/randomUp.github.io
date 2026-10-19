/**
 * core/storage.js — 存储层（合并原 storage-raw）
 * i18n.js 不依赖本文件（自读 localStorage），断开潜在环。
 */
import { showAlert } from "./modal.js";
import { T } from "./i18n.js";

export const STORAGE_KEY = "p5_pages";
export const THEME_KEY = "p5_theme";
export const LANG_KEY = "p5_lang";
export const DRAFT_KEY = "p5_gen_draft";
export const AI_KEY_STORAGE = "p5_ai_keys";
export const AI_CHAT_STORAGE = "p5_ai_chats";
export const AI_PROMPT_STORAGE = "p5_ai_prompts";
export const AI_CUSTOM_MODELS_STORAGE = "p5_ai_custom_models";
export const AI_CURRENT_MODEL_STORAGE = "p5_ai_current_model";
export const SETTINGS_KEY = "p5_settings";

export function storageGetRaw(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch (e) { return raw; }
  } catch (e) { return fallback; }
}
export function storageSetRaw(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { return false; }
}
export function storageRemoveRaw(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}

export const storageGet = storageGetRaw;
export const storageRemove = storageRemoveRaw;

export function isQuotaError(e) {
  if (!e) return false;
  if (e.name === "QuotaExceededError") return true;
  if (e.name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
  if (e.code === 22 || e.code === 1014) return true;
  return false;
}

const STORAGE_KB_MULTIPLIER = 2;

export function estimateStorageKB() {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const v = localStorage.getItem(k) || "";
      total += k.length + v.length;
    }
  } catch (e) { return -1; }
  return Math.round((total * STORAGE_KB_MULTIPLIER) / 1024);
}

function _ctxForKey(key) {
  if (key === AI_KEY_STORAGE) return "storage.ctxKeys";
  if (key === AI_PROMPT_STORAGE) return "storage.ctxPrompts";
  if (key === AI_CUSTOM_MODELS_STORAGE) return "storage.ctxCustomModels";
  if (key === STORAGE_KEY) return "storage.ctxPages";
  if (key.indexOf(AI_CHAT_STORAGE) === 0) return "storage.ctxChats";
  return null;
}

function _handleStorageQuotaError(e, contextKey) {
  if (!isQuotaError(e)) {
    showAlert(T("storage.saveFailTitle"), String((e && e.message) || e || "?"), true);
    return;
  }
  const usedKB = estimateStorageKB();
  const usedText = usedKB >= 0 ? T("storage.used", { kb: usedKB }) : "";
  showAlert(
    T("storage.fullTitle"),
    T("storage.fullBody", {
      context: contextKey ? T(contextKey) : "?",
      used: usedText,
    }),
    true,
  );
}

export function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { _handleStorageQuotaError(e, _ctxForKey(key)); return false; }
}