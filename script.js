const API_URL = "https://vinaccord-back.onrender.com";

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
const suggestBox    = document.getElementById("suggestBox");
const suggestForm   = document.getElementById("suggestForm");
const suggestPrenom = document.getElementById("suggestPrenom");
const suggestNom    = document.getElementById("suggestNom");
const suggestEmail  = document.getElementById("suggestEmail");
const suggestPlat   = document.getElementById("suggestPlat");
const suggestMsg    = document.getElementById("suggestMsg");
const contribForm  = document.getElementById("contribForm");
const contribName  = document.getElementById("contribName");
const contribDish  = document.getElementById("contribDish");
const contribWine  = document.getElementById("contribWine");
const contribStory = document.getElementById("contribStory");
const contribMsg   = document.getElementById("contribMsg");

const MAX_HIST = 6;
let searchHistory = JSON.parse(localStorage.getItem("vin_history") || "[]");

function saveHistory(plat) {
  searchHistory = [plat, ...searchHistory.filter(p => p !== plat)].slice(0, MAX_HIST);
  localStorage.setItem("vin_history", JSON.stringify(searchHistory));
  renderHistory();
}

function renderHistory() {
  if (!searchHistory.length) { histSection.hidden = true; return; }
  histSection.hidden = false;
  histChips.innerHTML = searchHistory.map(p => `<button class="chip" type="button">${p}</button>`).join("");
  histChips.querySelectorAll(".chip").forEach(btn =>
    btn.addEventListener("click", () => { input.value = btn.textContent; doSearch(btn.textContent); })
  );
}

let timer = null;
input.addEventListener("input", () => {
  const q = input.value.trim();
  clearTimeout(timer);
  closeDropdown();
  if (q.length < 2) return;
  timer = setTimeout(async () => {
    try {
      const res  = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const bdd  = data.bdd || [];
      if (!bdd.length) { closeDropdown(); return; }
      let html = `<li class="dropdown-header">✅ Accords personnellement testés</li>`;
      html += bdd.map(s => `<li class="dropdown-item" tabindex="0">${s}</li>`).join("");
      dropdown.hidden = false;
      dropdown.innerHTML = html;
      dropdown.querySelectorAll(".dropdown-item").forEach(item => {
        item.addEventListener("mousedown", e => { e.preventDefault(); input.value = item.textContent; closeDropdown(); });
      });
    } catch { }
  }, 250);
});

function closeDropdown() { dropdown.hidden = true; dropdown.innerHTML = ""; }
document.addEventListener("click", e => { if (!form.contains(e.target)) closeDropdown(); });

function hideAll() {
  loader.hidden = true;
  results.hidden = true;
  errorBox.hidden = true;
  suggestBox.hidden = true;
}

function showLoader()  { hideAll(); loader.hidden = false; }
function showResults() { hideAll(); results.hidden = false; }
function showError(m)  { hideAll(); errorMsg.textContent = m; errorBox.hidden = false; }

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

    if (res.status === 404) {
      hideAll();
      suggestPlat.value = plat;
      suggestPrenom.value = "";
      suggestNom.value = "";
      suggestEmail.value = "";
      suggestMsg.hidden = true;
      suggestBox.hidden = false;
      return;
    }

    if (!res.ok) { showError(data.error || "Une erreur est survenue."); return; }

    resultDish.textContent = data.plat;
    wineList.innerHTML = data.vins.map(v => {
      const mots = (data.mots_cles && data.mots_cles[v]) ? data.mots_cles[v] : [];
      const badges = mots.length > 0 ? `<div class="wine-badges">${mots.map(m => `<span class="badge">${m}</span>`).join("")}</div>` : "";
      return `<li class="wine-item"><span class="wine-dot"></span><div class="wine-info"><span class="wine-name">${v}</span>${badges}</div></li>`;
    }).join("");
    const labels = { expert: "✅ Accord personnellement testé", ingredients: "🔍 Analyse Spoonacular", gemini: "✨ Suggestion Gemini" };
    resultSrc.textContent = labels[data.source] || data.source;
    showResults();
    saveHistory(plat);
  } catch {
    showError("Impossible de joindre le serveur.");
  }
}

form.addEventListener("submit", e => { e.preventDefault(); doSearch(input.value); });
renderHistory();

if (suggestForm) {
  suggestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = suggestForm.querySelector(".suggest-btn");
    suggestMsg.hidden = true;
    btn.disabled = true;
    btn.textContent = "Envoi en cours…";
    try {
      const res = await fetch(`${API_URL}/suggestion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prenom: suggestPrenom.value.trim(), nom: suggestNom.value.trim(), email: suggestEmail.value.trim(), plat: suggestPlat.value.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        suggestMsg.textContent = data.error || "Impossible d’envoyer la suggestion.";
        suggestMsg.className = "suggest-message error";
      } else {
        suggestMsg.textContent = "🍷 Merci ! Je reviendrai vers vous dès que ce plat est ajouté.";
        suggestMsg.className = "suggest-message";
        suggestForm.reset();
      }
    } catch {
      suggestMsg.textContent = "Serveur indisponible, réessayez plus tard.";
      suggestMsg.className = "suggest-message error";
    } finally {
      suggestMsg.hidden = false;
      btn.disabled = false;
      btn.textContent = "Suggérer ce plat 🍷";
    }
  });
}

if (contribForm) {
  contribForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = contribForm.querySelector(".contrib-btn");
    contribMsg.hidden = true;
    contribMsg.className = "contrib-message";
    btn.disabled = true;
    btn.textContent = "Envoi en cours…";
    try {
      const res = await fetch(`${API_URL}/contribution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prenom: contribName.value.trim(), plat: contribDish.value.trim(), vin: contribWine.value.trim(), experience: contribStory.value.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        contribMsg.textContent = data.error || "Impossible d’envoyer votre contribution.";
        contribMsg.classList.add("error");
      } else {
        contribMsg.textContent = "🍷 Merci ! Votre accord a bien été reçu.";
        contribForm.reset();
      }
    } catch {
      contribMsg.textContent = "Serveur indisponible, réessayez plus tard.";
      contribMsg.classList.add("error");
    } finally {
      contribMsg.hidden = false;
      btn.disabled = false;
      btn.textContent = "Envoyer mon accord 🍷";
    }
  });
}
