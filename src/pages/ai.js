/** pages/ai.js — AI 助手页 */
import { $, $$, el, flashTip } from "../core/dom.js";
import { T } from "../core/i18n.js";
import { showAlert, showConfirm, openModal, closeModal, rightGroup } from "../core/modal.js";
import { copyToClipboard } from "../core/clipboard.js";
import { triggerDownload } from "../core/download.js";
import { getMaxContext, getRequestTimeoutMs } from "../core/settings.js";
import {
  aiState, getAllModels, aiModelConf, aiModelName, saveAIChats, saveAIPrompts,
} from "../state/ai-state.js";
import { streamAI, createStructuredAccumulator } from "../ai/providers.js";
import {
  buildAIModelMenu, refreshAIModelUI, toggleAIModelMenu, closeAIModelMenu,
  promptAPIKey, promptSystemPrompt, testModelConnection, selectAIModel, showModelEditor,
} from "../ai/model-menu.js";

const LONG_PRESS_MS = 500;
const NEAR_BOTTOM_PX = 80;
let renderedMsgCount = 0;
let renderedModelId = null;

let _globalListenersBound = false;
function ensureGlobalListeners() {
  if (_globalListenersBound) return;
  _globalListenersBound = true;
  window.addEventListener("app:aiModelChanged", () => {
    if (!$("#aiMessages")) return;
    renderedModelId = null; renderedMsgCount = 0;
    renderAIMessages(); updateAISendBtn();
  });
  window.addEventListener("app:aiModelsChanged", () => {
    if (!$("#aiMessages")) return;
    buildAIModelMenu(); renderedMsgCount = 0;
    renderAIMessages(); updateAISendBtn();
  });
}

export function renderAIAssistant() {
  const page = el("div", "ai-page");
  const clearBtn = el("button", "ai-clear-btn", "−");
  clearBtn.id = "aiClearBtn"; clearBtn.type = "button"; clearBtn.title = T("ai.clearTitle");
  const fileInput = document.createElement("input");
  fileInput.type = "file"; fileInput.id = "aiImportFile";
  fileInput.accept = ".json,application/json"; fileInput.style.display = "none";
  const messages = el("div", "ai-messages");
  messages.id = "aiMessages";
  messages.setAttribute("role", "log");
  messages.setAttribute("aria-live", "polite");
  messages.setAttribute("aria-relevant", "additions");
  const statsBar = el("div", "ai-stats");
  statsBar.id = "aiStats"; statsBar.style.display = "none";
  const inputWrap = el("div", "ai-input-wrap");
  const bar = el("div", "ai-input-bar");
  const picker = el("div", "ai-model-picker");
  const modelBtn = el("button", "ai-model-btn", "+");
  modelBtn.id = "aiModelBtn"; modelBtn.type = "button"; modelBtn.title = T("ai.modelPickerTitle");
  const menu = el("div", "ai-model-menu"); menu.id = "aiModelMenu";
  picker.appendChild(modelBtn); picker.appendChild(menu);
  const input = document.createElement("textarea");
  input.id = "aiInput"; input.rows = 1; input.placeholder = T("ai.inputPlaceholder");
  const sendBtn = el("button", "ai-send-btn", "↑");
  sendBtn.id = "aiSendBtn"; sendBtn.type = "button"; sendBtn.title = T("ai.sendTitle");
  bar.appendChild(picker); bar.appendChild(input); bar.appendChild(sendBtn);
  inputWrap.appendChild(bar);
  page.appendChild(clearBtn); page.appendChild(fileInput); page.appendChild(messages);
  page.appendChild(statsBar); page.appendChild(inputWrap);
  return page;
}

function buildEmptyNode(text) { return el("div", "ai-empty", text); }

function buildMsgNode(m, index) {
  const row = el("div", "ai-msg " + (m.role === "assistant" ? "assistant" : "user"));
  row.dataset.index = String(index);
  if (m.role === "assistant") {
    const body = el("div", "assistant-body");
    if (!m.content) { body.textContent = T("ai.thinking"); body.classList.add("pending"); }
    else body.textContent = m.content;
    row.appendChild(body);
    row.appendChild(buildAssistantToolbar(m, index));
    bindRowToggleActions(row);
  } else {
    const b = el("div", "bubble"); b.textContent = m.content; row.appendChild(b);
  }
  return row;
}

