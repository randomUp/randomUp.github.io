console.log("[DIAG] main.js loaded");

document.getElementById("hamburgerBtn").addEventListener("click", () => {
  console.log("[DIAG] hamburger clicked");
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("overlay").classList.add("show");
});