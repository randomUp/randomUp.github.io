/** state/ai-state.js — AI 状态单例 */
import {
  storageGet, storageSet, storageRemove,
  AI_KEY_STORAGE, AI_CHAT_STORAGE, AI_PROMPT_STORAGE,
  AI_CUSTOM_MODELS_STORAGE, AI_CURRENT_MODEL_STORAGE,
} from "../core/storage.js";

export const AI_MODELS = [];

export function setAI_MODELS(arr) {
  AI_MODELS.length = 0;
  if (Array.isArray(arr)) for (let i = 0; i < arr.length; i++) AI_MODELS.push(arr[i]);
}

export const aiState = {
  currentModel: null, keys: {}, chats: {}, prompts: {}, customModels: [],
  busy: false, abortController: null, streamToken: 0,
};

export function getAllModels() { return AI_MODELS.concat(aiState.customModels || []); }
export function getToolModels() { return getAllModels().filter((m) => m.supportsTools === true); }
export function aiModelConf(id) {
  const all = getAllModels();
  for (let i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  return null;
}
export function aiModelName(id) { const c = aiModelConf(id); return c ? c.name : id; }

export function loadAIKeys() { const v = storageGet(AI_KEY_STORAGE, {}); return v && typeof v === "object" ? v : {}; }
export function saveAIKeys() { return storageSet(AI_KEY_STORAGE, aiState.keys); }

export function loadCurrentModel() { const v = storageGet(AI_CURRENT_MODEL_STORAGE, null); return typeof v === "string" ? v : null; }
export function saveCurrentModel(id) {
  if (id) storageSet(AI_CURRENT_MODEL_STORAGE, id); else storageRemove(AI_CURRENT_MODEL_STORAGE);
}

export function loadAIChats() {
  const result = {};
  getAllModels().forEach((m) => {
    const v = storageGet(AI_CHAT_STORAGE + "_" + m.id, []);
    result[m.id] = Array.isArray(v) ? v : [];
  });
  return result;
}
export function saveAIChats(modelId) {
  if (!modelId) return true;
  return storageSet(AI_CHAT_STORAGE + "_" + modelId, aiState.chats[modelId] || []);
}

export function loadAIPrompts() { const v = storageGet(AI_PROMPT_STORAGE, {}); return v && typeof v === "object" ? v : {}; }
export function saveAIPrompts() { return storageSet(AI_PROMPT_STORAGE, aiState.prompts); }

export function loadCustomModels() { const v = storageGet(AI_CUSTOM_MODELS_STORAGE, []); return Array.isArray(v) ? v : []; }
export function saveCustomModels() { return storageSet(AI_CUSTOM_MODELS_STORAGE, aiState.customModels || []); }

export function initAIState() {
  aiState.keys = loadAIKeys();
  aiState.customModels = loadCustomModels();
  aiState.chats = loadAIChats();
  aiState.prompts = loadAIPrompts();
  getAllModels().forEach((m) => {
    if (!Array.isArray(aiState.chats[m.id])) aiState.chats[m.id] = [];
    if (typeof aiState.prompts[m.id] !== "string") aiState.prompts[m.id] = "";
  });
  const saved = loadCurrentModel();
  aiState.currentModel = saved && aiModelConf(saved) ? saved : null;
}