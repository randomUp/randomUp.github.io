/** state/pages-state.js — 作品持久化 + 会话图片 */
import { storageGet, storageSet, STORAGE_KEY } from "../core/storage.js";

export const sessionImages = {};
export const MAX_SESSION_IMAGES = 10;

export function getPages() {
  const list = storageGet(STORAGE_KEY, []);
  if (!Array.isArray(list)) return [];
  return list.map((p) => (p && typeof p === "object" ? { ...p, engine: p.engine || "p5" } : p));
}

export function savePages(pages) {
  const ok = storageSet(STORAGE_KEY, pages);
  if (ok) {
    try { window.dispatchEvent(new CustomEvent("app:pagesChanged")); } catch (e) {}
  }
  return ok;
}

export function rememberSessionImage(pageId, dataUrl) {
  if (!pageId || !dataUrl) return;
  sessionImages[pageId] = dataUrl;
  const ids = Object.keys(sessionImages);
  if (ids.length > MAX_SESSION_IMAGES) delete sessionImages[ids[0]];
}