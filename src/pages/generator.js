/** pages/generator.js — 编写脚本页（含引擎切换与 AI 生成） */
import { $, $$, el } from "../core/dom.js";
import { T } from "../core/i18n.js";
import { showAlert, showConfirm, showIntentChoice } from "../core/modal.js";
import {
  getMaxImageBytes, getMaxTitleLen, getMaxToolLoop, getRequestTimeoutMs,
} from "../core/settings.js";
import { generatePageHtml } from "../core/page-html.js";
import { downloadSingleHtml } from "../core/download.js";
import { getEditor, createEditor, destroyEditor } from "../state/editor.js";
import {
  genState, generatorDraft, loadDraft, saveDraft, clearDraft, uploadedImageRef,
} from "../state/gen-state.js";
import { getPages, savePages, rememberSessionImage } from "../state/pages-state.js";
import { aiState, aiModelConf, aiModelName, saveCurrentModel } from "../state/ai-state.js";
import { TOOL_SPECS, executeToolCall, extractCodeFromText } from "../ai/tools.js";
import { streamAI, createStructuredAccumulator } from "../ai/providers.js";
import {
  toggleGenMenu, closeGenMenu, refreshAIModelUI, promptAPIKey,
} from "../ai/model-menu.js";
import { setPage } from "../state/runner.js";

export function renderGenerator() {
  const wrap = el("div", "generator-page");

  // menubar：标题 + 引擎切换（替代原帮助按钮）
  const menubar = el("div", "generator-menubar");
  menubar.appendChild(el("div", "generator-menubar-title", T("generator.title")));
  const engineSwitch = el("div", "engine-switch-menubar");
  ["p5", "three"].forEach((eng) => {
    const btn = el("button", eng === generatorDraft.engine ? "active" : "", eng === "p5" ? "p5" : "three");
    btn.type = "button"; btn.dataset.engine = eng; btn.title = eng === "p5" ? "p5.js" : "three.js";
    engineSwitch.appendChild(btn);
  });
  menubar.appendChild(engineSwitch);
  wrap.appendChild(menubar);

  // 编辑器容器
  const editorWrap = el("div", "generator-editor-wrap");
  const g2 = el("div", "form-group generator-form-group");
  const ta = document.createElement("textarea");
  ta.id = "script";
  g2.appendChild(ta);
  editorWrap.appendChild(g2);
  wrap.appendChild(editorWrap);

  // AI 面板
  wrap.appendChild(buildGeneratorAIPanel());

  // 图片上传
  const g3 = el("div", "form-group");
  const fileInput = document.createElement("input");
  fileInput.type = "file"; fileInput.id = "image"; fileInput.accept = "image/*";
  const l3 = el("label", "image-label-below"); l3.textContent = T("generator.labelImage");
  const previewBox = el("div"); previewBox.id = "image-preview";
  g3.appendChild(fileInput); g3.appendChild(l3); g3.appendChild(previewBox);
  wrap.appendChild(g3);

  // 标题 + 提交
  const row = el("div", "gen-inline-row");
  const titleInput = document.createElement("input");
  titleInput.type = "text"; titleInput.id = "title";
  titleInput.placeholder = T("generator.titlePlaceholder");
  titleInput.maxLength = getMaxTitleLen();
  const submit = el("button", null, T("generator.submit"));
  submit.id = "buildBtn"; submit.type = "button";
  row.appendChild(titleInput); row.appendChild(submit);
  wrap.appendChild(row);

  // 结果区
  const result = el("div", "result");
  result.id = "result"; result.style.display = "none";
  wrap.appendChild(result);

  return wrap;
}

