
document.addEventListener("DOMContentLoaded", async () => {
  const userId = shared.getCurrentUserId() || "EMP001";
  await initMesCongesPage(userId);
});


async function initMesCongesPage(userId) {
  shared.setCurrentUserId(userId);

 
  const data = await shared.fetchData(
    { name: "UserIfon", url: "http://localhost:4000/UserIfon" },
    { name: "MyCongesPage", url: "http://localhost:4000/MyCongesPage" }
  );

  if (!data) {
    console.error("Impossible de charger les données de congés");
    return;
  }

  const user = shared.getUserById(data.UserIfon, userId);
  if (!user) {
    console.error("Utilisateur non trouvé :", userId);
    return;
  }

  shared.renderProfile(user);
  shared.renderWelcome(user);


  renderLeaveCards(userId, data);


  setupFilterButtons(userId, data);
  updateStatsSummary(userId, data);


  setupCardEvents(userId, data);
}


function updateStatsSummary(userId, data) {
  const allRequests =
    (data.MyCongesPage?.leaveRequests?.[userId]) || [];
  const requests = allRequests.filter(r => r.status !== "draft");

  const total = requests.length;
  const approved = requests.filter(r => r.status === "approved").length;
  const pending = requests.filter(r => r.status === "pending").length;
  const rejected = requests.filter(r => r.status === "rejected").length;

  const statElems = document.querySelectorAll(".stat-item .stat-number");
  if (statElems.length >= 4) {
    statElems[0].textContent = total;
    statElems[1].textContent = approved;
    statElems[2].textContent = pending;
    statElems[3].textContent = rejected;
  }
}


function renderLeaveCards(userId, data) {
  const allRequests = data.MyCongesPage?.leaveRequests?.[userId] || [];
  const requests = allRequests.filter(r => r.status !== "draft");
  renderCards(requests, userId, data);
}


function setupFilterButtons(userId, data) {
  const buttons = document.querySelectorAll(".filter-btn");
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const filterText = btn.textContent.trim().toLowerCase();
      applyFilter(filterText, userId, data);
    });
  });
}

function applyFilter(filterText, userId, data) {
  let allRequests = data.MyCongesPage?.leaveRequests?.[userId] || [];
  let filtered = allRequests.filter(r => r.status !== "draft");

  if (filterText !== "tous") {
    const map = { "approuvé": "approved", "en attente": "pending", "refusé": "rejected" };
    filtered = filtered.filter(r => r.status === map[filterText]);
  }

  renderCards(filtered, userId, data);
}


function calculateDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  const diffMs = end - start;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
}


function renderCards(requests, userId, data) {
  const container = document.querySelector(".cards-grid");
  if (!container) return;
  container.innerHTML = "";

  if (requests.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">Aucune demande trouvée.</p>';
    return;
  }

  requests.forEach(leave => {
    const statusMap = {
      approved: ["status-approuve","bi-check-circle","Approuvé"],
      pending: ["status-en-attente","bi-clock","En attente"],
      rejected: ["status-refuse","bi-x-circle","Refusé"]
    };
    const [statusClass, statusIcon, statusText] = statusMap[leave.status] || ["status-en-attente","bi-question-circle","Inconnu"];

    const titleOrType = leave.title || leave.type;
    const duration = calculateDuration(leave.startDate, leave.endDate);

    const rejectionPart = leave.status === "rejected" && leave.rejectionReason
      ? `<div class="refusal-reason"><i class="bi bi-exclamation-triangle me-1"></i><strong>Motif de refus:</strong> ${leave.rejectionReason}</div>`
      : "";

    const buttonsHtml = getCardButtons(leave);

    const cardHtml = `
      <div class="leave-card shadowdiv">
        <div class="status-badge ${statusClass}">
          <i class="bi ${statusIcon} me-1"></i>${statusText}
        </div>
        <h5><i class="bi bi-sun me-2"></i>${titleOrType}</h5>
        <p><strong>Du:</strong> ${shared.formatDate(leave.startDate)}</p>
        <p><strong>Au:</strong> ${shared.formatDate(leave.endDate)}</p>
        <p><strong>Durée:</strong> ${duration} jours</p>
        <p><strong>Type:</strong> ${leave.type || "Non spécifié"}</p>
        <p><strong>Justification:</strong> ${leave.reason || "Non spécifiée"}</p>
        ${rejectionPart}
        <div class="card-buttons">${buttonsHtml}</div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", cardHtml);
  });
}


function getCardButtons(leave) {
  const id = leave.id;
  if (leave.status === "approved") {
    return `<button class="btn btn-outline-secondary" disabled>Modifier</button>
            <button class="btn btn-outline-secondary" disabled>Annuler</button>`;
  }
  if (leave.status === "pending") {
    return `<button class="btn btn-outline-main btn-modifier" data-id="${id}">Modifier</button>
            <button class="btn btn-outline-danger btn-annuler" data-id="${id}">Annuler</button>`;
  }
  return `<button class="btn btn-main btn-renouveler" data-id="${id}">Renouveler</button>
          <button class="btn btn-outline-main btn-contacter">Contacter RH</button>`;
}


function setupCardEvents(userId, data) {
  const container = document.querySelector(".cards-grid");
  if (!container) return;

  container.addEventListener("click", async (e) => {
    const card = e.target.closest(".leave-card");
    if (!card) return;

    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    const leaveId = btn.dataset.id;

    const requests = data.MyCongesPage?.leaveRequests?.[userId] || [];
    const idx = requests.findIndex(r => String(r.id) === String(leaveId));
    if (idx === -1) return;
    const leave = requests[idx];

    if (btn.classList.contains("btn-annuler")) {
      if (!confirm("Confirmer l'annulation ?")) return;
      requests.splice(idx, 1);
      await axios.put("http://localhost:4000/MyCongesPage", { leaveRequests: { [userId]: requests } });
      renderLeaveCards(userId, data);
      updateStatsSummary(userId, data);
    }
    else if (btn.classList.contains("btn-modifier")) {
      shared.setEditRequest({ ...leave, isNew: false });
      window.location.href = "demande.html";
    }
    else if (btn.classList.contains("btn-renouveler")) {
      shared.setEditRequest({ ...leave, isNew: true });
      window.location.href = "demande.html";
    }
    else if (btn.classList.contains("btn-contacter")) {
      alert("Redirection vers le service RH...");
    }
  });
}

