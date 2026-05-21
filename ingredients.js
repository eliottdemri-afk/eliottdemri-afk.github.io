const API_URL = "https://vinaccord-back.onrender.com";
// const API_URL = "http://127.0.0.1:5000";

const form           = document.getElementById("ingredientForm");
const input          = document.getElementById("ingredientInput");
const chipsWrap      = document.getElementById("chipsWrap");
const chipsContainer = document.getElementById("ingredientChips");
const findBtn        = document.getElementById("findBtn");
const loader         = document.getElementById("loader");
const results        = document.getElementById("results");
const resultDish     = document.getElementById("resultDish");
const wineList       = document.getElementById("wineList");
const resultSrc      = document.getElementById("resultSource");
const errorBox       = document.getElementById("errorBox");
const errorMsg       = document.getElementById("errorMsg");

const DEFAULT_MSG = "Ajoutez vos ingrédients un par un, en français ou en anglais.";
let ingredients = [];

form.addEventListener("submit", e => {
  e.preventDefault();
  const val = input.value.trim();
  if (!val || ingredients.includes(val.toLowerCase())) { input.value = ""; return; }
  ingredients.push(val.toLowerCase());
  input.value = "";
  renderChips();
});

function renderChips() {
  chipsWrap.hidden = ingredients.length === 0;
  chipsContainer.innerHTML = ingredients.map((ing, i) =>
    `<span class="ing-chip">${ing}<button class="ing-chip-remove" data-index="${i}" aria-label="Supprimer">✕</button></span>`
  ).join("");
  chipsContainer.querySelectorAll(".ing-chip-remove").forEach(btn =>
    btn.addEventListener("click", () => { ingredients.splice(parseInt(btn.dataset.index), 1); renderChips(); })
  );
}

function setErrorBox(msg, isError = false) {
  errorMsg.textContent = msg;
  errorBox.style.borderColor = isError ? "#F5C0C0" : "rgba(255,255,255,.2)";
  errorBox.style.background  = isError ? "rgba(200,0,0,.15)" : "rgba(255,255,255,.08)";
}

function showLoader()  { loader.hidden = false; results.hidden = true; setErrorBox(DEFAULT_MSG); }
function showResults() { loader.hidden = true;  results.hidden = false; setErrorBox(DEFAULT_MSG); }
function showError(m)  { loader.hidden = true;  results.hidden = true;  setErrorBox(m, true); }

findBtn.addEventListener("click", async () => {
  if (ingredients.length === 0) { setErrorBox("Ajoutez au moins un ingrédient !", true); return; }
  showLoader();
  try {
    const res = await fetch(`${API_URL}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients }),
    });
    const data = await res.json();
    if (!res.ok) { showError(data.error || "Une erreur est survenue."); return; }
    resultDish.textContent = `Ingrédients : ${ingredients.join(", ")}`;
    wineList.innerHTML = data.vins.map(v => {
      const mots = (data.mots_cles && data.mots_cles[v]) ? data.mots_cles[v] : [];
      const badges = mots.length > 0 ? `<div class="wine-badges">${mots.map(m => `<span class="badge">${m}</span>`).join("")}</div>` : "";
      return `<li class="wine-item"><span class="wine-dot"></span><div class="wine-info"><span class="wine-name">${v}</span>${badges}</div></li>`;
    }).join("");
    resultSrc.textContent = data.couleur ? `🎨 Profil dominant : ${data.couleur}` : "🔍 Analyse par ingrédients";
    showResults();
  } catch {
    showError("Impossible de joindre le serveur.");
  }
});
