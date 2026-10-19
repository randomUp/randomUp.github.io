/** core/modal.js — 模态框基座 + 6 种常用对话框 */
import { $, el, rightGroup } from "./dom.js";
import { T } from "./i18n.js";

let lastFocused = null;
let focusTrapHandler = null;

function installFocusTrap(box) {
  removeFocusTrap();
  focusTrapHandler = function (e) {
    if (e.key !== "Tab") return;
    const focusables = box.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  box.addEventListener("keydown", focusTrapHandler);
}
function removeFocusTrap() {
  if (focusTrapHandler) {
    const box = $("#modalBox");
    if (box) box.removeEventListener("keydown", focusTrapHandler);
  }
  focusTrapHandler = null;
}

export function initModal() {
  const backdrop = $("#modalBackdrop");
  if (!backdrop) return;
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
}

export function isModalOpen() {
  const backdrop = $("#modalBackdrop");
  return !!(backdrop && !backdrop.hidden);
}

export function openModal(builder) {
  const backdrop = $("#modalBackdrop");
  const box = $("#modalBox");
  if (!backdrop || !box) return;
  lastFocused = document.activeElement;
  box.innerHTML = "";
  box.removeAttribute("aria-labelledby");
  builder(box);
  const h3 = box.querySelector("h3");
  if (h3) {
    if (!h3.id) h3.id = "modalTitle_" + Date.now();
    box.setAttribute("aria-labelledby", h3.id);
  }
  backdrop.hidden = false;
  backdrop.setAttribute("aria-hidden", "false");
  backdrop.classList.add("show");
  installFocusTrap(box);
  const f = box.querySelector("input, textarea, button");
  if (f && f.focus) f.focus();
}

export function closeModal() {
  removeFocusTrap();
  const backdrop = $("#modalBackdrop");
  const box = $("#modalBox");
  if (!backdrop || !box) return;
  backdrop.classList.remove("show");
  backdrop.hidden = true;
  backdrop.setAttribute("aria-hidden", "true");
  box.innerHTML = "";
  if (lastFocused && lastFocused.focus) lastFocused.focus();
}

export function showAlert(title, message, isError) {
  openModal((box) => {
    box.appendChild(el("h3", null, title));
    if (message) box.appendChild(el("p", null, message));
    const a = el("div", "modal-actions");
    const rg = rightGroup();
    const ok = el("button", isError ? "danger" : null, T("common.know"));
    ok.addEventListener("click", closeModal);
    rg.appendChild(ok);
    a.appendChild(rg);
    box.appendChild(a);
  });
}

export function showConfirm(title, message, onConfirm, danger) {
  openModal((box) => {
    box.appendChild(el("h3", null, title));
    if (message) box.appendChild(el("p", null, message));
    const a = el("div", "modal-actions");
    const rg = rightGroup();
    const cancel = el("button", "cancel", T("common.cancel"));
    cancel.addEventListener("click", closeModal);
    const ok = el("button", danger ? "danger" : null, T("common.ok"));
    ok.addEventListener("click", () => { closeModal(); onConfirm(); });
    rg.appendChild(cancel);
    rg.appendChild(ok);
    a.appendChild(rg);
    box.appendChild(a);
  });
}

export function showPrompt(title, defaultValue, onOk, inputType, hint, opts) {
  openModal((box) => {
    box.appendChild(el("h3", null, title));
    if (hint) box.appendChild(el("div", "modal-hint", hint));
    const input = document.createElement("input");
    input.type = inputType || "text";
    input.value = defaultValue || "";
    input.autocomplete = "off";
    input.spellcheck = false;
    const a = el("div", "modal-actions");
    const leftWrap = document.createElement("div");
    if (opts && opts.onClear) {
      const clearBtn = el("button", "link-btn", opts.clearText || T("common.delete"));
      clearBtn.type = "button";
      clearBtn.addEventListener("click", () => { closeModal(); opts.onClear(); });
      leftWrap.appendChild(clearBtn);
    }
    const rg = rightGroup();
    const cancel = el("button", "cancel", T("common.cancel"));
    cancel.addEventListener("click", closeModal);
    const ok = el("button", null, T("common.save"));
    ok.addEventListener("click", () => {
      const v = input.value.trim();
      if (!v) { input.focus(); return; }
      closeModal();
      onOk(v);
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") ok.click(); });
    rg.appendChild(cancel);
    rg.appendChild(ok);
    a.appendChild(leftWrap);
    a.appendChild(rg);
    box.appendChild(input);
    box.appendChild(a);
  });
}

export function showPromptArea(opts) {
  openModal((box) => {
    box.appendChild(el("h3", null, opts.title));
    box.appendChild(el("div", "modal-hint", opts.hint || T("ai.setPromptHint")));
    const ta = document.createElement("textarea");
    ta.value = opts.value || "";
    ta.placeholder = opts.placeholder || "";
    ta.rows = 7;
    ta.spellcheck = false;
    const a = el("div", "modal-actions");
    const leftWrap = document.createElement("div");
    if (opts.value && opts.value.trim()) {
      const clearBtn = el("button", "link-btn", T("ai.clearPrompt"));
      clearBtn.addEventListener("click", () => {
        closeModal();
        if (opts.onClear) opts.onClear();
      });
      leftWrap.appendChild(clearBtn);
    }
    const rg = rightGroup();
    const cancel = el("button", "cancel", T("common.cancel"));
    cancel.addEventListener("click", closeModal);
    const ok = el("button", null, T("common.save"));
    ok.addEventListener("click", () => {
      const v = ta.value;
      closeModal();
      opts.onOk(v);
    });
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ok.click(); }
    });
    rg.appendChild(cancel);
    rg.appendChild(ok);
    a.appendChild(leftWrap);
    a.appendChild(rg);
    box.appendChild(ta);
    box.appendChild(a);
  });
}

export function showIntentChoice(title, message, onOverwrite, onModify) {
  openModal((box) => {
    box.appendChild(el("h3", null, title));
    box.appendChild(el("p", null, message));
    const a = el("div", "modal-actions");
    const leftWrap = document.createElement("div");
    const cancel = el("button", "link-btn", T("common.cancel"));
    cancel.addEventListener("click", closeModal);
    leftWrap.appendChild(cancel);
    const rg = rightGroup();
    const modifyBtn = el("button", "cancel", T("gen.intentModify"));
    modifyBtn.addEventListener("click", () => { closeModal(); onModify(); });
    const overwriteBtn = el("button", "danger", T("gen.intentOverwrite"));
    overwriteBtn.addEventListener("click", () => { closeModal(); onOverwrite(); });
    rg.appendChild(modifyBtn);
    rg.appendChild(overwriteBtn);
    a.appendChild(leftWrap);
    a.appendChild(rg);
    box.appendChild(a);
  });
}