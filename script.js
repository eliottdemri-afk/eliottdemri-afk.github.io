const API_URL = "https://vinaccord-back.onrender.com";
// const API_URL = "http://127.0.0.1:5000"; // ← décommenter pour local

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

// ── Dropdown autocomplétion ───────────────────────────────────────────────────
let debounceTimer = null;

input.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const q = input.value.trim();
  if (q.length < 2) { closeDropdown(); return; }
  debounceTimer = setTimeout(() => fetchSuggestions(q), 250);
});

async function fetchSuggestions(q) {
  try {
    const res  = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    renderDropdown(data);
  } catch { closeDropdown(); }
}

function renderDropdown(suggestions) {
  if (!suggestions.length) { closeDropdown(); return; }
  dropdown.hidden = false;
  dropdown.innerHTML = suggestions
    .map(s => `<li class="dropdown-item" tabindex="0">${s}</li>`)
    .join("");
  dropdown.querySelectorAll(".dropdown-item").forEach(item => {
    item.addEventListener("mousedown", (e) => {
      e.preventDefault();
      input.value = item.textContent;
      closeDropdown();
    });
  });
}

function closeDropdown() {
  dropdown.hidden = true;
  dropdown.innerHTML = "";
}

document.addEventListener("click", (e) => {
  if (!form.contains(e.target)) closeDropdown();
});

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
    wineList.innerHTML = data.vins
      .map(v => `<li class="wine-item"><span class="wine-dot"></span><span class="wine-name">${v}</span></li>`)
      .join("");

    const labels = { expert: "Accord testé", ingredients: "Analyse avec Spoonacular", claude: "Analyse par poids" };
    resultSrc.textContent = labels[data.source] || data.source;

    showResults();
    saveHistory(plat);
  } catch {
    showError("Impossible de joindre le serveur.");
  }
}

form.addEventListener("submit", e => { e.preventDefault(); doSearch(input.value); });
renderHistory();
