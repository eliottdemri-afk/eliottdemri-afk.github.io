
# ── script.js avec dropdown hybride BDD + Spoonacular après 1s ───────────────
script_js = r'''const API_URL = "https://vinaccord-back.onrender.com";
// const API_URL = "http://127.0.0.1:5000";

const form        = document.getElementById("searchForm");
const input       = document.getElementById("searchInput");
const dropdown    = document.getElementById("dropdown");
const loader      = document.getElementById("loader");
const results     = document.getElementById("results");
const resultDish  = document.getElementById("resultDish");
const wineList    = document.getElementById("wineList");
const resultSrc   = document.getElementById("resultSource");
const errorBox    = document.getElementById("errorBox");
const errorMsg    = document.getElementById("errorMsg");
const histSection = document.getElementById("historySection");
const histChips   = document.getElementById("historyChips");

const MAX_HIST    = 6;
const DEFAULT_MSG = "Astuce : vous pouvez rechercher en français ou en anglais.";

// ── Historique ────────────────────────────────────────────────────────────────
let searchHistory = JSON.parse(localStorage.getItem("vin_history") || "[]");

function saveHistory(plat) {
  searchHistory = [plat, ...searchHistory.filter(p => p !== plat)].slice(0, MAX_HIST);
  localStorage.setItem("vin_history", JSON.stringify(searchHistory));
  renderHistory();
}

function renderHistory() {
  if (!searchHistory.length) { histSection.hidden = true; return; }
  histSection.hidden = false;
  histChips.innerHTML = searchHistory
    .map(p => `<button class="chip" type="button">${p}</button>`)
    .join("");
  histChips.querySelectorAll(".chip").forEach(btn =>
    btn.addEventListener("click", () => { input.value = btn.textContent; doSearch(btn.textContent); })
  );
}

// ── Dropdown hybride BDD + Spoonacular ───────────────────────────────────────
let timerBdd = null;
let timerSpoon = null;
let currentBdd = [];
let currentSpoon = [];

input.addEventListener("input", () => {
  const q = input.value.trim();
  clearTimeout(timerBdd);
  clearTimeout(timerSpoon);
  currentBdd = [];
  currentSpoon = [];
  closeDropdown();

  if (q.length < 2) return;

  // BDD immédiat (fuzzy)
  timerBdd = setTimeout(async () => {
    try {
      const res  = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}&source=bdd`);
      const data = await res.json();
      currentBdd = data.bdd || [];
      renderDropdown();
    } catch { }
  }, 250);

  // Spoonacular après 1 seconde
  timerSpoon = setTimeout(async () => {
    try {
      const res  = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}&source=spoonacular`);
      const data = await res.json();
      currentSpoon = data.spoonacular || [];
      renderDropdown();
    } catch { }
  }, 1000);
});

function renderDropdown() {
  if (!currentBdd.length && !currentSpoon.length) { closeDropdown(); return; }

  let html = "";

  if (currentBdd.length) {
    html += `<li class="dropdown-header">✅ Accords experts</li>`;
    html += currentBdd.map(s => `<li class="dropdown-item" tabindex="0">${s}</li>`).join("");
  }

  if (currentSpoon.length) {
    html += `<li class="dropdown-header">🔍 Suggestions Spoonacular</li>`;
    html += currentSpoon.map(s => `<li class="dropdown-item" tabindex="0">${s}</li>`).join("");
  }

  dropdown.hidden  = false;
  dropdown.innerHTML = html;

  dropdown.querySelectorAll(".dropdown-item").forEach(item => {
    item.addEventListener("mousedown", e => {
      e.preventDefault();
      input.value = item.textContent;
      closeDropdown();
    });
  });
}

function closeDropdown() {
  dropdown.hidden    = true;
  dropdown.innerHTML = "";
}

document.addEventListener("click", e => { if (!form.contains(e.target)) closeDropdown(); });

// ── Affichage ─────────────────────────────────────────────────────────────────
function setErrorBox(msg, isError = false) {
  errorMsg.textContent = msg;
  errorBox.style.borderColor = isError ? "#F5C0C0" : "#E8E1D9";
  errorBox.style.background  = isError ? "#FFF5F5" : "#F9F7F4";
}

function showLoader()  { loader.hidden = false; results.hidden = true; setErrorBox(DEFAULT_MSG); }
function showResults() { loader.hidden = true;  results.hidden = false; setErrorBox(DEFAULT_MSG); }
function showError(m)  { loader.hidden = true;  results.hidden = true;  setErrorBox(m, true); }

// ── Recherche ─────────────────────────────────────────────────────────────────
async function doSearch(query) {
  const plat = query.trim();
  if (!plat) return;
  closeDropdown();
  showLoader();

  try {
    const res  = await fetch(`${API_URL}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plat }),
    });
    const data = await res.json();
    if (!res.ok) { showError(data.error || "Une erreur est survenue."); return; }

    resultDish.textContent = data.plat;

    wineList.innerHTML = data.vins.map(v => {
      const mots = data.mots_cles && data.mots_cles[v] ? data.mots_cles[v] : [];
      const badges = mots.map(m => `<span class="badge">${m}</span>`).join("");
      return `
        <li class="wine-item">
          <span class="wine-dot"></span>
          <div class="wine-info">
            <span class="wine-name">${v}</span>
            ${badges ? `<div class="wine-badges">${badges}</div>` : ""}
          </div>
        </li>`;
    }).join("");

    const labels = { expert: "Accord testé", ingredients: "Analyse Spoonacular", claude: "Analyse GEMINI" };
    resultSrc.textContent = labels[data.source] || data.source;

    showResults();
    saveHistory(plat);
  } catch {
    showError("Impossible de joindre le serveur.");
  }
}

form.addEventListener("submit", e => { e.preventDefault(); doSearch(input.value); });
renderHistory();
'''

