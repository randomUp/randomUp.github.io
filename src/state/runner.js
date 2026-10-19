/** state/runner.js — 首页运行器状态 */
import { getRoute, setHash } from "../core/nav.js";

export const runner = { mode: "random", pageId: null, tempHtml: null };
export const randomFileRef = { current: null };

export function setRandom() {
  runner.mode = "random"; runner.pageId = null; runner.tempHtml = null;
  setHash("/");
}
export function setPage(id) {
  runner.mode = "page"; runner.pageId = id; runner.tempHtml = null;
  setHash("/");
}
export function setTemp(html) {
  runner.mode = "temp"; runner.tempHtml = html; runner.pageId = null;
  setHash("/");
}
export function isOnHome() { return getRoute() === "/"; }