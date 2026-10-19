/** features/backup.js — 备份、导入导出、存储项管理 */
import { flashTip } from "../core/dom.js";
import {
  storageGet, storageSet, storageRemove,
  STORAGE_KEY, THEME_KEY, LANG_KEY,
  AI_KEY_STORAGE, AI_CHAT_STORAGE, AI_PROMPT_STORAGE,
  AI_CUSTOM_MODELS_STORAGE, AI_CURRENT_MODEL_STORAGE, SETTINGS_KEY,
} from "../core/storage.js";
import { showAlert } from "../core/modal.js";
import { T } from "../core/i18n.js";
import { saveSettings, DEFAULT_SETTINGS } from "../core/settings.js";
import { emitRoute } from "../core/nav.js";
import { getPages, savePages } from "../state/pages-state.js";
import { getAllModels, aiState } from "../state/ai-state.js";
import { runner } from "../state/runner.js";

const STORAGE_KB_MULTIPLIER = 2;

function safeFileName(name) {
  const n = String(name || "").replace(/[\\/:*?"<>|~#%&{}]/g, "_").replace(/\s+/g, "_").trim();
  return n || "untitled";
}

export function exportZip() {
  const pages = getPages();
  if (!pages.length) { showAlert(T("page.exportEmptyTitle"), T("page.exportEmptyBody")); return; }
  const zip = new window.JSZip();
  pages.forEach((page, idx) => {
    const base = safeFileName(page.title);
    zip.file("p5_" + base + "_" + (idx + 1) + ".html", page.html);
  });
  _downloadZip(zip, "p5_works.zip");
}

export function storageItems() {
  return [
    { id: "pages", nameKey: "storage.itemWorks", keys: [STORAGE_KEY], defaultOn: true },
    { id: "draft", nameKey: "storage.itemDraft", keys: ["p5_gen_draft"], defaultOn: true },
    { id: "settings", nameKey: "storage.itemSettings", keys: [THEME_KEY, LANG_KEY, SETTINGS_KEY], defaultOn: true },
    { id: "keys", nameKey: "storage.itemKeys", keys: [AI_KEY_STORAGE], defaultOn: false },
    { id: "prompts", nameKey: "storage.itemPrompts", keys: [AI_PROMPT_STORAGE], defaultOn: true },
    { id: "customModels", nameKey: "storage.itemCustomModels", keys: [AI_CUSTOM_MODELS_STORAGE], defaultOn: true },
    { id: "currentModel", nameKey: "storage.itemCurrentModel", keys: [AI_CURRENT_MODEL_STORAGE], defaultOn: true },
    { id: "chats", nameKey: "storage.itemChats", dynamic: "chats", defaultOn: true },
  ];
}

export function itemSizeKB(item) {
  let total = 0;
  if (item.dynamic === "chats") {
    getAllModels().forEach((m) => {
      const v = storageGet(AI_CHAT_STORAGE + "_" + m.id, null);
      if (v != null) total += JSON.stringify(v).length;
    });
  } else item.keys.forEach((k) => {
    const v = storageGet(k, null);
    if (v != null) total += JSON.stringify(v).length;
  });
  return Math.round(((total * STORAGE_KB_MULTIPLIER) / 1024) * 10) / 10;
}

export function deleteItem(item) {
  if (item.dynamic === "chats") {
    getAllModels().forEach((m) => storageRemove(AI_CHAT_STORAGE + "_" + m.id));
    Object.keys(aiState.chats).forEach((k) => delete aiState.chats[k]);
    _emit("app:aiModelsChanged");
    return;
  }
  item.keys.forEach((k) => storageRemove(k));
  if (item.id === "pages") {
    _emit("app:pagesChanged");
    if (runner.mode === "page" && runner.pageId !== null) {
      const still = getPages().some((p) => p.id === runner.pageId);
      if (!still) { runner.mode = "random"; runner.pageId = null; emitRoute(); }
    }
  }
  if (item.id === "keys") aiState.keys = {};
  if (item.id === "prompts") aiState.prompts = {};
  if (item.id === "customModels") { aiState.customModels = []; _emit("app:aiModelsChanged"); }
  if (item.id === "currentModel") { aiState.currentModel = null; _emit("app:aiModelChanged"); }
  if (item.id === "settings") saveSettings({ ...DEFAULT_SETTINGS });
}

export function packSelected(selected, anchorEl) {
  if (!selected.length) {
    if (anchorEl) flashTip(anchorEl, T("settings.packNoSelection"));
    else showAlert(T("settings.packNoSelection"), "", true);
    return;
  }
  const zip = new window.JSZip();
  _writeItemsToZip(zip, selected);
  _downloadZip(zip, "randomArt_backup.zip");
}

function _writeItemsToZip(zip, selected) {
  const itemKeys = selected.map((it) => it.dynamic === "chats" ? "p5_ai_chats" : it.keys[0]);
  zip.file("manifest.json", JSON.stringify({
    app: "randomArt", schemaVersion: 1,
    exportedAt: new Date().toISOString(), items: itemKeys,
  }, null, 2));
  selected.forEach((item) => {
    if (item.dynamic === "chats") {
      const chatsMap = {};
      getAllModels().forEach((m) => {
        const v = storageGet(AI_CHAT_STORAGE + "_" + m.id, null);
        if (v && v.length) chatsMap[m.id] = v;
      });
      zip.file("p5_ai_chats.json", JSON.stringify(chatsMap, null, 2)); return;
    }
    if (item.id === "settings") {
      const s = { theme: storageGet(THEME_KEY, "light"), lang: storageGet(LANG_KEY, ""), settings: storageGet(SETTINGS_KEY, null) };
      zip.file("p5_settings.json", JSON.stringify(s, null, 2)); return;
    }
    const v = storageGet(item.keys[0], null);
    if (v == null) return;
    zip.file(item.keys[0] + ".json", JSON.stringify(v, null, 2));
  });
}

function _downloadZip(zip, filename) {
  zip.generateAsync({ type: "base64" }).then((base64) => {
    try {
      const url = "data:application/zip;base64," + base64;
      const link = document.createElement("a");
      link.href = url; link.download = filename; link.style.display = "none";
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (e) { showAlert(T("page.exportFailTitle"), String((e && e.message) || e), true); }
  }).catch((err) => { showAlert(T("page.exportFailTitle"), String((err && err.message) || err), true); });
}

export function parseBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buf = e.target.result;
      let isZip = false;
      try {
        const arr = new Uint8Array(buf, 0, 4);
        isZip = arr[0] === 0x50 && arr[1] === 0x4b;
      } catch (err) {}
      if (isZip) {
        window.JSZip.loadAsync(buf).then((zip) => {
          const tasks = [];
          const knownFiles = [
            "p5_pages.json", "p5_gen_draft.json", "p5_settings.json",
            "p5_ai_keys.json", "p5_ai_prompts.json", "p5_ai_custom_models.json",
            "p5_ai_current_model.json", "p5_ai_chats.json",
          ];
          const result = { source: file.name, files: {}, manifest: null };
          if (zip.file("manifest.json")) {
            tasks.push(zip.file("manifest.json").async("string").then((txt) => {
              try { result.manifest = JSON.parse(txt); } catch (e) {}
            }));
          }
          knownFiles.forEach((fn) => {
            const f = zip.file(fn);
            if (!f) return;
            tasks.push(f.async("string").then((txt) => {
              try { result.files[fn] = JSON.parse(txt); } catch (e) {}
            }));
          });
          return Promise.all(tasks).then(() => resolve(result));
        }).catch(reject);
        return;
      }
      try {
        const txt = new TextDecoder("utf-8").decode(new Uint8Array(buf));
        const obj = JSON.parse(txt);
        if (obj && Array.isArray(obj.messages)) { reject(new Error("AI_CHAT_JSON")); return; }
        reject(new Error("UNRECOGNIZED_JSON"));
      } catch (err) { reject(new Error("BAD_JSON")); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function previewImport(parsed) {
  const f = parsed.files;
  const items = [];
  function add(id, nameKey, available, count, extra) {
    if (available) items.push({ id, nameKey, count, extra: extra || "" });
  }
  if (f["p5_pages.json"]) {
    const arr = Array.isArray(f["p5_pages.json"]) ? f["p5_pages.json"] : [];
    add("pages", "storage.itemWorks", true, arr.length, T("settings.importCurrent", { n: getPages().length }));
  }
  if (f["p5_gen_draft.json"]) add("draft", "storage.itemDraft", true, 1, "");
  if (f["p5_settings.json"]) add("settings", "storage.itemSettings", true, 1, "");
  if (f["p5_ai_keys.json"]) {
    const k = f["p5_ai_keys.json"];
    add("keys", "storage.itemKeys", true, k && typeof k === "object" ? Object.keys(k).length : 0, "");
  }
  if (f["p5_ai_prompts.json"]) {
    const pr = f["p5_ai_prompts.json"];
    add("prompts", "storage.itemPrompts", true, pr && typeof pr === "object" ? Object.keys(pr).length : 0, "");
  }
  if (f["p5_ai_custom_models.json"]) {
    const cm = Array.isArray(f["p5_ai_custom_models.json"]) ? f["p5_ai_custom_models.json"] : [];
    add("customModels", "storage.itemCustomModels", true, cm.length, "");
  }
  if (f["p5_ai_current_model.json"]) add("currentModel", "storage.itemCurrentModel", true, 1, "");
  if (f["p5_ai_chats.json"]) {
    const ch = f["p5_ai_chats.json"];
    add("chats", "storage.itemChats", true, ch && typeof ch === "object" ? Object.keys(ch).length : 0, "");
  }
  return items;
}

export function applyImport(parsed, selectedIds) {
  const f = parsed.files;
  if (selectedIds.indexOf("pages") !== -1 && f["p5_pages.json"]) {
    const existing = getPages();
    const idSet = {};
    existing.forEach((p) => { idSet[p.id] = true; });
    const incoming = Array.isArray(f["p5_pages.json"]) ? f["p5_pages.json"] : [];
    incoming.forEach((p) => {
      if (p && p.id && !idSet[p.id]) { existing.push(p); idSet[p.id] = true; }
    });
    savePages(existing);
  }
  if (selectedIds.indexOf("draft") !== -1 && f["p5_gen_draft.json"]) storageSet("p5_gen_draft", f["p5_gen_draft.json"]);
  if (selectedIds.indexOf("settings") !== -1 && f["p5_settings.json"]) {
    const s = f["p5_settings.json"];
    if (s.theme) storageSet(THEME_KEY, s.theme);
    if (s.lang) storageSet(LANG_KEY, s.lang);
    if (s.settings) storageSet(SETTINGS_KEY, s.settings);
  }
  if (selectedIds.indexOf("keys") !== -1 && f["p5_ai_keys.json"]) storageSet(AI_KEY_STORAGE, f["p5_ai_keys.json"]);
  if (selectedIds.indexOf("prompts") !== -1 && f["p5_ai_prompts.json"]) storageSet(AI_PROMPT_STORAGE, f["p5_ai_prompts.json"]);
  if (selectedIds.indexOf("customModels") !== -1 && f["p5_ai_custom_models.json"]) {
    const existingM = storageGet(AI_CUSTOM_MODELS_STORAGE, []);
    const midSet = {};
    existingM.forEach((m) => { midSet[m.id] = true; });
    const incM = Array.isArray(f["p5_ai_custom_models.json"]) ? f["p5_ai_custom_models.json"] : [];
    incM.forEach((m) => {
      if (m && m.id && !midSet[m.id]) { existingM.push(m); midSet[m.id] = true; }
    });
    storageSet(AI_CUSTOM_MODELS_STORAGE, existingM);
  }
  if (selectedIds.indexOf("currentModel") !== -1 && f["p5_ai_current_model.json"]) {
    const cm = f["p5_ai_current_model.json"];
    if (typeof cm === "string") storageSet(AI_CURRENT_MODEL_STORAGE, cm);
  }
  if (selectedIds.indexOf("chats") !== -1 && f["p5_ai_chats.json"]) {
    const chatsMap = f["p5_ai_chats.json"];
    if (chatsMap && typeof chatsMap === "object") {
      Object.keys(chatsMap).forEach((modelId) => storageSet(AI_CHAT_STORAGE + "_" + modelId, chatsMap[modelId]));
    }
  }
  _emit("app:pagesChanged");
  _emit("app:aiModelsChanged");
  _emit("app:aiModelChanged");
  emitRoute();
}

function _emit(name) { try { window.dispatchEvent(new CustomEvent(name)); } catch (e) {} }