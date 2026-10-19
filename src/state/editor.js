/** state/editor.js — CodeMirror 实例（UMD，window.CodeMirror） */
import { applyTheme, currentTheme } from "../core/theme.js";

let _editor = null;
export function getEditor() { return _editor; }
export function setEditor(cm) { _editor = cm; }

export function createEditor(textarea, opts) {
  if (_editor) destroyEditor();
  const CM = window.CodeMirror;
  if (!CM) { console.error("[editor] CodeMirror 未加载，检查 index.html CDN"); return null; }
  const mergedOpts = Object.assign(
    {
      mode: "javascript", lineNumbers: true,
      theme: currentTheme() === "dark" ? "dracula" : "duotone-light",
      tabSize: 2, indentUnit: 2, autofocus: true,
    },
    opts || {},
  );
  _editor = CM.fromTextArea(textarea, mergedOpts);
  try { _editor.setSize(null, "100%"); } catch (e) {}
  return _editor;
}

export function destroyEditor() {
  if (_editor) { try { _editor.toTextArea(); } catch (e) {} _editor = null; }
}
export function refreshEditor() { if (_editor) { try { _editor.refresh(); } catch (e) {} } }
export function setEditorValue(value) { if (_editor) _editor.setValue(value); }
export function getEditorValue() { return _editor ? _editor.getValue() || "" : ""; }
export { applyTheme };