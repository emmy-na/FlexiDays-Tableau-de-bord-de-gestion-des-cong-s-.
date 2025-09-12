// demande.js - version finale corrigée

// --- Global State ---
let SERVER_LEAVE_REQUESTS = {};
let currentUserId = null;

// --- Maps ---
const typeMap = {
  "Congés payés": "conges-payes",
  "RTT": "rtt",
  "Congé maladie": "conge-maladie",
  "Congé parental": "conge-parental",
  "Formation": "conge-formation",
  "Congé sans solde": "conge-sans-solde",
  "Autre": "autre"
};
const reverseTypeMap = Object.fromEntries(Object.entries(typeMap).map(([k,v])=>[v,k]));

// --- Init Page ---
document.addEventListener("DOMContentLoaded", async () => {
  currentUserId = shared.getCurrentUserId() || "EMP001";
  await loadServerData();
  await initDemandePage();
});

// --- Load JSON Data ---
async function loadServerData() {
  try {
    const resp = await axios.get("http://localhost:4000/MyCongesPage");
    SERVER_LEAVE_REQUESTS = resp.data?.leaveRequests || {};
  } catch(err) {
    console.warn("Error loading JSON:", err);
    SERVER_LEAVE_REQUESTS = {};
  }
}

// --- Initialize Page ---
async function initDemandePage() {
  const editRequest = shared.getEditRequest?.();
  if (editRequest) fillForm(editRequest);

  updateCarouselContent(currentUserId);

  document.getElementById("formsCarousel")?.addEventListener("click", handleCarouselClick);
  initializeFormButtons(currentUserId);
}

// --- Date Formatting ---
function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt) ? d : dt.toLocaleDateString();
}

// --- Calculate Duration ---
function calculateDuration(start, end) {
  if (!start || !end) return 0;
  const d1 = new Date(start);
  const d2 = new Date(end);
  if (isNaN(d1) || isNaN(d2) || d2 < d1) return 0;
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
}

// --- Retrieve Requests for Current User ---
function getLeaveFlatRequests(userId) {
  if (!userId) return [];
  return SERVER_LEAVE_REQUESTS[userId] || [];
}

// --- Build Leave Request ---
function buildLeaveRequest(data, status = "draft") {
  return {
    id: data.id || Date.now(),
    type: data.type || "Congé",
    startDate: data.startDate || "",
    endDate: data.endDate || "",
    duration: data.duration || 0,
    status: status,
    reason: data.reason || "",
    submittedDate: new Date().toISOString().split("T")[0],
    title: data.title || data.type || (status==="draft"?"Congé draft":"Nouvelle demande"),
    remplacant: data.remplacant || "",
    comment: data.comment || ""
  };
}

// --- Save Request to Server ---
async function saveLeaveRequestToServer(request) {
  const userId = currentUserId;
  const url = "http://localhost:4000/MyCongesPage";

  const existingRequests = SERVER_LEAVE_REQUESTS[userId] || [];
  const existingIndex = existingRequests.findIndex(r => String(r.id) === String(request.id));

  if (existingIndex !== -1) existingRequests[existingIndex] = request;
  else existingRequests.push(request);

  SERVER_LEAVE_REQUESTS[userId] = existingRequests;

  try {
    await axios.put(url, { userId, leaveRequests: SERVER_LEAVE_REQUESTS });
    return request;
  } catch(err) {
    console.warn("Error syncing JSON:", err);
    throw err;
  }
}

// --- Get Form Data ---
function getFormData() {
  const typeSelect = document.getElementById("typeConge");
  const selectedTypeText = typeSelect?.options[typeSelect.selectedIndex]?.text || "";

  return {
    startDate: document.getElementById("dateDebut")?.value || "",
    endDate: document.getElementById("dateFin")?.value || "",
    type: selectedTypeText,
    typeValue: typeSelect?.value || "",
    duration: calculateDuration(document.getElementById("dateDebut")?.value, document.getElementById("dateFin")?.value),
    remplacant: document.getElementById("remplacant")?.value || "",
    telephone: document.getElementById("telephone")?.value || "",
    reason: document.getElementById("justification")?.value || "",
    comment: document.getElementById("commentaires")?.value || "",
    title: selectedTypeText || ""
  };
}

