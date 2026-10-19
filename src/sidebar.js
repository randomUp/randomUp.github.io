/** sidebar.js — 侧边栏交互 */
import { $, $$, el } from "./core/dom.js";
import { T } from "./core/i18n.js";
import { showConfirm, showPrompt } from "./core/modal.js";
import { toggleTheme } from "./core/theme.js";
import { setHash, emitRoute } from "./core/nav.js";
import { getPages, savePages, sessionImages } from "./state/pages-state.js";
import { runner, setPage, setRandom } from "./state/runner.js";
import { showSettingsDialog } from "./features/settings-dialog.js";

const SEARCH_DEBOUNCE_MS = 150;
let _searchKeyword = "";
let _searchTimer = null;
let _bound = false;
let _pagesChangedBound = false;

export function isSidebarOpen() {
  const sidebar = $("#sidebar");
  return !!(sidebar && sidebar.classList.contains("open"));
}
export function openSidebar() {
  const sidebar = $("#sidebar");
  const overlay = $("#overlay");
  const hamburger = $("#hamburgerBtn");
  if (!sidebar) return;
  sidebar.classList.add("open");
  if (overlay) overlay.classList.add("show");
  document.body.classList.add("sidebar-open");
  if (hamburger) hamburger.setAttribute("aria-expanded", "true");
}
export function closeSidebar() {
  const sidebar = $("#sidebar");
  const overlay = $("#overlay");
  const hamburger = $("#hamburgerBtn");
  if (!sidebar) return;
  sidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("show");
  document.body.classList.remove("sidebar-open");
  if (hamburger) hamburger.setAttribute("aria-expanded", "false");
}

export function updateSidebarPages() {
  const container = $("#sidebar-pages");
  if (!container) return;
  const pages = getPages();
  const kw = _searchKeyword.trim().toLowerCase();
  const filtered = kw
    ? pages.filter((p) => String(p.title || "").toLowerCase().includes(kw))
    : pages;
  if (!filtered.length) {
    const empty = el("div", "no-pages");
    empty.textContent = kw ? T("nav.noMatch") : T("nav.noScripts");
    container.replaceChildren(empty);
    return;
  }
  const frag = document.createDocumentFragment();
  filtered.forEach((page) => {
    const item = el("div", "page-item");
    const title = el("span", "page-title", page.title);
    title.dataset.action = "open"; title.dataset.id = String(page.id);
    const actions = el("div", "actions");
    const renameBtn = el("button", "rename", "✎");
    renameBtn.title = T("common.rename"); renameBtn.dataset.action = "rename"; renameBtn.dataset.id = String(page.id);
    const delBtn = el("button", "del", "✕");
    delBtn.title = T("common.delete"); delBtn.dataset.action = "delete"; delBtn.dataset.id = String(page.id);
    actions.appendChild(renameBtn); actions.appendChild(delBtn);
    item.appendChild(title); item.appendChild(actions);
    frag.appendChild(item);
  });
  container.replaceChildren(frag);
}

export function setActiveNav(path) {
  $$(".sidebar .nav-item[data-path]").forEach((node) => {
    if (node.getAttribute("data-path") === "#" + path) node.setAttribute("aria-current", "page");
    else node.removeAttribute("aria-current");
  });
}

function openPage(id) { closeSidebar(); setPage(id); }
function renamePage(id) {
  const page = getPages().find((p) => p.id === id);
  if (!page) return;
  showPrompt(T("page.renameTitle"), page.title, (newTitle) => {
    page.title = newTitle;
    savePages(getPages().map((p) => (p.id === id ? page : p)));
  });
}
function deletePage(id) {
  const page = getPages().find((p) => p.id === id);
  if (!page) return;
  showConfirm(T("page.deleteTitle"), T("page.deleteBody", { title: page.title }), () => {
    const list = getPages().filter((p) => p.id !== id);
    savePages(list);
    if (sessionImages[id]) delete sessionImages[id];
    if (runner.mode === "page" && runner.pageId === id) {
      runner.mode = "random"; runner.pageId = null; emitRoute();
    }
  }, true);
}

function bindPagesDelegation() {
  const container = $("#sidebar-pages");
  if (!container) return;
  container.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const id = Number(target.dataset.id);
    const action = target.dataset.action;
    if (action === "open") openPage(id);
    else if (action === "rename") renamePage(id);
    else if (action === "delete") deletePage(id);
  });
}

function bindSearch() {
  const input = $("#sidebarSearch");
  if (!input) return;
  input.addEventListener("input", function () {
    _searchKeyword = this.value || "";
    if (_searchTimer) clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => { _searchTimer = null; updateSidebarPages(); }, SEARCH_DEBOUNCE_MS);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (this.value) { this.value = ""; _searchKeyword = ""; updateSidebarPages(); }
      e.stopPropagation();
    } else e.stopPropagation();
  });
  input.addEventListener("click", (e) => e.stopPropagation());
}

function bindHamburger() {
  const hamburger = $("#hamburgerBtn");
  const overlay = $("#overlay");
  if (hamburger) hamburger.addEventListener("click", openSidebar);
  if (overlay) overlay.addEventListener("click", closeSidebar);
}

function bindFooterButtons() {
  const settingsBtn = $("#settingsSidebar");
  if (settingsBtn) {
    const openSettings = () => { closeSidebar(); showSettingsDialog(); };
    settingsBtn.addEventListener("click", openSettings);
    settingsBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSettings(); }
    });
  }
  const themeBtn = $("#themeToggleSidebar");
  if (themeBtn) {
    themeBtn.addEventListener("click", toggleTheme);
    themeBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTheme(); }
    });
  }
}

function bindNavItems() {
  $$(".sidebar .nav-item[data-path]").forEach((node) => {
    const go = () => {
      const path = node.getAttribute("data-path");
      if (!path) return;
      closeSidebar();
      if (path === "#/") { setRandom(); return; }
      setHash(path.replace(/^#/, ""));
    };
    node.addEventListener("click", go);
    node.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
    });
  });
}

function bindPagesChanged() {
  if (_pagesChangedBound) return;
  _pagesChangedBound = true;
  window.addEventListener("app:pagesChanged", () => updateSidebarPages());
}

export function bindSidebar() {
  if (_bound) return;
  _bound = true;
  bindSearch();
  bindHamburger();
  bindFooterButtons();
  bindNavItems();
  bindPagesDelegation();
  bindPagesChanged();
  updateSidebarPages();
}