/** core/theme.js — 亮/暗主题（与 state/editor.js 有函数级互引，可接受） */
import { storageSet, THEME_KEY, storageGet } from "./storage.js";
import { getEditor } from "../state/editor.js";

function cmThemeName(theme) { return theme === "dark" ? "dracula" : "duotone-light"; }

export function applyTheme(theme) {
  const isDark = theme === "dark";
  if (isDark) document.documentElement.classList.add("dark-mode");
  else document.documentElement.classList.remove("dark-mode");

  const ed = getEditor();
  if (ed) { try { ed.setOption("theme", cmThemeName(theme)); } catch (e) {} }
}

export function currentTheme() {
  return document.documentElement.classList.contains("dark-mode") ? "dark" : "light";
}

export function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  storageSet(THEME_KEY, next);
}

export function loadSavedTheme() { return storageGet(THEME_KEY, "light"); }