// administration.js - Version corrigée finale
document.addEventListener("DOMContentLoaded", async () => {

  // --- 1. Load JSON data - with fallback if server is not running
  let data;
  try {
    data = await shared.fetchData(
      { name: "UserIfon", url: "http://localhost:4000/UserIfon" },
      { name: "MyCongesPage", url: "http://localhost:4000/MyCongesPage" }
    );
  } catch (error) {
    console.warn("JSON Server non disponible, utilisation des données locales");
    // Fallback: try to load from local JSON file
    try {
      data = await axios.get("./db.json").then(res => res.data);
    } catch (localError) {
      console.error("Impossible de charger les données:", localError);
      alert("Erreur: Impossible de charger les données. Vérifiez que le serveur JSON est démarré ou que le fichier db.json existe.");
      return;
    }
  }

  // --- 2. Get current user ID and user object
  const currentUserId = shared.getCurrentUserId();
  const user = shared.getUserById(data.UserIfon, currentUserId);

  // --- 3. Render welcome and profile
  shared.renderWelcome(user);
  shared.renderProfile(user);

  // --- DOM elements
  const cardsContainer = document.querySelector(".cards-grid");
  const demandeEnAttenteElem = document.querySelector(".stats-row .stat-card:nth-child(1) h3");
  const approuveAujourdHuiElem = document.querySelector(".stats-row .stat-card:nth-child(2) h3");
  const employesActifsElem = document.querySelector(".stats-row .stat-card:nth-child(3) h3");

  const filtreStatut = document.getElementById("filtre-statut");
  const filtreEquipe = document.getElementById("filtre-equipe");
  const filtreType = document.getElementById("filtre-type");
  const dateDebutInput = document.getElementById("date-debut");

  const allUsers = data.UserIfon?.users || [];
  const leaveRequests = data.MyCongesPage?.leaveRequests || {};

  // Flatten all leave requests except draft
  let allLeaves = [];
  for (const userId in leaveRequests) {
    if (leaveRequests[userId] && Array.isArray(leaveRequests[userId])) {
      leaveRequests[userId].forEach(leave => {
        if (leave.status !== "draft") {
          allLeaves.push({ ...leave, userId });
        }
      });
    }
  }

  // --- Count employés actifs
  const totalEmp = allUsers.filter(u => u.id && u.id.startsWith("EMP")).length;
  if (employesActifsElem) employesActifsElem.textContent = totalEmp;

  // --- Helper: format date (using shared function)
  function formatDate(dateStr) {
    return shared.formatDate(dateStr);
  }

  // --- Calculate duration like in mesconge.js
  function calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end) || end < start) return 0;
    const diffMs = end - start;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }

  // --- Function to update card status immediately
  function updateCardStatus(card, newStatus, rejectionReason = null) {
    const statusBadge = card.querySelector('.status-badge');
    const statusMap = {
      approved: ["status-approuve", "bi-check-circle", "Approuvé"],
      rejected: ["status-refuse", "bi-x-circle", "Rejeté"]
    };
    
    const [statusClass, statusIcon, statusText] = statusMap[newStatus];
    
    // Update status badge
    statusBadge.className = `status-badge ${statusClass}`;
    statusBadge.innerHTML = `<i class="bi ${statusIcon} me-1"></i>${statusText}`;
    
    // Update card data attribute
    card.dataset.status = newStatus;
    
    // Add rejection reason if exists
    if (newStatus === "rejected" && rejectionReason) {
      const adminActions = card.querySelector('.admin-actions');
      const rejectionDiv = document.createElement('div');
      rejectionDiv.className = 'refusal-reason mt-2';
      rejectionDiv.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i><strong>Motif de refus:</strong> ${rejectionReason}`;
      adminActions.appendChild(rejectionDiv);
    }
    
    // Update buttons to disabled state
    const buttons = card.querySelectorAll('.card-buttons button');
    buttons.forEach(btn => {
      btn.disabled = true;
      btn.classList.add('disabled');
    });
    
    // Add visual feedback
    card.style.transition = 'all 0.3s ease';
    card.style.transform = 'scale(0.98)';
    setTimeout(() => {
      card.style.transform = 'scale(1)';
    }, 300);
  }

  // --- Render cards
  function renderCards(cards) {
    if (!cardsContainer) return;
    cardsContainer.innerHTML = "";

    if (cards.length === 0) {
      cardsContainer.innerHTML = '<p class="text-center text-muted">Aucune demande trouvée.</p>';
      updateStats(cards);
      return;
    }

    cards.forEach(leave => {
      const user = allUsers.find(u => u.id === leave.userId);
      let statusClass = "", statusIcon = "", statusText = "";

      // Status mapping like in mesconge.js
      const statusMap = {
        approved: ["status-approuve", "bi-check-circle", "Approuvé"],
        pending: ["status-en-attente", "bi-clock", "En attente"], 
        rejected: ["status-refuse", "bi-x-circle", "Rejeté"]
      };
      [statusClass, statusIcon, statusText] = statusMap[leave.status] || ["status-en-attente", "bi-question-circle", "Inconnu"];

      const duration = calculateDuration(leave.startDate, leave.endDate);
      const rejectionPart = leave.status === "rejected" && leave.rejectionReason
        ? `<div class="refusal-reason"><i class="bi bi-exclamation-triangle me-1"></i><strong>Motif de refus:</strong> ${leave.rejectionReason}</div>`
        : "";

      const cardHTML = `
        <div class="admin-card shadowdiv priority-medium" data-status="${leave.status}" data-userid="${leave.userId}" data-leaveid="${leave.id}">
          <div class="status-badge ${statusClass}">
            <i class="bi ${statusIcon} me-1"></i>${statusText}
          </div>
          <h5><i class="bi bi-person-badge me-2"></i>Demande de ${user?.fullName || user?.name || 'Utilisateur inconnu'}</h5>
          <div class="employee-info">
            <img src="./images/${user?.profileImage || 'default-avatar.jpg'}" alt="${user?.name || 'Profil'}">
            <span><strong>Service:</strong> ${user?.department || 'Non spécifié'}</span>
          </div>
          <p><strong>Type:</strong> ${leave.type || 'Non spécifié'}</p>
          <p><strong>Du:</strong> ${formatDate(leave.startDate)}</p>
          <p><strong>Au:</strong> ${formatDate(leave.endDate)}</p>
          <p><strong>Durée:</strong> ${duration} jours</p>
          <p><strong>Motif:</strong> ${leave.reason || 'Non spécifié'}</p>
          ${rejectionPart}
          <div class="admin-actions">
            <small class="text-muted">Soumise le ${formatDate(leave.submittedDate)}</small>
          </div>
          <div class="card-buttons">
            <button class="btn btn-success btn-approuver" ${leave.status !== "pending" ? "disabled" : ""}>
              <i class="bi bi-check-circle me-1"></i>Approuver
            </button>
            <button class="btn btn-danger btn-refuser" ${leave.status !== "pending" ? "disabled" : ""}>
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
    
    if (demandeEnAttenteElem) demandeEnAttenteElem.textContent = pendingCount;
    if (approuveAujourdHuiElem) approuveAujourdHuiElem.textContent = approvedCount;
  }

  // --- Handle approve/refuse buttons with immediate UI update
  cardsContainer.addEventListener("click", async (e) => {
    const card = e.target.closest(".admin-card");
    if (!card) return;

    const leaveId = card.dataset.leaveid;
    const userId = card.dataset.userid;
    
    // Find the leave in allLeaves array
    const leaveIndex = allLeaves.findIndex(l => String(l.id) === String(leaveId) && l.userId === userId);
    if (leaveIndex === -1) return;
    
    const leave = allLeaves[leaveIndex];
    if (leave.status !== "pending") return;

    let newStatus = null;
    let rejectionReason = null;

    if (e.target.closest(".btn-approuver")) {
      newStatus = "approved";
      console.log(`Approuver la demande ${leaveId} de l'utilisateur ${userId}`);
    } else if (e.target.closest(".btn-refuser")) {
      rejectionReason = prompt("Motif du refus (optionnel):");
      if (rejectionReason !== null) { // User didn't cancel
        newStatus = "rejected";
        console.log(`Refuser la demande ${leaveId} de l'utilisateur ${userId}`);
      }
    }

    if (newStatus) {
      // Disable buttons immediately to prevent double-click
      const buttons = card.querySelectorAll('button');
      buttons.forEach(btn => btn.disabled = true);

      try {
        // Update the leave object in allLeaves array
        allLeaves[leaveIndex].status = newStatus;
        if (rejectionReason) {
          allLeaves[leaveIndex].rejectionReason = rejectionReason;
        }

        // Update in the original leaveRequests structure
        const userLeaves = leaveRequests[userId] || [];
        const userLeaveIndex = userLeaves.findIndex(l => String(l.id) === String(leaveId));
        if (userLeaveIndex !== -1) {
          userLeaves[userLeaveIndex].status = newStatus;
          if (rejectionReason) {
            userLeaves[userLeaveIndex].rejectionReason = rejectionReason;
          }

          // Try to update the server
          try {
            // Get the current complete MyCongesPage data structure
            const currentData = await axios.get("http://localhost:4000/MyCongesPage");
            const completeData = currentData.data;
            
            // Update only this user's leave requests
            completeData.leaveRequests[userId] = userLeaves;

            // Save the complete updated structure
            await axios.put("http://localhost:4000/MyCongesPage", completeData);
            
            console.log(`✅ Demande ${leaveId} sauvegardée sur le serveur: ${newStatus}`);
          } catch (serverError) {
            console.warn("⚠️ Serveur non disponible, changements appliqués localement seulement:", serverError.message);
          }

          // Update the card immediately with new status
          updateCardStatus(card, newStatus, rejectionReason);
          
          // Update statistics
          updateStats(allLeaves);

          console.log(`✅ Demande ${leaveId} mise à jour avec succès: ${newStatus}`);
        } else {
          throw new Error("Demande non trouvée dans les données utilisateur");
        }
      } catch (error) {
        console.error("❌ Erreur détaillée:", error);
        alert(`Erreur lors de la mise à jour: ${error.message}`);
        
        // Revert the status change on error
        allLeaves[leaveIndex].status = "pending";
        if (allLeaves[leaveIndex].rejectionReason) {
          delete allLeaves[leaveIndex].rejectionReason;
        }
        
        // Re-enable buttons
        buttons.forEach(btn => btn.disabled = false);
      }
    }
  });

  // --- Filter logic - Fixed to work like mesconge.js
  function applyFilter() {
    let filtered = [...allLeaves];

    if (!filtreStatut || !filtreEquipe || !filtreType || !dateDebutInput) {
      console.warn("Certains éléments de filtre sont manquants");
      renderCards(filtered);
      return;
    }

    const statut = filtreStatut.value.toLowerCase();
    const equipe = filtreEquipe.value.toLowerCase();
    const type = filtreType.value.toLowerCase();
    const dateDebut = dateDebutInput.value;

    // Filter by status
    if (statut !== "tous") {
      const statusMap = {
        "urgent": "pending", // Map "urgent" to "pending" 
        "approuvés": "approved",
        "en attente": "pending", 
        "refusés": "rejected"
      };
      const mappedStatus = statusMap[statut] || statut;
      filtered = filtered.filter(c => c.status === mappedStatus);
    }

    // Filter by team/department
    if (equipe !== "toutes") {
      filtered = filtered.filter(c => {
        const user = allUsers.find(u => u.id === c.userId);
        const userDept = user?.department?.toLowerCase() || '';
        return userDept.includes(equipe) || userDept === equipe;
      });
    }

    // Filter by leave type
    if (type !== "tous") {
      const typeMap = {
        "congés payés": "congés payés",
        "rtt": "rtt", 
        "congé maladie": "congé maladie"
      };
      const mappedType = typeMap[type] || type;
      filtered = filtered.filter(c => {
        const leaveType = c.type?.toLowerCase() || '';
        return leaveType.includes(mappedType) || leaveType === mappedType;
      });
    }

    // Filter by start date
    if (dateDebut) {
      filtered = filtered.filter(c => {
        if (!c.startDate) return false;
        return new Date(c.startDate) >= new Date(dateDebut);
      });
    }

    renderCards(filtered);
  }

  // --- Event listeners for filters
  if (filtreStatut) filtreStatut.addEventListener("change", applyFilter);
  if (filtreEquipe) filtreEquipe.addEventListener("change", applyFilter);
  if (filtreType) filtreType.addEventListener("change", applyFilter);
  if (dateDebutInput) dateDebutInput.addEventListener("change", applyFilter);

  // --- Initial render
  renderCards(allLeaves);

  console.log("Page administration initialisée avec", allLeaves.length, "demandes");
});