function buildAssistantToolbar(m, index) {
  const toolbar = el("div", "assistant-toolbar");
  const left = el("div", "toolbar-left");
  const chat = aiState.chats[aiState.currentModel] || [];
  const isLastAssistant = m.role === "assistant" && index === chat.length - 1 && index > 0;
  if (isLastAssistant) {
    const regenBtn = el("button", "assistant-tool-btn", "↻ " + T("msg.regen"));
    regenBtn.type = "button"; regenBtn.title = T("msg.regen");
    regenBtn.addEventListener("click", (e) => { e.stopPropagation(); regenerateMessage(index); });
    left.appendChild(regenBtn);
  }
  const delBtn = el("button", "assistant-tool-btn", "✕ " + T("msg.delete"));
  delBtn.type = "button"; delBtn.title = T("msg.delete");
  delBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteMessageFrom(index); });
  left.appendChild(delBtn);
  if (m.usage) {
    const up = m.usage.prompt_tokens || 0;
    const down = m.usage.completion_tokens || 0;
    const tok = el("span", "assistant-token", "↑" + up + " ↓" + down);
    tok.title = (m.usage.total_tokens || up + down) + " tokens";
    left.appendChild(tok);
  }
  toolbar.appendChild(left);
  const right = el("div", "toolbar-right");
  const copyBtn = el("button", "assistant-tool-btn", "⧉ " + T("msg.copy"));
  copyBtn.type = "button"; copyBtn.title = T("msg.copy");
  copyBtn.addEventListener("click", (e) => {
    e.stopPropagation(); copyToClipboard(m.content || ""); flashTip(toolbar, T("msg.copied"));
  });
  right.appendChild(copyBtn);
  toolbar.appendChild(right);
  return toolbar;
}

function bindRowToggleActions(row) {
  let pressTimer = null;
  let longPressed = false;
  function show() {
    $$(".ai-msg.actions-visible").forEach((n) => { if (n !== row) n.classList.remove("actions-visible"); });
    row.classList.add("actions-visible");
  }
  function toggle() { if (row.classList.contains("actions-visible")) row.classList.remove("actions-visible"); else show(); }
  function startPress() {
    longPressed = false;
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = setTimeout(() => { pressTimer = null; longPressed = true; show(); }, LONG_PRESS_MS);
  }
  function cancelPress() { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }
  row.addEventListener("pointerdown", startPress);
  row.addEventListener("pointerup", cancelPress);
  row.addEventListener("pointercancel", cancelPress);
  row.addEventListener("pointerleave", cancelPress);
  row.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    if (longPressed) { longPressed = false; return; }
    toggle();
  });
}

export function renderAIMessages() {
  const box = $("#aiMessages");
  if (!box) return;
  const model = aiState.currentModel;
  if (!model) {
    if (!box.firstChild || !box.querySelector(".ai-empty")) box.replaceChildren(buildEmptyNode(T("ai.emptyNoModel")));
    renderedModelId = null; renderedMsgCount = 0; updateStatsBar(); return;
  }
  if (renderedModelId !== model) { renderedModelId = model; renderedMsgCount = 0; box.replaceChildren(); }
  const chat = aiState.chats[model] || [];
  if (!chat.length) {
    if (!box.firstChild || !box.querySelector(".ai-empty")) box.replaceChildren(buildEmptyNode(T("ai.emptyStart", { model: aiModelName(model) })));
    renderedMsgCount = 0; updateStatsBar(); return;
  }
  if (renderedMsgCount > chat.length) renderedMsgCount = 0;
  if (renderedMsgCount === 0) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < chat.length; i++) frag.appendChild(buildMsgNode(chat[i], i));
    box.replaceChildren(frag); renderedMsgCount = chat.length;
    box.scrollTop = box.scrollHeight; updateStatsBar(); return;
  }
  if (renderedMsgCount < chat.length) {
    const emptyEl = box.querySelector(".ai-empty");
    if (emptyEl && box.children.length === 1) {
      box.replaceChildren(); renderedMsgCount = 0;
      const frag = document.createDocumentFragment();
      for (let k = 0; k < chat.length; k++) frag.appendChild(buildMsgNode(chat[k], k));
      box.replaceChildren(frag); renderedMsgCount = chat.length;
      box.scrollTop = box.scrollHeight; updateStatsBar(); return;
    }
    for (let j = renderedMsgCount; j < chat.length; j++) box.appendChild(buildMsgNode(chat[j], j));
    renderedMsgCount = chat.length; box.scrollTop = box.scrollHeight;
  }
  updateStatsBar();
}

