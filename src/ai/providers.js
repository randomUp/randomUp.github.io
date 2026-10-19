/** ai/providers.js — 模型请求层 */
import { getRequestTimeoutMs, getTestTimeoutMs } from "../core/settings.js";
import { T } from "../core/i18n.js";
import { aiModelConf } from "../state/ai-state.js";

function _toGeminiType(t) { return String(t || "").toUpperCase(); }
function _toGeminiSchema(schema) {
  if (!schema || typeof schema !== "object") return schema;
  const out = { type: _toGeminiType(schema.type) };
  if (schema.description) out.description = schema.description;
  if (schema.properties) {
    out.properties = {};
    Object.keys(schema.properties).forEach((k) => { out.properties[k] = _toGeminiSchema(schema.properties[k]); });
  }
  if (schema.items) out.items = _toGeminiSchema(schema.items);
  if (schema.required) out.required = schema.required.slice();
  return out;
}

export function buildOpenAITools(toolSpecs) {
  return toolSpecs.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.params } }));
}
export function buildGeminiTools(toolSpecs) {
  return [{ functionDeclarations: toolSpecs.map((t) => ({ name: t.name, description: t.description, parameters: _toGeminiSchema(t.params) })) }];
}

function _findToolCallName(msgs, toolCallId) {
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (m.role === "assistant" && m.tool_calls) {
      for (let j = 0; j < m.tool_calls.length; j++) {
        if (m.tool_calls[j].id === toolCallId) return m.tool_calls[j].function.name;
      }
    }
  }
  return "unknown";
}

export function convertToGeminiMessages(internalMsgs) {
  let systemInstruction = null;
  const contents = [];
  for (let i = 0; i < internalMsgs.length; i++) {
    const m = internalMsgs[i];
    if (m.role === "system") systemInstruction = { parts: [{ text: m.content || "" }] };
    else if (m.role === "user") {
      if (Array.isArray(m.content)) {
        const uParts = [];
        m.content.forEach((c) => {
          if (!c) return;
          if (c.type === "text") uParts.push({ text: c.text || "" });
          else if (c.type === "image_url" && c.image_url && c.image_url.url) {
            const match = /^data:([^;]+);base64,(.+)$/.exec(c.image_url.url);
            if (match) uParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
          }
        });
        contents.push({ role: "user", parts: uParts });
      } else contents.push({ role: "user", parts: [{ text: m.content || "" }] });
    } else if (m.role === "assistant") {
      if (m.tool_calls && m.tool_calls.length) {
        const parts = [];
        m.tool_calls.forEach((tc) => {
          let argsObj = {};
          try { argsObj = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments || {}; }
          catch (e) { argsObj = {}; }
          parts.push({ functionCall: { name: tc.function.name, args: argsObj } });
        });
        contents.push({ role: "model", parts });
      } else contents.push({ role: "model", parts: [{ text: m.content || "" }] });
    } else if (m.role === "tool") {
      const tcName = _findToolCallName(internalMsgs, m.tool_call_id);
      contents.push({ role: "function", parts: [{ functionResponse: { name: tcName, response: { result: m.content || "" } } }] });
    }
  }
  return { systemInstruction, contents };
}

export function createStructuredAccumulator() {
  const meta = { id: null, model: null, created: null, finish_reason: null, usage: null, tool_calls: null };
  const tcBuf = {};
  const geminiSigCount = {};
  let hasToolCall = false;

  function consume(obj) {
    if (!obj || obj === "[DONE]") return;
    if (obj.id && !meta.id) meta.id = obj.id;
    if (obj.model && !meta.model) meta.model = obj.model;
    if (obj.created && !meta.created) meta.created = obj.created;
    if (obj.usage) meta.usage = obj.usage;

    const ch = obj.choices && obj.choices[0];
    if (ch) {
      if (ch.finish_reason) meta.finish_reason = ch.finish_reason;
      const delta = ch.delta || {};
      const tcs = delta.tool_calls;
      if (tcs && tcs.length) {
        hasToolCall = true;
        tcs.forEach((t) => {
          const idx = t.index != null ? t.index : 0;
          if (!tcBuf[idx]) tcBuf[idx] = { id: "", type: "function", function: { name: "", arguments: "" } };
          const buf = tcBuf[idx];
          if (t.id) buf.id = t.id;
          if (t.type) buf.type = t.type;
          if (t.function) {
            if (t.function.name) buf.function.name += t.function.name;
            if (t.function.arguments) buf.function.arguments += t.function.arguments;
          }
        });
      }
    }
    const cand = obj.candidates && obj.candidates[0];
    if (cand) {
      if (cand.finishReason && !meta.finish_reason) meta.finish_reason = cand.finishReason;
      if (cand.content && cand.content.parts) {
        cand.content.parts.forEach((p) => {
          if (!p.functionCall) return;
          hasToolCall = true;
          const name = p.functionCall.name || "";
          const args = p.functionCall.args || {};
          const sig = name + "|" + JSON.stringify(args);
          geminiSigCount[sig] = (geminiSigCount[sig] || 0) + 1;
          const idx = "g:" + sig + "#" + geminiSigCount[sig];
          tcBuf[idx] = { id: "call_" + Date.now() + "_" + idx, type: "function", function: { name, arguments: JSON.stringify(args) } };
        });
      }
    }
    if (obj.usageMetadata) {
      meta.usage = {
        prompt_tokens: obj.usageMetadata.promptTokenCount,
        completion_tokens: obj.usageMetadata.candidatesTokenCount,
        total_tokens: obj.usageMetadata.totalTokenCount,
      };
    }
  }

  function finalize() {
    if (hasToolCall) {
      const arr = [];
      Object.keys(tcBuf).sort((a, b) => {
        if (typeof a === "number" && typeof b === "number") return a - b;
        if (typeof a === "number") return -1;
        if (typeof b === "number") return 1;
        return String(a).localeCompare(String(b));
      }).forEach((k) => {
        const t = tcBuf[k];
        if (t.function && t.function.name) arr.push(t);
      });
      if (arr.length) meta.tool_calls = arr;
    }
    return meta;
  }
  return { consume, finalize };
}

