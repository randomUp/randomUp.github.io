/** ai/model-menu.js — 模型菜单与配置 */
import { $, $$, el } from "../core/dom.js";
import { showAlert, showConfirm, showPrompt, showPromptArea, openModal, closeModal } from "../core/modal.js";
import { T } from "../core/i18n.js";
import { storageRemove, AI_CHAT_STORAGE } from "../core/storage.js";
import {
  aiState, getAllModels, getToolModels, aiModelConf, aiModelName,
  saveAIKeys, saveAIPrompts, saveCustomModels, saveCurrentModel,
} from "../state/ai-state.js";
import { testAIModelConnection } from "./providers.js";

export function buildAIModelMenu() {
  const menu = $("#aiModelMenu");
  if (!menu) return;
  const frag = document.createDocumentFragment();
  const topRow = el("div", "ai-model-toprow");
  const addBtn = el("div", "ai-model-topbtn ai-model-add", T("ai.topRowAdd"));
  addBtn.dataset.add = "1";
  const importBtn = el("div", "ai-model-topbtn", T("ai.topRowImport"));
  importBtn.dataset.import = "1";
  topRow.appendChild(addBtn); topRow.appendChild(importBtn);
  frag.appendChild(topRow);

  getAllModels().forEach((m) => {
    const item = el("div", "ai-model-item");
    if (aiState.currentModel === m.id) item.classList.add("active");
    item.dataset.model = m.id;
    item.appendChild(el("span", "ai-check", "✓"));
    const name = el("span", "ai-model-name");
    const nameText = el("span", "ai-model-name-text", m.name);
    name.appendChild(nameText);
    if (!m.builtin) {
      const editBtn = el("button", "ai-model-edit", "✎");
      editBtn.type = "button"; editBtn.title = T("ai.editModelTitle"); editBtn.dataset.edit = m.id;
      name.appendChild(editBtn);
    }
    item.appendChild(name);
    const testBtn = el("button", "ai-dl", "T"); testBtn.type = "button"; testBtn.title = T("ai.menuTest"); testBtn.dataset.test = m.id;
    const keyBtn = el("button", "ai-key", "K"); keyBtn.type = "button"; keyBtn.title = T("ai.menuKey"); keyBtn.dataset.key = m.id;
    const promptBtn = el("button", "ai-prompt", "P"); promptBtn.type = "button"; promptBtn.title = T("ai.menuPrompt"); promptBtn.dataset.prompt = m.id;
    if (aiState.prompts[m.id] && aiState.prompts[m.id].trim()) promptBtn.classList.add("has-prompt");
    const jsonBtn = el("button", "ai-dl", "J"); jsonBtn.type = "button"; jsonBtn.title = T("ai.menuDownloadJson"); jsonBtn.dataset.json = m.id;
    const mdBtn = el("button", "ai-dl", "M"); mdBtn.type = "button"; mdBtn.title = T("ai.menuDownloadMd"); mdBtn.dataset.md = m.id;
    item.appendChild(testBtn); item.appendChild(keyBtn); item.appendChild(promptBtn);
    item.appendChild(jsonBtn); item.appendChild(mdBtn);
    frag.appendChild(item);
  });
  menu.replaceChildren(frag);
}

export function buildGenModelMenu() {
  const menu = $("#genModelMenu");
  if (!menu) return;
  const frag = document.createDocumentFragment();
  const models = getToolModels();
  if (!models.length) {
    const empty = el("div", "ai-model-item");
    empty.style.cursor = "default"; empty.style.color = "var(--text-muted)";
    empty.textContent = T("gen.menuNoToolsModels");
    frag.appendChild(empty); menu.replaceChildren(frag); return;
  }
  models.forEach((m) => {
    const item = el("div", "ai-model-item");
    if (aiState.currentModel === m.id) item.classList.add("active");
    item.dataset.model = m.id;
    item.appendChild(el("span", "ai-check", "✓"));
    item.appendChild(el("span", "ai-model-name-text", m.name));
    frag.appendChild(item);
  });
  menu.replaceChildren(frag);
}

export function toggleAIModelMenu() {
  const menu = $("#aiModelMenu");
  if (menu) menu.classList.toggle("show");
}
export function closeAIModelMenu() {
  const menu = $("#aiModelMenu");
  if (menu) menu.classList.remove("show");
}
export function toggleGenMenu() {
  const menu = $("#genModelMenu");
  if (!menu) return;
  const willShow = !menu.classList.contains("show");
  menu.classList.toggle("show");
  if (willShow) buildGenModelMenu();
}
export function closeGenMenu() {
  const menu = $("#genModelMenu");
  if (menu) menu.classList.remove("show");
}