function updateStatsBar() {
  const bar = $("#aiStats");
  if (!bar) return;
  const model = aiState.currentModel;
  if (!model) { bar.style.display = "none"; return; }
  const chat = aiState.chats[model] || [];
  let totalPrompt = 0, totalCompletion = 0, turns = 0;
  chat.forEach((m) => {
    if (m.role === "assistant" && m.usage) {
      totalPrompt += m.usage.prompt_tokens || 0;
      totalCompletion += m.usage.completion_tokens || 0;
      turns += 1;
    }
  });
  if (!turns) { bar.style.display = "none"; return; }
  bar.style.display = "block";
  bar.textContent = T("ai.stats", { turns, total: (totalPrompt + totalCompletion).toLocaleString() });
}

function updateAISendBtn() { const btn = $("#aiSendBtn"); if (btn) btn.disabled = !!aiState.busy; }
function getLastAssistantBubble() {
  const box = $("#aiMessages");
  if (!box) return null;
  const kids = box.children;
  for (let i = kids.length - 1; i >= 0; i--) {
    if (kids[i].classList.contains("assistant")) return kids[i].querySelector(".assistant-body");
  }
  return null;
}
function isNearBottom(box) {
  if (!box) return true;
  return box.scrollHeight - box.scrollTop - box.clientHeight < NEAR_BOTTOM_PX;
}

function deleteMessageFrom(index) {
  const model = aiState.currentModel;
  if (!model) return;
  const chat = aiState.chats[model] || [];
  if (index < 0 || index >= chat.length) return;
  const after = chat.length - index - 1;
  const msgText = after > 0 ? T("msg.deleteConfirmBody", { n: after }) : T("msg.deleteConfirmBodyShort");
  showConfirm(T("msg.deleteConfirmTitle"), msgText, () => {
    chat.splice(index); saveAIChats(model); renderedMsgCount = 0; renderAIMessages();
  }, true);
}
function regenerateMessage(index) {
  const model = aiState.currentModel;
  if (!model) return;
  const chat = aiState.chats[model] || [];
  if (index < 1) return;
  const userMsg = chat[index - 1];
  if (!userMsg || userMsg.role !== "user") return;
  chat.splice(index); saveAIChats(model); renderedMsgCount = 0; renderAIMessages();
  const text = userMsg.content || "";
  if (!text.trim()) return;
  aiSendWithText(text);
}

