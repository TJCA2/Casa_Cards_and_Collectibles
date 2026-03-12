const yearEl = document.getElementById("year");
const ctaButton = document.getElementById("cta-button");

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

if (ctaButton) {
  ctaButton.addEventListener("click", () => {
    alert("Inventory section coming soon.");
  });
}