export function streamAI(opts) {
  const { model, key, messages, systemPrompt, onDelta, onRaw, tools, toolSpecs, signal: extSignal } = opts;
  const conf = aiModelConf(model);
  if (!conf) return Promise.reject(new Error("unknown model: " + model));
  const enableTools = !!tools;
  let url, options;

  if (conf.protocol === "gemini") {
    const conv = convertToGeminiMessages(messages);
    const body = { contents: conv.contents };
    if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };
    else if (conv.systemInstruction) body.systemInstruction = conv.systemInstruction;
    if (enableTools && toolSpecs) body.tools = buildGeminiTools(toolSpecs);
    url = conf.endpoint.replace(":generateContent", ":streamGenerateContent") + "?alt=sse&key=" + encodeURIComponent(key);
    options = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  } else {
    const msgs = [];
    if (systemPrompt) msgs.push({ role: "system", content: systemPrompt });
    messages.forEach((m) => msgs.push(m));
    url = conf.endpoint;
    const reqBody = { model: conf.apiModel, messages: msgs, stream: true, stream_options: { include_usage: true } };
    if (enableTools && toolSpecs) reqBody.tools = buildOpenAITools(toolSpecs);
    options = {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify(reqBody),
    };
  }

  const timeoutCtl = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    try { timeoutCtl.abort(); } catch (e) {}
  }, getRequestTimeoutMs());

  const baseSignal = extSignal || null;
  if (baseSignal) {
    const combined = new AbortController();
    const onAbort = () => { try { combined.abort(); } catch (e) {} };
    if (baseSignal.aborted || timeoutCtl.signal.aborted) onAbort();
    else {
      baseSignal.addEventListener("abort", onAbort, { once: true });
      timeoutCtl.signal.addEventListener("abort", onAbort, { once: true });
    }
    options.signal = combined.signal;
  } else {
    options.signal = timeoutCtl.signal;
  }

  return fetch(url, options).then((res) => {
    if (!res.ok) {
      return res.text().then((t) => {
        let msg = "HTTP " + res.status;
        try {
          const d = JSON.parse(t);
          msg = (d.error && d.error.message) || d.message || (d.error && d.error.status) || msg;
        } catch (e) {}
        throw new Error(msg);
      });
    }
    if (!res.body || !res.body.getReader) throw new Error(T("chat.errStreamUnsupported"));
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    function dispatchData(data) {
      if (!data) return;
      if (data === "[DONE]") { if (onRaw) onRaw("[DONE]"); return; }
      try {
        const obj = JSON.parse(data);
        if (onRaw) onRaw(obj);
        if (onDelta) onDelta(obj);
      } catch (e) {}
    }
    function processBuffer(flush) {
      if (buffer.indexOf("\r") !== -1) buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      let sepIndex;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const evt = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        const lines = evt.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.indexOf("data:") === 0) dispatchData(line.slice(5).trim());
        }
      }
      if (flush && buffer.trim()) {
        const tail = buffer.trim();
        if (tail.indexOf("data:") === 0) dispatchData(tail.slice(5).trim());
        buffer = "";
      }
    }
    function pump() {
      return reader.read().then((result) => {
        if (result.done) { processBuffer(true); return; }
        buffer += decoder.decode(result.value, { stream: true });
        processBuffer(false);
        return pump();
      });
    }
    return pump();
  }).catch((err) => {
    if (timedOut) { const e = new Error("REQUEST_TIMEOUT"); e.name = "TimeoutError"; throw e; }
    throw err;
  }).finally(() => clearTimeout(timeoutId));
}

export function testAIModelConnection(model) {
  const conf = aiModelConf(model);
  if (!conf) return;
  return function runTest(key) {
    let url, body, headers;
    if (conf.protocol === "gemini") {
      url = conf.endpoint + (conf.endpoint.indexOf("?") === -1 ? "?key=" : "&key=") + encodeURIComponent(key);
      body = { contents: [{ role: "user", parts: [{ text: "hi" }] }] };
      headers = { "Content-Type": "application/json" };
    } else {
      url = conf.endpoint;
      body = { model: conf.apiModel, messages: [{ role: "user", content: "hi" }], max_tokens: 1 };
      headers = { "Content-Type": "application/json", Authorization: "Bearer " + key };
    }
    const testAbort = new AbortController();
    const timeoutId = setTimeout(() => { try { testAbort.abort(); } catch (e) {} }, getTestTimeoutMs());

    return fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: testAbort.signal })
      .then((res) => {
        clearTimeout(timeoutId);
        return res.text().then((t) => {
          if (res.ok) return { ok: true };
          let msg = "HTTP " + res.status;
          try {
            const d = JSON.parse(t);
            msg = (d.error && d.error.message) || d.message || (d.error && d.error.status) || msg;
          } catch (e) {}
          return { ok: false, message: msg };
        });
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        let msg = String((err && err.message) || err);
        if (err && err.name === "AbortError") {
          msg = T("test.timeout", { sec: Math.round(getTestTimeoutMs() / 1000) });
        }
        return { ok: false, message: msg };
      });
  };
}