function buildGeneratorAIPanel() {
  const frag = document.createDocumentFragment();
  const bar = el("div", "gen-ai-bar gen-ai-bar-bare");
  const picker = el("div", "ai-model-picker");
  const modelBtn = el("button", "ai-model-btn", "+");
  modelBtn.id = "genModelBtn"; modelBtn.type = "button"; modelBtn.title = T("gen.modelPickerTitle");
  const menu = el("div", "ai-model-menu"); menu.id = "genModelMenu";
  picker.appendChild(modelBtn); picker.appendChild(menu);
  const input = document.createElement("textarea");
  input.id = "genInput"; input.rows = 1; input.placeholder = T("gen.placeholder");
  const sendBtn = el("button", "ai-send-btn", "↑");
  sendBtn.id = "genSendBtn"; sendBtn.type = "button"; sendBtn.title = T("gen.sendTitle");
  bar.appendChild(picker); bar.appendChild(input); bar.appendChild(sendBtn);
  const status = el("div", "gen-status"); status.id = "genStatus";
  frag.appendChild(status); frag.appendChild(bar);
  return frag;
}

function genStatusClear() {
  const box = $("#genStatus");
  if (box) box.replaceChildren();
}
function genStatusLine(text, kind) {
  const box = $("#genStatus");
  if (!box) return;
  box.appendChild(el("div", "gen-status-line" + (kind ? " " + kind : ""), text));
  while (box.children.length > 12) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}
function genSetBusy(busy) {
  genState.busy = busy;
  const btn = $("#genSendBtn");
  if (btn) btn.disabled = !!busy;
}

