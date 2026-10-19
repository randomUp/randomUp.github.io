/** state/gen-state.js — 生成器状态 + 草稿 + 会话上传图片 */
import { storageGet, storageSet, storageRemove, DRAFT_KEY } from "../core/storage.js";

export const genState = {
  messages: [], busy: false, abortController: null,
  streamToken: 0, menuOpen: false, palette: null,
};

export const generatorDraft = { title: "", script: "", engine: "p5" };

/** 当前上传图片（会话级，不持久化）。供 generator.js 与 tools.js 共用。 */
export const uploadedImageRef = { dataUrl: null, info: null };

export function loadDraft() {
  const o = storageGet(DRAFT_KEY, null);
  if (o && typeof o === "object") {
    generatorDraft.title = typeof o.title === "string" ? o.title : "";
    generatorDraft.script = typeof o.script === "string" ? o.script : "";
    generatorDraft.engine = o.engine === "three" ? "three" : "p5";
  } else {
    generatorDraft.title = ""; generatorDraft.script = ""; generatorDraft.engine = "p5";
  }
  return generatorDraft;
}
export function saveDraft() {
  storageSet(DRAFT_KEY, {
    title: generatorDraft.title,
    script: generatorDraft.script,
    engine: generatorDraft.engine,
  });
}
export function clearDraft() {
  generatorDraft.title = ""; generatorDraft.script = ""; generatorDraft.engine = "p5";
  storageRemove(DRAFT_KEY);
}