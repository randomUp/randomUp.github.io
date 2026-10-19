/** core/download.js — 通用下载工具 */
export function triggerDownload(content, mime, filename) {
  try {
    const encoded = btoa(unescape(encodeURIComponent(content)));
    const url = "data:" + mime + ";base64," + encoded;
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.style.display = "none";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  } catch (e) {
    try {
      const blob = new Blob([content], { type: mime });
      const burl = URL.createObjectURL(blob);
      const b = document.createElement("a");
      b.href = burl; b.download = filename; b.style.display = "none";
      document.body.appendChild(b); b.click(); document.body.removeChild(b);
      setTimeout(() => URL.revokeObjectURL(burl), 1000);
    } catch (err) {}
  }
}
export function downloadSingleHtml(filename, html) {
  triggerDownload(html, "text/html;charset=utf-8", filename);
}