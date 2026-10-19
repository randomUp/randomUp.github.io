/** ai/tools.js — 工具规格与执行器 */
import { T } from "../core/i18n.js";
import { getMaxTitleLen } from "../core/settings.js";
import { generatePageHtml } from "../core/page-html.js";
import { getEditor, getEditorValue } from "../state/editor.js";
import { generatorDraft, saveDraft, genState, uploadedImageRef } from "../state/gen-state.js";
import { getPages, savePages, rememberSessionImage } from "../state/pages-state.js";
import { setTemp } from "../state/runner.js";

export const TOOL_SPECS = [
  { name: "insert_code", description: "用新代码完全替换编辑器中的内容。适用于：从零开始写、要求重写、修改较大时。", params: { type: "object", properties: { code: { type: "string", description: "完整的 p5.js / three.js 代码，不要加 markdown 代码块标记" } }, required: ["code"] } },
  { name: "append_code", description: "在编辑器现有内容末尾追加代码。适用于：用户明确说“追加”“再加一段”“在末尾添加”时。", params: { type: "object", properties: { code: { type: "string", description: "要追加的代码片段" } }, required: ["code"] } },
  { name: "get_current_code", description: "读取编辑器当前内容。", params: { type: "object", properties: {} } },
  { name: "replace_selection", description: "替换编辑器当前选中的文本。", params: { type: "object", properties: { code: { type: "string", description: "替换选中内容的代码片段" } }, required: ["code"] } },
  { name: "get_canvas_size", description: "获取当前编辑器代码中的画布尺寸（p5 专用）。three.js 模式下返回 N/A。", params: { type: "object", properties: {} } },
  { name: "set_color_palette", description: "设置配色方案。", params: { type: "object", properties: { colors: { type: "array", description: "颜色数组，RGB 十六进制字符串", items: { type: "string" } } }, required: ["colors"] } },
  { name: "save_page", description: "保存当前编辑器内容为作品。", params: { type: "object", properties: { title: { type: "string", description: "作品标题，可选" } } } },
  { name: "open_preview", description: "打开当前编辑器内容的预览。", params: { type: "object", properties: {} } },
];

export const TOOL_HANDLERS = {
  insert_code(args) {
    const code = args && typeof args.code === "string" ? args.code : "";
    const ed = getEditor();
    if (!ed) throw new Error("editor not found");
    ed.setValue(code);
    generatorDraft.script = code;
    saveDraft();
    return { ok: true, text: T("gen.toolInsert", { n: code.length }) };
  },
  append_code(args) {
    const code = args && typeof args.code === "string" ? args.code : "";
    const ed = getEditor();
    if (!ed) throw new Error("editor not found");
    const cur = ed.getValue() || "";
    const next = cur.trim().length === 0 ? code : cur + "\n\n" + code;
    ed.setValue(next);
    generatorDraft.script = next;
    saveDraft();
    return { ok: true, text: T("gen.toolAppend", { n: code.length }) };
  },
  get_current_code() {
    const v = getEditorValue();
    return { ok: true, text: v.length ? v : "(empty)", displayText: T("gen.toolRead", { n: v.length }) };
  },
  replace_selection(args) {
    const ed = getEditor();
    if (!ed) throw new Error("editor not found");
    const code = args && typeof args.code === "string" ? args.code : "";
    const sel = ed.getSelection();
    if (!sel) ed.setValue(code); else ed.replaceSelection(code);
    generatorDraft.script = ed.getValue();
    saveDraft();
    return { ok: true, text: T("gen.toolReplace", { n: code.length }) };
  },
  get_canvas_size() {
    if (generatorDraft.engine === "three") {
      return { ok: true, text: JSON.stringify({ note: "three.js 使用 renderer.setSize(w, h)，无固定画布" }), displayText: T("gen.toolCanvasNA") };
    }
    const src = getEditorValue();
    const cmNum = src.match(/createCanvas\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (cmNum) {
      const w = parseInt(cmNum[1], 10), h = parseInt(cmNum[2], 10);
      return { ok: true, text: JSON.stringify({ width: w, height: h }), displayText: T("gen.toolCanvasSize", { w, h }) };
    }
    return { ok: true, text: JSON.stringify({ width: "windowWidth", height: "windowHeight", note: "响应式画布：使用 createCanvas(windowWidth, windowHeight)" }), displayText: T("gen.toolCanvasResponsive") };
  },
  set_color_palette(args) {
    const colors = args && Array.isArray(args.colors) ? args.colors : [];
    if (!colors.length) return { ok: false, text: T("gen.toolUnknown", { name: "set_color_palette" }) };
    genState.palette = colors;
    return { ok: true, text: "已记录配色：" + colors.join(", "), displayText: T("gen.toolPalette", { n: colors.length }) };
  },
  save_page(args) {
    const ed = getEditor();
    if (!ed) throw new Error("editor not found");
    const script = ed.getValue().trim();
    if (!script) return { ok: false, text: "编辑器为空，无法保存" };
    const titleInput = document.getElementById("title");
    const inputTitle = titleInput && titleInput.value ? titleInput.value.trim() : "";
    const title = ((args && typeof args.title === "string" && args.title.trim()) ? args.title.trim() : inputTitle || T("generator.untitled")).slice(0, getMaxTitleLen());
    const imageDataUrl = uploadedImageRef.dataUrl || "";
    const html = generatePageHtml({ engine: generatorDraft.engine, title, code: script, imageDataUrl: "", hasImage: !!imageDataUrl, maxTitleLen: getMaxTitleLen() });
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const pages = getPages();
    pages.push({ id: newId, title, html, engine: generatorDraft.engine, timestamp: new Date().toISOString() });
    if (savePages(pages)) {
      if (imageDataUrl) rememberSessionImage(newId, imageDataUrl);
      return { ok: true, text: T("gen.toolSaved", { title }) };
    }
    return { ok: false, text: "保存失败" };
  },
  open_preview() {
    const script = getEditorValue().trim();
    if (!script) return { ok: false, text: "编辑器为空，无法预览" };
    const titleInput = document.getElementById("title");
    const title = (titleInput && titleInput.value ? titleInput.value.trim() : "") || T("generator.untitled");
    const html = generatePageHtml({ engine: generatorDraft.engine, title, code: script, imageDataUrl: uploadedImageRef.dataUrl || "", hasImage: false, maxTitleLen: getMaxTitleLen() });
    setTemp(html);
    return { ok: true, text: "已打开预览" };
  },
};

export function executeToolCall(toolName, args) {
  const handler = TOOL_HANDLERS[toolName];
  if (!handler) return { ok: false, text: T("gen.toolUnknown", { name: toolName }) };
  try { return handler(args); }
  catch (e) { return { ok: false, text: T("gen.toolError", { msg: String((e && e.message) || e) }) }; }
}

export function extractCodeFromText(text) {
  if (!text) return null;
  const t = String(text);
  const m;
  const jsBlocks = [];
  const reJs = /```(?:js|javascript)\s*\n([\s\S]*?)```/gi;
  while ((m = reJs.exec(t))) if (m[1]) jsBlocks.push(m[1].replace(/\s+$/, ""));
  if (jsBlocks.length) return jsBlocks.join("\n\n");
  const blocks = [];
  const re = /```\s*\n([\s\S]*?)```/g;
  while ((m = re.exec(t))) if (m[1]) blocks.push(m[1].replace(/\s+$/, ""));
  if (blocks.length) return blocks.join("\n\n");
  if (/function\s+setup\s*\(/.test(t) || /function\s+draw\s*\(/.test(t)) return t.trim();
  return null;
}