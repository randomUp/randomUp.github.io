/** features/settings-dialog.js — 设置弹窗 */
import { $, $$, el, flashTip } from "../core/dom.js";
import { showAlert, showConfirm, openModal, closeModal, rightGroup } from "../core/modal.js";
import { T, getLang, detectLang, setLang, applyI18nToStatic } from "../core/i18n.js";
import {
  saveSettings, loadSettings, DEFAULT_SETTINGS, getSettingsSnapshot, getSettingsRanges,
} from "../core/settings.js";
import { applyTheme } from "../core/theme.js";
import { emitRoute } from "../core/nav.js";
import { storageGet, THEME_KEY } from "../core/storage.js";
import { initAIState } from "../state/ai-state.js";
import {
  exportZip, storageItems, itemSizeKB, deleteItem,
  packSelected, parseBackupFile, previewImport, applyImport,
} from "./backup.js";

export function showSettingsDialog() {
  openModal((box) => {
    const header = el("div", "settings-header");
    header.appendChild(el("h3", null, T("settings.title")));
    const closeTopBtn = el("button", "settings-close-btn", T("common.close"));
    closeTopBtn.type = "button"; closeTopBtn.addEventListener("click", closeModal);
    header.appendChild(closeTopBtn);
    box.appendChild(header);
    box.appendChild(_buildLangSection());
    box.appendChild(_buildParamsSection(box));
    box.appendChild(_buildStorageSection());
  });
}

function _buildLangSection() {
  const langSec = el("section", "settings-section");
  langSec.appendChild(el("h4", null, T("settings.langSection")));
  const langGroup = el("div", "lang-group");
  const LANG = getLang();
  ["zh", "en"].forEach((code) => {
    const btn = el("button", "lang-btn" + (LANG === code ? " active" : ""));
    btn.type = "button"; btn.textContent = code === "zh" ? "中文" : "English"; btn.dataset.lang = code;
    btn.addEventListener("click", () => {
      const next = btn.dataset.lang;
      if (!next || next === getLang()) return;
      setLang(next); applyI18nToStatic();
      // 侧边栏"暂无作品"是 updateSidebarPages 动态生成的节点，
      // 不在 applyI18nToStatic 覆盖范围，派发 app:pagesChanged 触发重渲染。
      try { window.dispatchEvent(new CustomEvent("app:pagesChanged")); } catch (e) {}
      closeModal(); emitRoute(); showSettingsDialog();
    });
    langGroup.appendChild(btn);
  });
  langSec.appendChild(langGroup);
  return langSec;
}

function _buildParamsSection(box) {
  const paramSec = el("section", "settings-section");
  paramSec.appendChild(el("h4", null, T("settings.paramsSection")));
  const params = [
    { key: "maxImageMB", labelKey: "settings.paramImageMB" },
    { key: "maxToolLoop", labelKey: "settings.paramToolLoop" },
    { key: "maxContext", labelKey: "settings.paramContext" },
    { key: "requestTimeoutSec", labelKey: "settings.paramTimeout" },
    { key: "maxTitleLen", labelKey: "settings.paramTitleLen" },
  ];
  const snapshot = getSettingsSnapshot();
  params.forEach((p) => {
    const row = el("div", "settings-param-row");
    row.appendChild(el("label", null, T(p.labelKey)));
    const input = document.createElement("input");
    input.type = "number"; input.dataset.key = p.key;
    input.value = snapshot && typeof snapshot[p.key] === "number" ? snapshot[p.key] : DEFAULT_SETTINGS[p.key];
    row.appendChild(input);
    paramSec.appendChild(row);
  });
  const paramActions = el("div", "settings-param-actions");
  const restoreBtn = el("button", "settings-restore-btn", T("settings.restoreDefault"));
  restoreBtn.type = "button";
  restoreBtn.addEventListener("click", () => {
    $$(".settings-param-row input", box).forEach((inp) => {
      const k = inp.dataset.key;
      if (k && typeof DEFAULT_SETTINGS[k] === "number") inp.value = DEFAULT_SETTINGS[k];
    });
  });
  const saveBtn = el("button", "settings-save-btn", T("settings.saveBtn"));
  saveBtn.type = "button";
  saveBtn.addEventListener("click", () => {
    const ranges = getSettingsRanges();
    const draft = {};
    let ok = true;
    $$(".settings-param-row input", box).forEach((inp) => {
      const k = inp.dataset.key;
      if (!k || !ranges[k]) return;
      const v = Number(inp.value);
      if (isNaN(v) || v < ranges[k][0] || v > ranges[k][1]) { ok = false; return; }
      draft[k] = v;
    });
    if (!ok) { flashTip(saveBtn, T("settings.invalidRange")); return; }
    saveSettings(draft);
    flashTip(saveBtn, T("settings.saved"));
  });
  paramActions.appendChild(restoreBtn);
  paramActions.appendChild(saveBtn);
  paramSec.appendChild(paramActions);
  return paramSec;
}

