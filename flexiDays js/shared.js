const shared = {

  setCurrentUserId(userId) {
    sessionStorage.setItem("currentUserId", userId);
  },

  getCurrentUserId() {
    return sessionStorage.getItem("currentUserId");
  },


  checkAccess(userId) {
    const currentPage = window.location.pathname.split("/").pop().toLowerCase();

    const isEmployee = userId.startsWith("EMP");
    const isRH = userId.startsWith("RH");

    const employeePages = ["demande.html", "mesconge.html", "dashbord.html"];
    const rhPages = ["administration.html"];

    if (isEmployee) {
      if (!employeePages.includes(currentPage)) {
        alert("Accès refusé : redirection vers votre tableau de bord.");
        window.location.href = "dashboard.html";
      }
    } else if (isRH) {
      if (!rhPages.includes(currentPage)) {
        alert("Accès réservé au service RH. Redirection vers Administration.");
        window.location.href = "administration.html";
      }
    } else {
      alert("ID utilisateur invalide !");
      window.location.href = "index.html";
    }
  },

  setEditRequest(request) {
    sessionStorage.setItem("editRequest", JSON.stringify(request));
  },

  getEditRequest() {
    const stored = sessionStorage.getItem("editRequest");
    return stored ? JSON.parse(stored) : null;
  },

  clearEditRequest() {
    sessionStorage.removeItem("editRequest");
  },


  async fetchData(...endpoints) {
    try {
      const responses = await Promise.all(
        endpoints.map((endpoint) => axios.get(endpoint.url))
      );
      return endpoints.reduce((acc, { name }, index) => {
        acc[name] = responses[index].data;
        return acc;
      }, {});
    } catch (error) {
      console.error("Erreur de chargement JSON :", error);
      return null;
    }
  },


  getUserById(userInfo, userId) {
    if (!userInfo || !userInfo.users) return null;
    return userInfo.users.find((user) => user.id === userId);
  },


  renderProfile(user) {
    if (!user) return;

    const profileImages = document.querySelectorAll(
      ".profile-section img, .profile-mobile img"
    );
    const profileSpans = document.querySelectorAll(
      ".profile-section span, .profile-mobile span"
    );

    profileImages.forEach((img) => {
      img.src = "./images/" + (user.profileImage || "default-avatar.jpg");
      img.alt = user.name || user.fullName || "Profil utilisateur";
    });

    profileSpans.forEach((span) => {
      span.textContent = user.name || user.fullName || "Utilisateur";
    });
  },

  renderWelcome(user) {
    const welcomeName = document.getElementById("welcomeName");
    if (welcomeName && user) {
      welcomeName.textContent = user.fullName || user.name || "Utilisateur";
    }
  },


  async initializeUserInterface() {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.error("No user ID found");
      return;
    }

    try {
      // Fetch user data - adjust the endpoint URL as needed
      const data = await this.fetchData(
        { name: "users", url: "./data/users.json" }
      );

      if (data && data.users) {
        const user = this.getUserById(data.users, userId);
        if (user) {
          this.renderProfile(user);
          this.renderWelcome(user);
        } else {
          console.error("User not found:", userId);
          this.renderDefaultUser();
        }
      } else {
        console.error("Failed to load user data");
        this.renderDefaultUser();
      }
    } catch (error) {
      console.error("Error initializing user interface:", error);
      this.renderDefaultUser();
    }
  },


  renderDefaultUser() {
    const profileImages = document.querySelectorAll(
      ".profile-section img, .profile-mobile img"
    );
    const profileSpans = document.querySelectorAll(
      ".profile-section span, .profile-mobile span"
    );
    const welcomeName = document.getElementById("welcomeName");

    profileImages.forEach((img) => {
      img.src = "./images/default-avatar.jpg";
      img.alt = "Profil utilisateur";
    });

    profileSpans.forEach((span) => {
      span.textContent = "Utilisateur";
    });

    if (welcomeName) {
      welcomeName.textContent = "Utilisateur";
    }
  },


  formatDate(dateStr) {
    if (!dateStr) return "Date non disponible";
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", dateStr);
      return dateStr;
    }
  },


  renderLeaveCards(userId, data) {
    const leaveRequests = data?.MyCongesPage?.leaveRequests?.[userId];
    const cardsContainer = document.querySelector(".cards-grid");

    if (!cardsContainer) {
      console.warn("Cards container not found");
      return;
    }

    if (!leaveRequests || !Array.isArray(leaveRequests)) {
      console.warn("No leave requests found for user:", userId);
      cardsContainer.innerHTML =
        '<p class="text-center">Aucune demande de congé trouvée.</p>';
      return;
    }

    cardsContainer.innerHTML = ""; // Clear existing content

    leaveRequests.forEach((leave) => {
      let statusClass = "",
        statusIcon = "",
        statusText = "";

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
        default:
          statusClass = "status-en-attente";
          statusIcon = "bi-question-circle";
          statusText = "Statut inconnu";
      }

      const cardHTML = `
        <div class="leave-card shadowdiv">
          <div class="status-badge ${statusClass}">
            <i class="bi ${statusIcon} me-1"></i>${statusText}
          </div>
          <h5><i class="bi bi-sun me-2"></i>${leave.title || leave.type}</h5>
          <p><strong>Du:</strong> ${shared.formatDate(leave.startDate)}</p>
          <p><strong>Au:</strong> ${shared.formatDate(leave.endDate)}</p>
          <p><strong>Durée:</strong> ${leave.duration || 0} jours</p>
          <p><strong>Type:</strong> ${leave.type || "Non spécifié"}</p>
          <p><strong>Justification:</strong> ${leave.reason || "Non spécifiée"}</p>
          <p><strong>Remplaçant:</strong> ${leave.replancement || "—"}</p>
          ${
            leave.status === "rejected" && leave.rejectionReason
              ? `<div class="refusal-reason">
              <i class="bi bi-exclamation-triangle me-1"></i>
              <strong>Motif de refus:</strong> ${leave.rejectionReason}
            </div>`
              : ""
          }
          <div class="card-buttons">
            ${this.getCardButtons(leave)}
          </div>
        </div>
      `;
      cardsContainer.insertAdjacentHTML("beforeend", cardHTML);
    });

    this.attachLeaveCardEvents(userId, data);
  },

  getCardButtons(leave) {
    if (leave.status === "approved") {
      return `
        <button class="btn btn-outline-secondary" disabled>
          <i class="bi bi-pencil me-1"></i>Modifier
        </button>
        <button class="btn btn-outline-secondary" disabled>
          <i class="bi bi-x-circle me-1"></i>Annuler
        </button>
      `;
    } else if (leave.status === "pending") {
      return `
        <button class="btn btn-outline-main btn-modifier" data-id="${leave.id}">
          <i class="bi bi-pencil me-1"></i>Modifier
        </button>
        <button class="btn btn-outline-danger btn-annuler" data-id="${leave.id}">
          <i class="bi bi-trash me-1"></i>Annuler
        </button>
      `;
    } else {
      return `
        <button class="btn btn-main btn-renouveler" data-id="${leave.id}">
          <i class="bi bi-arrow-repeat me-1"></i>Renouveler
        </button>
        <button class="btn btn-outline-main btn-contacter">
          <i class="bi bi-chat-dots me-1"></i>Contacter RH
        </button>
      `;
    }
  },

  attachLeaveCardEvents(userId, data) {
    const cardsContainer = document.querySelector(".cards-grid");
    if (!cardsContainer) return;

    cardsContainer.addEventListener("click", function (e) {
      const card = e.target.closest(".leave-card");
      if (!card) return;

      let leaveId = e.target.dataset.id;
      if (!leaveId) {
        const btn = e.target.closest("button[data-id]");
        leaveId = btn?.dataset.id;
      }
      if (!leaveId) return;

      const leaveRequestsForUser = data?.MyCongesPage?.leaveRequests?.[userId];
      if (!Array.isArray(leaveRequestsForUser)) {
        console.error("No leaveRequests found for userId:", userId);
        return;
      }

      const leave = leaveRequestsForUser.find(
        (l) => String(l.id) === String(leaveId)
      );
      if (!leave) {
        console.error("Leave request not found for leaveId:", leaveId);
        return;
      }

      if (e.target.classList.contains("btn-annuler")) {
        if (confirm("Êtes-vous sûr de vouloir annuler cette demande ?")) {
          card.remove();
          const index = leaveRequestsForUser.findIndex(
            (l) => String(l.id) === String(leaveId)
          );
          if (index > -1) {
            leaveRequestsForUser.splice(index, 1);
          }
        }
      }

      if (e.target.classList.contains("btn-modifier")) {
        shared.setEditRequest({ ...leave, isNew: false });
        window.location.href = "demande.html";
      }

      if (e.target.classList.contains("btn-renouveler")) {
        shared.setEditRequest({ ...leave, isNew: true });
        window.location.href = "demande.html";
      }

      if (e.target.classList.contains("btn-contacter")) {
        alert("Redirection vers le service RH...");
      }
    });
  },
};


document.addEventListener("DOMContentLoaded", async () => {
  let userId = shared.getCurrentUserId();
  if (!userId) {
    userId =
      prompt("Veuillez entrer votre ID utilisateur (EMP001, RH001, etc.):") ||
      "EMP001";
    shared.setCurrentUserId(userId);
  }


  shared.checkAccess(userId);
  

  await shared.initializeUserInterface();
});


function getLeaveRequests(userId) {
  const requests = sessionStorage.getItem(`leaveRequests_${userId}`);
  return requests ? JSON.parse(requests) : [];
}

function saveLeaveRequests(userId, requests) {
  sessionStorage.setItem(`leaveRequests_${userId}`, JSON.stringify(requests));

}
