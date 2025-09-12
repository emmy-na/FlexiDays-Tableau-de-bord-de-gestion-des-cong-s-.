// administration.js
document.addEventListener("DOMContentLoaded", async () => {

  // --- 1. Load JSON data
  const data = await axios.get("./db.json").then(res => res.data);

  // --- 2. Get current user ID and user object
  const currentUserId = shared.getCurrentUserId();
  const user = shared.getUserById(data.UserIfon, currentUserId);

  // --- 3. Render welcome
  shared.renderWelcome(user);

  // --- DOM elements
  const cardsContainer = document.querySelector(".cards-grid");
  const demandeEnAttenteElem = document.querySelector(".stats-row .stat-card:nth-child(1) h3");
  const approuveAujourdHuiElem = document.querySelector(".stats-row .stat-card:nth-child(2) h3");
  const employesActifsElem = document.querySelector(".stats-row .stat-card:nth-child(3) h3");

  const filtreStatut = document.getElementById("filtre-statut");
  const filtreEquipe = document.getElementById("filtre-equipe");
  const filtreType = document.getElementById("filtre-type");
  const dateDebutInput = document.getElementById("date-debut");

  const allUsers = data.UserIfon.users || [];
  const leaveRequests = data.MyCongesPage.leaveRequests || {};

  // Flatten all leave requests except draft
  let allLeaves = [];
  for (const userId in leaveRequests) {
    leaveRequests[userId].forEach(leave => {
      if (leave.status !== "draft") allLeaves.push({ ...leave, userId });
    });
  }

  // --- Count employés actifs
  const totalEmp = allUsers.filter(u => u.id.startsWith("EMP")).length;
  employesActifsElem.textContent = totalEmp;

  // --- Helper: format date
  function formatDate(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  // --- Render cards
  function renderCards(cards) {
    cardsContainer.innerHTML = "";

    cards.forEach(leave => {
      const user = allUsers.find(u => u.id === leave.userId);
      let statusClass = "", statusIcon = "", statusText = "";

      switch (leave.status) {
        case "approved":
          statusClass = "status-approuve";
          statusIcon = "bi-check-circle";
          statusText = "Approuvé";
          break;
        case "pending":
          statusClass = "status-en-attente";
          statusIcon = "bi-clock";
          statusText = "En attente";
          break;
        case "rejected":
          statusClass = "status-refuse";
          statusIcon = "bi-x-circle";
          statusText = "Rejeté";
          break;
      }

      const cardHTML = `
        <div class="admin-card shadowdiv priority-medium" data-status="${leave.status}" data-userid="${leave.userId}" data-leaveid="${leave.id}">
          <div class="status-badge ${statusClass}">
            <i class="bi ${statusIcon} me-1"></i>${statusText}
          </div>
          <h5><i class="bi bi-person-badge me-2"></i>Demande de ${user?.fullName || user?.name}</h5>
          <div class="employee-info">
            <img src="./images/${user?.profileImage || 'default-avatar.jpg'}" alt="${user?.name}">
            <span><strong>Service:</strong> ${user?.department || '—'}</span>
          </div>
          <p><strong>Type:</strong> ${leave.type}</p>
          <p><strong>Du:</strong> ${formatDate(leave.startDate)}</p>
          <p><strong>Au:</strong> ${formatDate(leave.endDate)}</p>
          <p><strong>Durée:</strong> ${leave.duration} jours</p>
          <p><strong>Motif:</strong> ${leave.reason}</p>
          <div class="admin-actions">
            <small class="text-muted">Soumise le ${formatDate(leave.submittedDate)}</small>
          </div>
          <div class="card-buttons">
            <button class="btn btn-main btn-approuver" ${leave.status !== "pending" ? "disabled" : ""}>
              <i class="bi bi-check-circle me-1"></i>Approuver
            </button>
            <button class="btn btn-outline-danger btn-refuser" ${leave.status !== "pending" ? "disabled" : ""}>
              <i class="bi bi-x-circle me-1"></i>Refuser
            </button>
          </div>
        </div>
      `;
      cardsContainer.insertAdjacentHTML("beforeend", cardHTML);
    });

    updateStats(cards);
  }

  // --- Update stat cards
  function updateStats(cards) {
    const pendingCount = cards.filter(c => c.status === "pending").length;
    const approvedCount = cards.filter(c => c.status === "approved").length;
    demandeEnAttenteElem.textContent = pendingCount;
    approuveAujourdHuiElem.textContent = approvedCount;
  }

  // --- Handle approve/refuse buttons
  cardsContainer.addEventListener("click", e => {
    const card = e.target.closest(".admin-card");
    if (!card) return;

    const leaveId = card.dataset.leaveid;
    const leave = allLeaves.find(l => String(l.id) === String(leaveId));
    if (!leave || leave.status !== "pending") return;

    if (e.target.closest(".btn-approuver")) {
      leave.status = "approved";
    } else if (e.target.closest(".btn-refuser")) {
      leave.status = "rejected";
    }

    renderCards(allLeaves);
  });

  // --- Filter logic
  function applyFilter() {
    let filtered = [...allLeaves];

    const statut = filtreStatut.value.toLowerCase();
    const equipe = filtreEquipe.value.toLowerCase();
    const type = filtreType.value.toLowerCase();
    const dateDebut = dateDebutInput.value;

    if (statut !== "tous") filtered = filtered.filter(c => c.status.toLowerCase() === statut);
    if (equipe !== "toutes") filtered = filtered.filter(c => {
      const user = allUsers.find(u => u.id === c.userId);
      return user?.department.toLowerCase() === equipe;
    });
    if (type !== "tous") filtered = filtered.filter(c => c.type.toLowerCase() === type);
    if (dateDebut) filtered = filtered.filter(c => new Date(c.startDate) >= new Date(dateDebut));

    renderCards(filtered);
  }

  filtreStatut.addEventListener("change", applyFilter);
  filtreEquipe.addEventListener("change", applyFilter);
  filtreType.addEventListener("change", applyFilter);
  dateDebutInput.addEventListener("change", applyFilter);

  // --- Initial render
  renderCards(allLeaves);
});
