/** core/settings.js — 参数（支持 content.json 注入默认值/范围） */
import { storageGet, storageSet, SETTINGS_KEY } from "./storage.js";

export const DEFAULT_SETTINGS = {
  maxImageMB: 1.5,
  maxToolLoop: 5,
  maxContext: 30,
  requestTimeoutSec: 60,
  maxTitleLen: 60,
};
export const DEFAULT_TEST_TIMEOUT_SEC = 15;
export const DEFAULT_RANGES = {
  maxImageMB: [0.1, 100],
  maxToolLoop: [1, 20],
  maxContext: [5, 200],
  requestTimeoutSec: [10, 300],
  maxTitleLen: [10, 200],
};

let _defaultsFromContent = {};
let _rangesFromContent = {};
let _testTimeoutSecFromContent = null;

export function setSettingsFromContent(section) {
  if (!section || typeof section !== "object") return;
  if (section.defaults && typeof section.defaults === "object") {
    Object.keys(section.defaults).forEach((k) => {
      if (typeof section.defaults[k] === "number") _defaultsFromContent[k] = section.defaults[k];
    });
    if (typeof section.defaults.testTimeoutSec === "number") {
      _testTimeoutSecFromContent = section.defaults.testTimeoutSec;
    }
  }
  if (section.ranges && typeof section.ranges === "object") {
    Object.keys(section.ranges).forEach((k) => {
      const r = section.ranges[k];
      if (Array.isArray(r) && r.length === 2) _rangesFromContent[k] = [Number(r[0]), Number(r[1])];
    });
  }
}

function _currentDefaults() { return Object.assign({}, DEFAULT_SETTINGS, _defaultsFromContent); }
function _currentRanges() { return Object.assign({}, DEFAULT_RANGES, _rangesFromContent); }

let state = { ...DEFAULT_SETTINGS };

function _apply(s) {
  if (!s || typeof s !== "object") return;
  if (typeof s.maxImageMB === "number") state.maxImageMB = s.maxImageMB;
  if (typeof s.maxToolLoop === "number") state.maxToolLoop = s.maxToolLoop;
  if (typeof s.maxContext === "number") state.maxContext = s.maxContext;
  if (typeof s.requestTimeoutSec === "number") state.requestTimeoutSec = s.requestTimeoutSec;
  if (typeof s.maxTitleLen === "number") state.maxTitleLen = s.maxTitleLen;
}

export function loadSettings() {
  const v = storageGet(SETTINGS_KEY, null);
  if (v && typeof v === "object") _apply(v);
  else _apply(_currentDefaults());
}

export function saveSettings(obj) {
  const merged = Object.assign({}, state, obj || {});
  storageSet(SETTINGS_KEY, merged);
  _apply(merged);
  const titleInput = document.getElementById("title");
  if (titleInput && titleInput.maxLength !== state.maxTitleLen) {
    titleInput.maxLength = state.maxTitleLen;
  }
}

export function getSettingsSnapshot() { return { ...state }; }
export function getSettingsRanges() { return _currentRanges(); }
export function getMaxImageBytes() { return state.maxImageMB * 1024 * 1024; }
export function getMaxToolLoop() { return state.maxToolLoop; }
export function getMaxContext() { return state.maxContext; }
export function getRequestTimeoutMs() { return state.requestTimeoutSec * 1000; }
export function getMaxTitleLen() { return state.maxTitleLen; }
export function getTestTimeoutMs() {
  const sec = _testTimeoutSecFromContent != null ? _testTimeoutSecFromContent : DEFAULT_TEST_TIMEOUT_SEC;
  return sec * 1000;
}