// --- Validate Form ---
function validateForm(data) {
  const required = ['startDate','endDate','typeValue','reason'];
  const missing = required.filter(f => !data[f] || (typeof data[f]==='string' && !data[f].trim()));
  if (missing.length) {
    const names = { startDate:'Date début', endDate:'Date fin', typeValue:'Type', reason:'Justification' };
    alert("Veuillez remplir : "+missing.map(m=>names[m]||m).join(", "));
    return false;
  }
  if (data.duration <= 0) { alert("Durée invalide !"); return false; }
  return true;
}

// --- Fill Form ---
function fillForm(request) {
  if (!request) return;
  document.getElementById("dateDebut").value = request.startDate || "";
  document.getElementById("dateFin").value = request.endDate || "";
  document.getElementById("typeConge").value = request.typeValue || typeMap[request.type] || "";
  document.getElementById("duree").value = request.duration || 0;
  document.getElementById("remplacant").value = request.remplacant || "";
  document.getElementById("telephone").value = request.telephone || "";
  document.getElementById("justification").value = request.reason || "";
  document.getElementById("commentaires").value = request.comment || "";
}

// --- Render Drafts ---
function renderDrafts(container, userId) {
  if (!container || !userId) return;

  const drafts = getLeaveFlatRequests(userId).filter(r => r.status === "draft");

  if (!drafts.length) {
    container.innerHTML = '<p class="text-muted text-center">Aucun brouillon</p>';
    return;
  }

  container.innerHTML = drafts.map(d => `
    <div class="lastRequest p-3 border rounded mb-2" data-id="${d.id}">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <h6>${d.type || "Non spécifié"}</h6>
          <p class="mb-1 text-muted"><strong>Du:</strong> ${formatDate(d.startDate)} <strong>Au:</strong> ${formatDate(d.endDate)}</p>
          <p class="mb-0 text-muted"><strong>Durée:</strong> ${d.duration || 0} jours</p>
        </div>
        <div class="actions">
          <button class="btn btn-sm btn-primary edit-draft-btn" data-id="${d.id}">
            <i class="bi bi-pencil"></i> Modifier
          </button>
          <button class="btn btn-sm btn-danger delete-draft-btn" data-id="${d.id}">
            <i class="bi bi-trash"></i> Supprimer
          </button>
        </div>
      </div>
      <span class="badge bg-warning text-dark">Brouillon</span>
    </div>
  `).join("");
}

// --- Render Recent Requests ---
function renderRecentRequests(container, userId) {
  if (!container || !userId) return;

  const recent = getLeaveFlatRequests(userId).filter(r => r.status !== "draft")
    .sort((a,b)=>new Date(b.submittedDate)-new Date(a.submittedDate)).slice(0,3);

  if (!recent.length) { container.innerHTML = '<p class="text-muted text-center">Aucune demande récente</p>'; return; }

  container.innerHTML = recent.map(r => {
    const statusMap = { approved:["bg-success","Approuvé"], pending:["bg-warning text-dark","En attente"], rejected:["bg-danger","Refusé"] };
    const [cls,text] = statusMap[r.status] || ["bg-secondary","Inconnu"];
    return `
      <div class="lastRequest p-3 border rounded mb-2" data-id="${r.id}">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6>${r.title || r.type}</h6>
            <p class="mb-1 text-muted"><strong>Du:</strong> ${formatDate(r.startDate)} <strong>Au:</strong> ${formatDate(r.endDate)}</p>
            <p class="mb-0 text-muted"><strong>Durée:</strong> ${r.duration || 0} jours</p>
          </div>
          <span class="badge ${cls}">${text}</span>
        </div>
      </div>
    `;
  }).join("");
}

