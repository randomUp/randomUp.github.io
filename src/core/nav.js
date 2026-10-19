/** core/nav.js — hash 路由最小封装 */
const ROUTE_EVENT = "app:emitRoute";

export function getRoute() {
  const hash = location.hash;
  if (!hash || hash === "#" || hash === "#/") return "/";
  return hash.replace(/^#/, "") || "/";
}
export function setHash(path) {
  const target = "#" + path;
  if (location.hash === target) emitRoute();
  else location.hash = target;
}
export function emitRoute() { window.dispatchEvent(new CustomEvent(ROUTE_EVENT)); }
export function onRouteChange(handler) {
  const onHash = () => handler(getRoute());
  const onEmit = () => handler(getRoute());
  window.addEventListener("hashchange", onHash);
  window.addEventListener(ROUTE_EVENT, onEmit);
  return () => {
    window.removeEventListener("hashchange", onHash);
    window.removeEventListener(ROUTE_EVENT, onEmit);
  };
}