# ── ingredients.js avec mots-clés Gemini ─────────────────────────────────────
ingredients_js = r'''const API_URL = "https://vinaccord-back.onrender.com";
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
  chipsContainer.innerHTML = ingredients.map((ing, i) => `
    <span class="ing-chip">
      ${ing}
      <button class="ing-chip-remove" data-index="${i}" aria-label="Supprimer">✕</button>
    </span>`).join("");
  chipsContainer.querySelectorAll(".ing-chip-remove").forEach(btn =>
    btn.addEventListener("click", () => { ingredients.splice(parseInt(btn.dataset.index), 1); renderChips(); })
  );
}

function setErrorBox(msg, isError = false) {
  errorMsg.textContent = msg;
  errorBox.style.borderColor = isError ? "#F5C0C0" : "#E8E1D9";
  errorBox.style.background  = isError ? "#FFF5F5" : "#F9F7F4";
}

function showLoader()  { loader.hidden = false; results.hidden = true; setErrorBox(DEFAULT_MSG); }
function showResults() { loader.hidden = true;  results.hidden = false; setErrorBox(DEFAULT_MSG); }
function showError(m)  { loader.hidden = true;  results.hidden = true;  setErrorBox(m, true); }

findBtn.addEventListener("click", async () => {
  if (ingredients.length === 0) { setErrorBox("Ajoutez au moins un ingrédient !", true); return; }
  showLoader();
  try {
    const res  = await fetch(`${API_URL}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients }),
    });
    const data = await res.json();
    if (!res.ok) { showError(data.error || "Une erreur est survenue."); return; }

    resultDish.textContent = `Ingrédients : ${ingredients.join(", ")}`;

    wineList.innerHTML = data.vins.map(v => {
      const mots = data.mots_cles && data.mots_cles[v] ? data.mots_cles[v] : [];
      const badges = mots.map(m => `<span class="badge">${m}</span>`).join("");
      return `
        <li class="wine-item">
          <span class="wine-dot"></span>
          <div class="wine-info">
            <span class="wine-name">${v}</span>
            ${badges ? `<div class="wine-badges">${badges}</div>` : ""}
          </div>
        </li>`;
    }).join("");

    resultSrc.textContent = data.couleur ? `🎨 Profil dominant : ${data.couleur}` : "🔍 Analyse par ingrédients";
    showResults();
  } catch {
    showError("Impossible de joindre le serveur.");
  }
});
'''

with open("output/vinaccord-front/script.js", "w", encoding="utf-8") as f:
    f.write(script_js)
with open("output/vinaccord-front/ingredients.js", "w", encoding="utf-8") as f:
    f.write(ingredients_js)
print("script.js OK")
print("ingredients.js OK")