function genApplyCode(code, intent) {
  const ed = getEditor();
  if (!ed || !code) return;
  if (intent === "append") {
    const cur = ed.getValue() || "";
    ed.setValue(cur.trim() ? cur + "\n\n" + code : code);
  } else ed.setValue(code);
  generatorDraft.script = ed.getValue();
  saveDraft();
}
function userTextHasCode(text) {
  if (!text) return false;
  if (/```/.test(text)) return true;
  if (/function\s+setup\s*\(/.test(text)) return true;
  if (/function\s+draw\s*\(/.test(text)) return true;
  return false;
}

function genRunLoop(userIntent, userText) {
  const model = aiState.currentModel;
  const key = aiState.keys[model];
  const conf = aiModelConf(model);
  if (!conf || !conf.supportsTools) {
    genStatusLine(T("gen.statusModelNoTools"), "error");
    genSetBusy(false);
    return;
  }

  genState.messages = [];
  const sysKey = generatorDraft.engine === "three" ? "gen.systemPromptThree" : "gen.systemPrompt";
  genState.messages.push({ role: "system", content: T(sysKey) });

  let userContent = "[intent: " + userIntent + "]\n";
  if (uploadedImageRef.dataUrl) {
    const info = uploadedImageRef.info;
    const w = info && info.width ? info.width : "?";
    const h = info && info.height ? info.height : "?";
    userContent += "[图片已上传 | 尺寸: " + w + "×" + h + "]\n";
  }
  if (userIntent === "modify") {
    const ed = getEditor();
    if (ed && !userTextHasCode(userText)) {
      const currentCode = ed.getValue() || "";
      if (currentCode.trim()) userContent += "\n当前代码：\n```js\n" + currentCode + "\n```\n";
    }
  }
  userContent += "\n用户要求：" + userText;

  const useVision = !!uploadedImageRef.dataUrl && conf.vision === true;
  if (useVision) {
    genState.messages.push({ role: "user", content: [
      { type: "text", text: userContent },
      { type: "image_url", image_url: { url: uploadedImageRef.dataUrl } },
    ] });
  } else genState.messages.push({ role: "user", content: userContent });

  genStatusClear();
  genStatusLine(T("gen.statusRequest", { model: aiModelName(model) }));
  genState.streamToken += 1;
  const myToken = genState.streamToken;
  if (genState.abortController) { try { genState.abortController.abort(); } catch (e) {} }
  genState.abortController = new AbortController();
  const mySignal = genState.abortController.signal;

  let loopCount = 0;
  function runOne() {
    loopCount += 1;
    if (loopCount > getMaxToolLoop()) {
      genStatusLine(T("gen.statusMaxLoop"), "warn");
      genSetBusy(false);
      return;
    }
    let accumulated = "";
    const acc = createStructuredAccumulator();
    const onDelta = (obj) => {
      if (conf.protocol === "gemini") {
        const cand = obj.candidates && obj.candidates[0];
        if (cand && cand.content && cand.content.parts) {
          for (let i = 0; i < cand.content.parts.length; i++) {
            const p = cand.content.parts[i];
            if (p && typeof p.text === "string") accumulated += p.text;
          }
        }
      } else {
        const ch = obj.choices && obj.choices[0];
        if (ch && ch.delta && typeof ch.delta.content === "string") accumulated += ch.delta.content;
      }
    };
    streamAI({
      model, key,
      messages: genState.messages.slice(),
      systemPrompt: null,
      onDelta, onRaw: (obj) => acc.consume(obj),
      tools: true, toolSpecs: TOOL_SPECS,
      signal: mySignal,
    }).then(() => {
      if (genState.streamToken !== myToken) return;
      const meta = acc.finalize();
      if (meta.tool_calls && meta.tool_calls.length) {
        genState.messages.push({ role: "assistant", content: accumulated || null, tool_calls: meta.tool_calls });
        meta.tool_calls.forEach((tc) => {
          const name = tc.function.name;
          let args = {};
          try { args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments || {}; }
          catch (e) { args = {}; }
          genStatusLine(T("gen.statusToolCall", { name }));
          const res = executeToolCall(name, args);
          const display = res.displayText ? res.displayText : res.text;
          genStatusLine(T("gen.statusToolDone", { result: display }), res.ok ? "ok" : "error");
          genState.messages.push({ role: "tool", tool_call_id: tc.id, content: res.text });
        });
        genStatusLine(T("gen.statusSummary"));
        runOne();
        return;
      }
      if (accumulated && accumulated.trim()) {
        const code = extractCodeFromText(accumulated);
        if (code) {
          genStatusLine(T("gen.statusDegrade"), "warn");
          genApplyCode(code, userIntent);
          genStatusLine(T("gen.statusDone"), "ok");
        } else {
          genStatusLine(accumulated.trim(), "ok");
          genStatusLine(T("gen.statusNoCode"), "warn");
        }
      } else genStatusLine(T("gen.statusNoCode"), "warn");
      genSetBusy(false);
    }).catch((err) => {
      if (genState.streamToken !== myToken) return;
      const msg = String((err && err.message) || err);
      const isTimeout = err && err.name === "TimeoutError";
      const isAbort = err && (err.name === "AbortError" || err.code === 20);
      if (isTimeout) {
        genStatusLine(T("gen.statusTimeout", { sec: Math.round(getRequestTimeoutMs() / 1000) }), "error");
        genSetBusy(false); return;
      }
      if (isAbort) { genSetBusy(false); return; }
      genStatusLine(T("gen.statusError", { msg }), "error");
      genSetBusy(false);
    });
  }
  runOne();
}

function genSend() {
  if (genState.busy) return;
  const model = aiState.currentModel;
  if (!model || !aiModelConf(model)) { showAlert(T("gen.statusNoModel"), "", true); return; }
  const conf = aiModelConf(model);
  if (!conf.supportsTools) { showAlert(T("gen.statusModelNoTools"), "", true); return; }
  if (!aiState.keys[model]) { promptAPIKey(model, () => { if (aiState.keys[model]) genSend(); }); return; }
  const input = $("#genInput");
  if (!input) return;
  const userText = (input.value || "").trim();
  if (!userText) { genStatusClear(); genStatusLine(T("gen.statusEmptyInput"), "warn"); return; }
  const ed = getEditor();
  const currentCode = ed ? ed.getValue() || "" : "";
  const hasContent = currentCode.trim().length > 0;
  const doSend = (intent) => { input.value = ""; input.style.height = "auto"; genSetBusy(true); genRunLoop(intent, userText); };
  if (!hasContent) {
    if (userTextHasCode(userText)) doSend("modify"); else doSend("overwrite");
  } else {
    showIntentChoice(T("gen.editorNotEmptyTitle"), T("gen.editorNotEmptyBody"), () => doSend("overwrite"), () => doSend("modify"));
  }
}

function compressImage(dataUrl, maxDim, quality, callback) {
  const img = new Image();
  img.onload = () => {
    try {
      const w0 = img.naturalWidth, h0 = img.naturalHeight;
      const scale = Math.min(1, maxDim / Math.max(w0, h0));
      const w = Math.max(1, Math.round(w0 * scale));
      const h = Math.max(1, Math.round(h0 * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const out = canvas.toDataURL("image/jpeg", quality);
      callback(out && out.length < dataUrl.length ? out : dataUrl);
    } catch (e) { callback(dataUrl); }
  };
  img.onerror = () => callback(dataUrl);
  img.src = dataUrl;
}

function safeFileName(name) {
  const n = String(name || "").replace(/[\\/:*?"<>|~#%&{}]/g, "_").replace(/\s+/g, "_").trim();
  return n || "untitled";
}

export function bindGenerator() {
  const titleInput = $("#title");
  const textarea = $("#script");
  const fileInput = $("#image");
  const previewEl = $("#image-preview");
  const buildBtn = $("#buildBtn");
  uploadedImageRef.dataUrl = null;
  uploadedImageRef.info = null;
  loadDraft();
  if (titleInput) titleInput.value = generatorDraft.title || "";
  destroyEditor();

  const ed = createEditor(textarea, { mode: "javascript", lineNumbers: true, tabSize: 2, indentUnit: 2, autofocus: true });
  if (!ed) return;
  if (generatorDraft.script) ed.setValue(generatorDraft.script);

  const cmWrapper = ed.getWrapperElement();
  if (getComputedStyle(cmWrapper).position === "static") cmWrapper.style.position = "relative";
  const cmPlaceholderEl = el("div", "cm-placeholder-overlay");
  cmWrapper.appendChild(cmPlaceholderEl);
  const gutters = cmWrapper.querySelector(".CodeMirror-gutters");
  cmPlaceholderEl.style.left = (gutters ? gutters.offsetWidth + 8 : 44) + "px";

  function updateCmPlaceholder() {
    cmPlaceholderEl.textContent = generatorDraft.engine === "three"
      ? T("generator.scriptPlaceholderThree")
      : T("generator.scriptPlaceholder");
    cmPlaceholderEl.style.display = ed.getValue().length === 0 ? "block" : "none";
  }
  ed.on("change", updateCmPlaceholder);
  ed.on("optionChange", () => {
    const g = cmWrapper.querySelector(".CodeMirror-gutters");
    if (g) cmPlaceholderEl.style.left = g.offsetWidth + 8 + "px";
  });
  updateCmPlaceholder();
  ed.on("change", () => { generatorDraft.script = ed.getValue(); saveDraft(); });

  if (titleInput) titleInput.addEventListener("input", function () { generatorDraft.title = this.value; saveDraft(); });

  // 引擎切换
  const engineBtns = $$(".engine-switch-menubar button");
  engineBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.dataset.engine;
      if (generatorDraft.engine === next) return;
      const applyEngine = () => {
        generatorDraft.engine = next;
        saveDraft();
        engineBtns.forEach((b) => b.classList.toggle("active", b.dataset.engine === next));
        updateCmPlaceholder();
      };
      if (ed.getValue().trim()) {
        showConfirm(T("generator.engineSwitchTitle"), T("generator.engineSwitchBody"), applyEngine);
      } else applyEngine();
    });
  });

  // 图片上传
  if (fileInput) {
    fileInput.addEventListener("change", function () {
      const file = this.files && this.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { showAlert(T("page.badImageTitle"), T("page.badImageBody"), true); this.value = ""; return; }
      const maxBytes = getMaxImageBytes();
      if (file.size > maxBytes) {
        const mb = Math.round((maxBytes / 1024 / 1024) * 10) / 10;
        showAlert(T("page.imageTooLargeTitle"), T("page.imageTooLargeBody", { mb }), true);
        this.value = ""; return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const original = e.target.result;
        uploadedImageRef.dataUrl = null; uploadedImageRef.info = null;
        compressImage(original, 1024, 0.85, (compressed) => {
          uploadedImageRef.dataUrl = compressed;
          const tip = el("p", null, T("generator.imageOk"));
          const img = document.createElement("img");
          img.src = compressed; img.className = "preview-img"; img.alt = T("generator.imageAlt");
          if (previewEl) previewEl.replaceChildren(tip, img);
          const probe = new Image();
          probe.onload = () => { uploadedImageRef.info = { width: probe.naturalWidth, height: probe.naturalHeight }; };
          probe.onerror = () => { uploadedImageRef.info = null; };
          probe.src = compressed;
        });
      };
      reader.onerror = () => { showAlert(T("page.imageReadFailTitle"), T("page.imageReadFailBody"), true); };
      reader.readAsDataURL(file);
    });
  }

  // 提交
  if (buildBtn) {
    buildBtn.addEventListener("click", () => {
      const title = (titleInput ? titleInput.value.trim().slice(0, getMaxTitleLen()) : "") || T("generator.untitled");
      const script = (ed.getValue() || "").trim();
      if (!script) { showAlert(T("page.noScriptTitle"), T("page.noScriptBody"), true); return; }
      const imageDataUrl = uploadedImageRef.dataUrl || "";
      const htmlContent = generatePageHtml({
        engine: generatorDraft.engine,
        title, code: script, imageDataUrl: "", hasImage: !!imageDataUrl,
        maxTitleLen: getMaxTitleLen(),
      });
      const newId = Date.now() + Math.floor(Math.random() * 1000);
      const pages = getPages();
      pages.push({ id: newId, title, html: htmlContent, engine: generatorDraft.engine, timestamp: new Date().toISOString() });
      if (!savePages(pages)) return;
      if (imageDataUrl) rememberSessionImage(newId, imageDataUrl);

      import("../core/modal.js").then(({ openModal, closeModal }) => {
        openModal((box) => {
          box.appendChild(el("h3", null, T("generator.buildOk")));
          const actions = el("div", "modal-actions");
          const leftWrap = document.createElement("div");
          const closeBtn = el("button", "link-btn", T("common.cancel"));
          closeBtn.addEventListener("click", closeModal);
          leftWrap.appendChild(closeBtn);
          const rg = document.createElement("div"); rg.className = "right-group";
          const previewBtn = el("button", null, T("generator.preview"));
          previewBtn.addEventListener("click", () => { closeModal(); setPage(newId); });
          const downloadBtn = el("button", "cancel", T("generator.download"));
          downloadBtn.addEventListener("click", () => {
            downloadSingleHtml("p5_" + safeFileName(title) + "_" + newId + ".html", htmlContent);
          });
          rg.appendChild(previewBtn); rg.appendChild(downloadBtn);
          actions.appendChild(leftWrap); actions.appendChild(rg);
          box.appendChild(actions);
        });
      });

      if (titleInput) titleInput.value = "";
      ed.setValue("");
      clearDraft();
      uploadedImageRef.dataUrl = null; uploadedImageRef.info = null;
      if (previewEl) previewEl.replaceChildren();
      if (fileInput) fileInput.value = "";
    });
  }

  bindGeneratorAIPanel();
}

function bindGeneratorAIPanel() {
  const modelBtn = $("#genModelBtn");
  const menu = $("#genModelMenu");
  const input = $("#genInput");
  const sendBtn = $("#genSendBtn");
  if (modelBtn) {
    modelBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleGenMenu(); });
  }
  if (menu) {
    menu.addEventListener("click", (e) => {
      const item = e.target.closest(".ai-model-item");
      if (!item || !item.dataset.model) return;
      e.stopPropagation();
      closeGenMenu();
      aiState.currentModel = item.dataset.model;
      saveCurrentModel(aiState.currentModel);
      refreshAIModelUI();
    });
  }
  if (input) {
    input.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 120) + "px";
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault(); genSend();
      }
    });
  }
  if (sendBtn) sendBtn.addEventListener("click", () => genSend());
  refreshAIModelUI();
}