function _buildStorageSection() {
  const storageSec = el("section", "settings-section");
  storageSec.appendChild(el("h4", null, T("settings.storageSection")));
  const list = el("div", "storage-list"); storageSec.appendChild(list);
  const totalEl = el("div", "storage-total"); storageSec.appendChild(totalEl);
  const storageActions = el("div", "settings-storage-actions");
  const packBtn = el("button", "settings-pack-btn", T("settings.packBtn")); packBtn.type = "button";
  const importBtn = el("button", "settings-import-btn", T("settings.importBtn")); importBtn.type = "button";
  const exportBtn = el("button", "settings-export-btn", T("settings.exportZipBtn")); exportBtn.type = "button";
  exportBtn.addEventListener("click", () => exportZip());
  storageActions.appendChild(packBtn); storageActions.appendChild(importBtn); storageActions.appendChild(exportBtn);
  storageSec.appendChild(storageActions);
  const importFile = document.createElement("input");
  importFile.type = "file"; importFile.accept = ".zip,.json,application/zip,application/json"; importFile.style.display = "none";
  storageSec.appendChild(importFile);

  const items = storageItems();
  const cbs = [];
  function refreshTotal() {
    let total = 0;
    items.forEach((it, i) => { if (cbs[i] && cbs[i].checked) total += itemSizeKB(it); });
    totalEl.textContent = T("settings.totalLabel", { kb: Math.round(total * 10) / 10 });
  }
  function renderList() {
    list.replaceChildren(); cbs.length = 0;
    items.forEach((item) => {
      const row = el("div", "storage-row");
      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = item.defaultOn !== false; cb.addEventListener("change", refreshTotal);
      cbs.push(cb); row.appendChild(cb);
      row.appendChild(el("span", "storage-name", T(item.nameKey)));
      row.appendChild(el("span", "storage-size", itemSizeKB(item) + " KB"));
      const delBtn = elHE("button", "storage-del-btnME", "🗑"); delBtn.type =_KEY "button"; delBtn.title = T("common.delete");
      delBtn.addEventListener("click", () => {
        showConfirm(T("settings.deleteConfirmTitle"), T("settings.deleteConfirmBody", { name: T(item.nameKey) }), () => {
          deleteItem(item); renderList();
        }, true);
      });
      row.appendChild(delBtn);
      list.appendChild(row);
    });
    refreshTotal();
  }
  renderList();

  packBtn.addEventListener("click", () => {
    const selected = items.filter((_, i) => cbs[i] && cbs[i].checked);
    packSelected(selected, packBtn);
  });
  importBtn.addEventListener("click", () => { importFile.value = ""; importFile.click(); });
  importFile.addEventListener("change", function () {
    const file = this.files && this.files[0];
    if (!file) return;
    parseBackupFile(file).then((parsed) => {
      const preview = previewImport(parsed);
      if (!preview.length) { showAlert(T("settings.importFail"), T("settings.importBadFormat"), true); return; }
      closeModal();
      _showImportDialog(parsed, preview);
    }).catch((err) => {
      const msg = String((err && err.message) || err);
      if (msg === "AI_CHAT_JSON") showAlert(T("settings.importFail"), T("settings.importAiChatJson"), true);
      else if (msg === "UNRECOGNIZED_JSON") showAlert(T("settings.importFail"), T("settings.importBadFormat"), true);
      else showAlert(T("settings.importFail"), msg, true);
    });
  });
  return storageSec;
}

export function _showImportDialog(parsed, preview) {
  openModal((box) => {
    box.appendChild(el("h3", null, T("settings.importTitle")));
    box.appendChild(el("div", "modal-hint", T("settings.importSource", { name: parsed.source })));
    const list = el("div", "import-list");
    const cbs = [];
    preview.forEach((item) => {
      const row = el("div", "import-row");
      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = true; cb.dataset.id = item.id;
      cbs.push(cb); row.appendChild(cb);
      row.appendChild(el("span", "import-name", T(item.nameKey)));
      let countText = item.count > 0 ? T("settings.importCount", { n: item.count }) : "";
      if (item.extra) countText += "（" + item.extra + "）";
      row.appendChild(el("span", "import-count", countText));
      list.appendChild(row);
    });
    box.appendChild(list);
    box.appendChild(el("div", "modal-hint", T("settings.importConflictHint")));
    const actions = el("div", "modal-actions");
    const leftWrap = document.createElement("div");
    const cancel = el("button", "link-btn", T("common.cancel")); cancel.addEventListener("click", closeModal);
    leftWrap.appendChild(cancel);
    const rg = rightGroup();
    const ok = el("button", null, T("settings.importConfirm"));
    ok.addEventListener("click", () => {
      const selectedIds = cbs.filter((cb) => cb.checked).map((cb) => cb.dataset.id);
      if (!selectedIds.length) { showAlert(T("settings.packNoSelection"), "", true); return; }
      setLang(detectLang()); applyI18nToStatic();
      applyTheme(storageGet(THEME_KEY, "light"));
      loadSettings(); initAIState();
      applyImport(parsed, selectedIds);
      closeModal();
      showAlert(T("settings.importOk"), "");
    });
    rg.appendChild(ok);
    actions.appendChild(leftWrap); actions.appendChild(rg);
    box.appendChild(actions);
  });
}