export function refreshAIModelUI() {
  $$(".ai-model-item").forEach((node) => {
    if (aiState.currentModel && node.dataset.model === aiState.currentModel) node.classList.add("active");
    else node.classList.remove("active");
  });
  const btn = $("#aiModelBtn");
  if (btn) {
    if (aiState.currentModel) { btn.classList.add("has-model"); btn.textContent = aiModelName(aiState.currentModel).charAt(0); }
    else { btn.classList.remove("has-model"); btn.textContent = "+"; }
  }
  const genBtn = $("#genModelBtn");
  if (genBtn) {
    const cur = aiState.currentModel;
    const conf = cur ? aiModelConf(cur) : null;
    if (cur && conf && conf.supportsTools) { genBtn.classList.add("has-model"); genBtn.textContent = conf.name.charAt(0); }
    else { genBtn.classList.remove("has-model"); genBtn.textContent = "+"; }
  }
}

export function showModelEditor(modelId) {
  const isEdit = !!modelId;
  const existing = isEdit ? aiModelConf(modelId) : null;
  if (isEdit && (!existing || existing.builtin)) return;
  _openEditorModal({ isEdit, existing, modelId });
}

function _openEditorModal({ isEdit, existing, modelId }) {
  openModal((box) => {
    box.appendChild(el("h3", null, isEdit ? T("ai.editModelTitle") : T("model.addTitle")));
    box.appendChild(el("div", "modal-hint", T("model.hint", { endpoint: "{endpoint}" })));
    const labelStyle = "display:block;font-weight:bold;font-size:0.9rem;margin:8px 0 4px;";
    const l1 = el("label", null, T("model.labelName")); l1.style.cssText = labelStyle;
    const nameInput = document.createElement("input");
    nameInput.type = "text"; nameInput.placeholder = T("model.placeholderName");
    nameInput.value = isEdit ? existing.name : ""; nameInput.autocomplete = "off"; nameInput.spellcheck = false;
    const l2 = el("label", null, T("model.labelEndpoint")); l2.style.cssText = labelStyle;
    const epInput = document.createElement("input");
    epInput.type = "text"; epInput.placeholder = T("model.placeholderEndpoint");
    epInput.value = isEdit ? existing.endpoint : ""; epInput.autocomplete = "off"; epInput.spellcheck = false;
    const l3 = el("label", null, T("model.labelApiModel")); l3.style.cssText = labelStyle;
    const apiInput = document.createElement("input");
    apiInput.type = "text"; apiInput.placeholder = T("model.placeholderApiModel");
    apiInput.value = isEdit ? existing.apiModel : ""; apiInput.autocomplete = "off"; apiInput.spellcheck = false;
    const toolsRow = document.createElement("label");
    toolsRow.style.cssText = "display:flex;align-items:center;gap:8px;margin:8px 0 4px;font-weight:bold;font-size:0.9rem;cursor:pointer;";
    const toolsCb = document.createElement("input"); toolsCb.type = "checkbox"; toolsCb.style.cssText = "width:auto;margin:0;";
    toolsCb.checked = isEdit ? !!existing.supportsTools : false;
    toolsRow.appendChild(toolsCb); toolsRow.appendChild(document.createTextNode(T("model.labelTools")));
    const visionRow = document.createElement("label");
    visionRow.style.cssText = toolsRow.style.cssText;
    const visionCb = document.createElement("input"); visionCb.type = "checkbox"; visionCb.style.cssText = "width:auto;margin:0;";
    visionCb.checked = isEdit ? !!existing.vision : false;
    visionRow.appendChild(visionCb); visionRow.appendChild(document.createTextNode(T("model.labelVision")));
    const actions = el("div", "modal-actions");
    const leftWrap = document.createElement("div");
    if (isEdit) {
      const delBtn = el("button", "link-btn", T("model.deleteBtn")); delBtn.type = "button";
      delBtn.addEventListener("click", () => { closeModal(); deleteCustomModel(modelId); });
      leftWrap.appendChild(delBtn);
    }
    const rg = el("div", "right-group");
    const cancel = el("button", "cancel", T("common.cancel")); cancel.addEventListener("click", closeModal);
    const ok = el("button", null, isEdit ? T("common.save") : T("common.ok"));
    ok.addEventListener("click", () => {
      const name = nameInput.value.trim(); const ep = epInput.value.trim(); const apiModel = apiInput.value.trim();
      if (!name) return nameInput.focus();
      if (!ep) return epInput.focus();
      if (!/^https?:\/\//i.test(ep)) { showAlert(T("model.errFormat"), T("model.errFormatBody"), true); return; }
      if (!apiModel) return apiInput.focus();
      const supportsTools = !!toolsCb.checked, vision = !!visionCb.checked;
      if (isEdit) {
        existing.name = name; existing.endpoint = ep; existing.apiModel = apiModel;
        existing.supportsTools = supportsTools; existing.vision = vision;
        saveCustomModels(); closeModal(); buildAIModelMenu(); refreshAIModelUI();
        showAlert(T("model.editOk"), T("model.editOkBody", { name }));
      } else {
        const newId = "custom_" + Date.now();
        aiState.customModels.push({ id: newId, name, endpoint: ep, apiModel, protocol: "openai", builtin: false, supportsTools, vision });
        aiState.chats[newId] = []; aiState.prompts[newId] = "";
        saveCustomModels(); saveAIPrompts(); closeModal(); buildAIModelMenu(); refreshAIModelUI();
        showAlert(T("model.addOk"), T("model.addOkBody", { name }));
      }
    });
    rg.appendChild(cancel); rg.appendChild(ok);
    actions.appendChild(leftWrap); actions.appendChild(rg);
    box.appendChild(l1); box.appendChild(nameInput);
    box.appendChild(l2); box.appendChild(epInput);
    box.appendChild(l3); box.appendChild(apiInput);
    box.appendChild(toolsRow); box.appendChild(visionRow); box.appendChild(actions);
  });
}

export function deleteCustomModel(modelId) {
  const conf = aiModelConf(modelId);
  if (!conf || conf.builtin) return;
  showConfirm(T("model.deleteConfirmTitle"), T("model.deleteConfirmBody", { name: conf.name }), () => {
    delete aiState.keys[modelId]; delete aiState.chats[modelId]; delete aiState.prompts[modelId];
    saveAIKeys(); saveAIPrompts();
    storageRemove(AI_CHAT_STORAGE + "_" + modelId);
    aiState.customModels = aiState.customModels.filter((m) => m.id !== modelId);
    saveCustomModels();
    if (aiState.currentModel === modelId) { aiState.currentModel = null; saveCurrentModel(null); }
    buildAIModelMenu(); refreshAIModelUI();
    try { window.dispatchEvent(new CustomEvent("app:aiModelsChanged")); } catch (e) {}
    showAlert(T("model.deleteOk"), T("model.deleteOkBody", { name: conf.name }));
  }, true);
}

export function promptAPIKey(model, onSaved) {
  const hasKey = !!aiState.keys[model];
  showPrompt(
    T("ai.setKeyTitle", { model: aiModelName(model) }),
    aiState.keys[model] || "",
    (v) => { aiState.keys[model] = v; saveAIKeys(); if (onSaved) onSaved(); },
    "password", T("ai.keySecurityHint"),
    hasKey ? { clearText: T("ai.clearKey"), onClear: () => { delete aiState.keys[model]; saveAIKeys(); } } : null,
  );
}

export function promptSystemPrompt(model) {
  const existing = aiState.prompts[model] || "";
  showPromptArea({
    title: T("ai.setPromptTitle", { model: aiModelName(model) }),
    hint: T("ai.setPromptHint"),
    value: existing,
    placeholder: T("ai.setPromptPlaceholder"),
    onOk: (v) => { aiState.prompts[model] = v.trim(); saveAIPrompts(); buildAIModelMenu(); refreshAIModelUI(); },
    onClear: () => { aiState.prompts[model] = ""; saveAIPrompts(); buildAIModelMenu(); refreshAIModelUI(); },
  });
}

export function testModelConnection(model) {
  const key = aiState.keys[model];
  if (!key) { showAlert(T("test.noKeyTitle"), T("test.noKeyBody", { model: aiModelName(model) }), true); return; }
  showAlert(T("test.title"), T("test.body", { model: aiModelName(model) }));
  const runTest = testAIModelConnection(model);
  runTest(key).then((result) => {
    if (result.ok) showAlert(T("test.okTitle"), T("test.okBody", { model: aiModelName(model) }));
    else showAlert(T("test.failTitle"), result.message, true);
  });
}

export function selectAIModel(model) {
  if (!aiModelConf(model)) return;
  if (aiState.busy) {
    if (aiState.abortController) { try { aiState.abortController.abort(); } catch (e) {} }
    aiState.streamToken += 1; aiState.busy = false;
  }
  if (!aiState.keys[model]) {
    promptAPIKey(model, () => {
      aiState.currentModel = model; saveCurrentModel(model);
      refreshAIModelUI();
      try { window.dispatchEvent(new CustomEvent("app:aiModelChanged")); } catch (e) {}
    });
    return;
  }
  aiState.currentModel = model;
  saveCurrentModel(model);
  refreshAIModelUI();
  try { window.dispatchEvent(new CustomEvent("app:aiModelChanged")); } catch (e) {}
}