function aiSendWithText(text) {
  const model = aiState.currentModel;
  if (!model) return;
  const key = aiState.keys[model];
  if (!key) { promptAPIKey(model, () => { if (aiState.keys[model]) aiSendWithText(text); }); return; }
  let chat = aiState.chats[model];
  if (!Array.isArray(chat)) chat = aiState.chats[model] = [];
  const lastMsg = chat[chat.length - 1];
  if (!(lastMsg && lastMsg.role === "user" && lastMsg.content === text)) chat.push({ role: "user", content: text });
  chat.push({ role: "assistant", content: "" });
  saveAIChats(model);
  if (aiState.abortController) { try { aiState.abortController.abort(); } catch (e) {} }
  aiState.streamToken += 1;
  const myToken = aiState.streamToken;
  aiState.abortController = new AbortController();
  aiState.busy = true; updateAISendBtn(); renderAIMessages();

  const bubble = getLastAssistantBubble();
  let accumulated = "";
  let firstDelta = true;
  const conf = aiModelConf(model);
  const isGemini = conf && conf.protocol === "gemini";
  const box = $("#aiMessages");
  const acc = createStructuredAccumulator();

  function pushDelta(t2) {
    if (aiState.streamToken !== myToken) return;
    if (!t2) return;
    if (firstDelta && bubble) { bubble.textContent = ""; bubble.classList.remove("pending"); firstDelta = false; }
    accumulated += t2;
    if (bubble) bubble.appendChild(document.createTextNode(t2));
    if (box && isNearBottom(box)) box.scrollTop = box.scrollHeight;
  }
  const onDelta = (obj) => {
    if (isGemini) {
      const cand = obj.candidates && obj.candidates[0];
      if (cand && cand.content && cand.content.parts) {
        let t = "";
        for (let i = 0; i < cand.content.parts.length; i++) t += cand.content.parts[i].text || "";
        pushDelta(t);
      }
    } else {
      const d = obj.choices && obj.choices[0] && obj.choices[0].delta;
      if (d && d.content) pushDelta(d.content);
    }
  };

  let payload = chat.slice(0, -1).filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role, content: m.content || "" }));
  const maxCtx = getMaxContext();
  if (payload.length > maxCtx) {
    payload = payload.slice(-maxCtx);
    while (payload.length && payload[0].role !== "user") payload.shift();
  }
  const systemPrompt = aiState.prompts[model] || "";

  streamAI({ model, key, messages: payload, systemPrompt, onDelta, onRaw: (raw) => acc.consume(raw) })
    .then(() => {
      if (aiState.streamToken !== myToken) return;
      const meta = acc.finalize();
      const msg = chat[chat.length - 1];
      msg.content = accumulated || T("ai.emptyReply");
      if (meta.id) msg.id = meta.id;
      if (meta.model) msg.model = meta.model;
      if (meta.created) msg.created = meta.created;
      if (meta.finish_reason) msg.finish_reason = meta.finish_reason;
      if (meta.usage) msg.usage = meta.usage;
      if (meta.tool_calls) msg.tool_calls = meta.tool_calls;
      saveAIChats(model); aiState.busy = false; updateAISendBtn(); renderAIMessages();
    })
    .catch((err) => {
      if (aiState.streamToken !== myToken) return;
      aiState.busy = false; updateAISendBtn();
      const meta = acc.finalize();
      const isTimeout = err && err.name === "TimeoutError";
      const isAbort = err && (err.name === "AbortError" || err.code === 20);
      if (accumulated) {
        const msg = chat[chat.length - 1];
        msg.content = accumulated;
        if (meta.id) msg.id = meta.id;
        if (meta.model) msg.model = meta.model;
        if (meta.created) msg.created = meta.created;
        if (meta.finish_reason) msg.finish_reason = meta.finish_reason;
        if (meta.usage) msg.usage = meta.usage;
        if (meta.tool_calls) msg.tool_calls = meta.tool_calls;
      } else chat.pop();
      saveAIChats(model); renderAIMessages();
      if (isTimeout) {
        showAlert(T("chat.errTimeoutTitle"), T("chat.errTimeoutBody", { sec: Math.round(getRequestTimeoutMs() / 1000) }), true);
      } else if (!isAbort) {
        showAlert(T("chat.errRequestTitle"), String((err && err.message) || err) || T("chat.errRequestBody"), true);
      }
    });
}

function aiSend() {
  if (aiState.busy) return;
  const model = aiState.currentModel;
  if (!model) { showAlert(T("chat.errNoModelTitle"), T("chat.errNoModelBody"), true); return; }
  const inputEl = $("#aiInput");
  if (!inputEl) return;
  const text = (inputEl.value || "").trim();
  if (!text) return;
  inputEl.value = ""; inputEl.style.height = "auto";
  aiSendWithText(text);
}

function clearAIChat() {
  const model = aiState.currentModel;
  if (!model) { showAlert(T("chat.errNoClearTitle"), T("chat.errNoClearNoModel")); return; }
  const chat = aiState.chats[model] || [];
  if (!chat.length) { showAlert(T("chat.errNoClearTitle"), T("chat.errNoClearNoChat", { model: aiModelName(model) })); return; }
  showConfirm(T("chat.clearConfirmTitle"), T("chat.clearConfirmBody", { model: aiModelName(model) }), () => {
    if (aiState.busy) {
      if (aiState.abortController) { try { aiState.abortController.abort(); } catch (e) {} }
      aiState.streamToken += 1; aiState.busy = false; updateAISendBtn();
    }
    aiState.chats[model] = []; saveAIChats(model); renderedMsgCount = 0; renderAIMessages();
  }, true);
}