// --- Update Carousel & Shared Profile ---
function updateCarouselContent(userId) {
  if (!userId) return;
  const slides = document.querySelectorAll("#formsCarousel .carousel-item");
  if (!slides.length) return;

  slides.forEach((slide,index)=>{
    const container = slide.querySelector(".lastRequests");
    if (!container) return;

    if (index===0) renderDrafts(container,userId);
    else if (index===1) renderRecentRequests(container,userId);
  });

  // Update profile and welcome card using shared.js
  const currentUser = shared.getUserById(currentUserId);
  if (currentUser) {
    shared.renderProfile(currentUser);
    shared.renderWelcome(currentUser);
  }
}

// --- Handle Carousel Click (edit/delete drafts) ---
async function handleCarouselClick(e) {
  const editBtn = e.target.closest(".edit-draft-btn");
  const deleteBtn = e.target.closest(".delete-draft-btn");
  if (!editBtn && !deleteBtn) return;

  const id = editBtn?.dataset.id || deleteBtn?.dataset.id;
  const requests = getLeaveFlatRequests(currentUserId);
  const idx = requests.findIndex(r => String(r.id) === String(id));
  if (idx === -1) return;
  const request = requests[idx];

  if (editBtn) {
    fillForm(request);
    shared.setEditRequest?.(request);
  }

  if (deleteBtn && confirm("Supprimer ce brouillon ?")) {
    try {
      requests.splice(idx,1);
      SERVER_LEAVE_REQUESTS[currentUserId] = requests;

      await axios.put("http://localhost:4000/MyCongesPage", { userId: currentUserId, leaveRequests: SERVER_LEAVE_REQUESTS });
      updateCarouselContent(currentUserId);
      alert("Brouillon supprimé !");
    } catch(err) {
      console.warn(err);
      alert("Erreur lors de la suppression !");
    }
  }
}

// --- Initialize Form Buttons ---
function initializeFormButtons(userId) {
  const submitBtn = document.querySelector('.btn-primary');
  const draftBtn = document.querySelector('.btn-outline-info');
  const resetBtn = document.querySelector('.btn-outline-secondary');

  // Submit
  submitBtn?.addEventListener('click', async e=>{
    e.preventDefault();
    const data = getFormData();
    if (!validateForm(data)) return;

    const edit = shared.getEditRequest?.();
    if (edit) data.id = edit.id;

    const request = buildLeaveRequest(data,"pending");

    try {
      await saveLeaveRequestToServer(request);
      shared.clearEditRequest?.();
      document.querySelector("form")?.reset();
      updateCarouselContent(userId);
      alert("Demande soumise !");
    } catch(err) {
      console.error(err);
      alert("Erreur lors de la soumission !");
    }
  });

  // Draft
  draftBtn?.addEventListener('click', async e=>{
    e.preventDefault();
    const data = getFormData();
    const edit = shared.getEditRequest?.();
    if (edit) data.id = edit.id;

    const draft = buildLeaveRequest(data,"draft");

    try {
      await saveLeaveRequestToServer(draft);
      shared.setEditRequest?.(draft);
      updateCarouselContent(userId);
      alert("Brouillon enregistré !");
    } catch(err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement du brouillon !");
    }
  });

  // Reset
  resetBtn?.addEventListener('click', e=>{
    if (!confirm("Réinitialiser le formulaire ?")) { e.preventDefault(); return; }
    shared.clearEditRequest?.();
    document.querySelector("form")?.reset();
  });
}

// --- Auto-update duration ---
document.getElementById("dateDebut")?.addEventListener("change", ()=>{
  document.getElementById("duree").value = calculateDuration(document.getElementById("dateDebut").value, document.getElementById("dateFin").value);
});
document.getElementById("dateFin")?.addEventListener("change", ()=>{
  document.getElementById("duree").value = calculateDuration(document.getElementById("dateDebut").value, document.getElementById("dateFin").value);
});