function downloadAIChatMd(model) {
  const chat = aiState.chats[model] || [];
  if (!chat.length) { showAlert(T("chat.errNoDownloadTitle"), T("chat.errNoDownloadBody", { model: aiModelName(model) })); return; }
  const lines = ["# " + aiModelName(model), ""];
  const sys = aiState.prompts[model];
  if (sys && sys.trim()) { lines.push("## system"); lines.push(""); lines.push(sys); lines.push(""); }
  chat.forEach((m) => { lines.push("## " + m.role); lines.push(""); lines.push(m.content || ""); lines.push(""); });
  triggerDownload(lines.join("\n"), "text/markdown;charset=utf-8", "ai_chat_" + model + "_" + Date.now() + ".md");
}

function downloadAIChatJson(model) {
  const chat = aiState.chats[model] || [];
  if (!chat.length) { showAlert(T("chat.errNoDownloadTitle"), T("chat.errNoDownloadBody", { model: aiModelName(model) })); return; }
  const sys = aiState.prompts[model];
  const data = {
    schemaVersion: 1, model, modelName: aiModelName(model),
    exportedAt: new Date().toISOString(),
    systemPrompt: sys && sys.trim() ? sys : null,
    messages: chat.map((m) => {
      const out = { role: m.role, content: m.content };
      if (m.id) out.id = m.id;
      if (m.model) out.model = m.model;
      if (m.created) out.created = m.created;
      if (m.finish_reason) out.finish_reason = m.finish_reason;
      if (m.usage) out.usage = m.usage;
      if (m.tool_calls && m.tool_calls.length) out.tool_calls = m.tool_calls;
      return out;
    }),
  };
  triggerDownload(JSON.stringify(data, null, 2), "application/json;charset=utf-8", "ai_chat_" + model + "_" + Date.now() + ".json");
}

function importAIChatFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    let data;
    try { data = JSON.parse(e.target.result); }
    catch (err) { showAlert(T("import.failTitle"), T("import.badJson"), true); return; }
    if (!data || !Array.isArray(data.messages)) { showAlert(T("import.failTitle"), T("import.badShape"), true); return; }
    let targetModel = data.model;
    if (!targetModel || !aiModelConf(targetModel)) {
      const name = String(data.modelName || "").toLowerCase();
      const allModels = getAllModels();
      for (let i = 0; i < allModels.length; i++) if (allModels[i].name.toLowerCase() === name) { targetModel = allModels[i].id; break; }
    }
    if (!targetModel || !aiModelConf(targetModel)) { showAlert(T("import.failTitle"), T("import.unknownModel", { model: data.model || "?" }), true); return; }
    const cleaned = data.messages.filter((m) => m && typeof m.role === "string").map((m) => {
      const out = { role: m.role, content: typeof m.content === "string" ? m.content : "" };
      if (m.id) out.id = m.id;
      if (m.model) out.model = m.model;
      if (m.created) out.created = m.created;
      if (m.finish_reason) out.finish_reason = m.finish_reason;
      if (m.usage) out.usage = m.usage;
      if (m.tool_calls && m.tool_calls.length) out.tool_calls = m.tool_calls;
      return out;
    });
    if (!cleaned.length) { showAlert(T("import.failTitle"), T("import.noMessages"), true); return; }
    const applyImport = (mode) => {
      const existing = aiState.chats[targetModel] || [];
      if (mode === "replace") aiState.chats[targetModel] = cleaned;
      else aiState.chats[targetModel] = existing.concat(cleaned);
      if (data.systemPrompt && String(data.systemPrompt).trim() && !(aiState.prompts[targetModel] || "").trim()) {
        aiState.prompts[targetModel] = String(data.systemPrompt).trim();
        saveAIPrompts();
      }
      saveAIChats(targetModel);
      if (aiState.currentModel === targetModel) {
        renderedMsgCount = 0; renderAIMessages();
        showAlert(T("import.okTitle"), T("import.okBody", { n: cleaned.length, model: aiModelName(targetModel) }));
      } else {
        showConfirm(T("import.okTitle"), T("import.askSwitch", { n: cleaned.length, model: aiModelName(targetModel) }), () => selectAIModel(targetModel));
      }
    };
    const existing = aiState.chats[targetModel] || [];
    if (!existing.length) { applyImport("replace"); return; }
    openModal((box) => {
      box.appendChild(el("h3", null, T("import.conflictTitle")));
      box.appendChild(el("p", null, T("import.conflictBody", { model: aiModelName(targetModel), existing: existing.length, incoming: cleaned.length })));
      const actions = el("div", "modal-actions");
      const leftWrap = document.createElement("div");
      const cancelBtn = el("button", "link-btn", T("common.cancel")); cancelBtn.addEventListener("click", closeModal);
      leftWrap.appendChild(cancelBtn);
      const rg = rightGroup();
      const appendBtn = el("button", "cancel", T("common.append")); appendBtn.addEventListener("click", () => { closeModal(); applyImport("append"); });
      const replaceBtn = el("button", "danger", T("common.replace")); replaceBtn.addEventListener("click", () => { closeModal(); applyImport("replace"); });
      rg.appendChild(appendBtn); rg.appendChild(replaceBtn);
      actions.appendChild(leftWrap); actions.appendChild(rg);
      box.appendChild(actions);
    });
  };
  reader.onerror = () => showAlert(T("import.failTitle"), T("import.readFail"), true);
  reader.readAsText(file);
}

export function bindAIAssistant() {
  ensureGlobalListeners();
  renderedModelId = null; renderedMsgCount = 0;
  buildAIModelMenu(); refreshAIModelUI(); renderAIMessages(); updateAISendBtn();

  const modelBtn = $("#aiModelBtn");
  const modelMenu = $("#aiModelMenu");
  const inputEl = $("#aiInput");
  const sendBtn = $("#aiSendBtn");
  const clearBtn = $("#aiClearBtn");

  if (modelBtn) modelBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleAIModelMenu(); });
  if (modelMenu) {
    modelMenu.addEventListener("click", (e) => {
      const importItem = e.target.closest("[data-import]");
      if (importItem) { e.stopPropagation(); closeAIModelMenu(); const imp = $("#aiImportFile"); if (imp) { imp.value = ""; imp.click(); } return; }
      const addBtn = e.target.closest("[data-add]");
      if (addBtn) { e.stopPropagation(); closeAIModelMenu(); showModelEditor(); return; }
      const editBtn = e.target.closest("[data-edit]");
      if (editBtn) { e.stopPropagation(); e.preventDefault(); closeAIModelMenu(); showModelEditor(editBtn.dataset.edit); return; }
      const promptBtn = e.target.closest("[data-prompt]");
      if (promptBtn) { e.stopPropagation(); closeAIModelMenu(); promptSystemPrompt(promptBtn.dataset.prompt); return; }
      const keyBtn = e.target.closest("[data-key]");
      if (keyBtn) { e.stopPropagation(); closeAIModelMenu(); promptAPIKey(keyBtn.dataset.key); return; }
      const testBtn = e.target.closest("[data-test]");
      if (testBtn) { e.stopPropagation(); closeAIModelMenu(); testModelConnection(testBtn.dataset.test); return; }
      const mdBtn = e.target.closest("[data-md]");
      if (mdBtn) { e.stopPropagation(); closeAIModelMenu(); downloadAIChatMd(mdBtn.dataset.md); return; }
      const jsonBtn = e.target.closest("[data-json]");
      if (jsonBtn) { e.stopPropagation(); closeAIModelMenu(); downloadAIChatJson(jsonBtn.dataset.json); return; }
      const item = e.target.closest(".ai-model-item");
      if (item) { e.stopPropagation(); closeAIModelMenu(); selectAIModel(item.dataset.model); }
    });
  }
  if (inputEl) {
    inputEl.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 140) + "px";
    });
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); aiSend(); }
    });
  }
  if (sendBtn) sendBtn.addEventListener("click", () => aiSend());
  const importFile = $("#aiImportFile");
  if (importFile) {
    importFile.addEventListener("change", function () {
      const f = this.files && this.files[0];
      if (!f) return;
      importAIChatFromFile(f);
      this.value = "";
    });
  }
  if (clearBtn) clearBtn.addEventListener("click", () => clearAIChat());
}