document.addEventListener("DOMContentLoaded", async () => {
  try {
    const userId = shared.getCurrentUserId();
    const data = await shared.fetchData(
      { name: "UserIfon", url: "http://localhost:4000/UserIfon" },
      { name: "DashboardPage", url: "http://localhost:4000/DashboardPage" },
      { name: "MyCongesPage", url: "http://localhost:4000/MyCongesPage" }
    );

    const currentUser = shared.getUserById(data.UserIfon, userId);

    // Insert rendering of profile & welcome here
    if (currentUser) {
      shared.renderProfile(currentUser);
      shared.renderWelcome(currentUser);
    } else {
      console.error("Current user not found for profile/welcome");
    }
    const dashboardPage = data.DashboardPage || {};

    // --- DOM targets
    const soldeElem = document.querySelector(".stats-row .stat-card:nth-child(1) h3");
    const soldeNoteElem = document.querySelector(".stats-row .stat-card:nth-child(1) p");
    const pendingElem = document.querySelector(".stats-row .stat-card:nth-child(2) .d-flex div:nth-child(1) strong");
    const approvedElem = document.querySelector(".stats-row .stat-card:nth-child(2) .d-flex div:nth-child(2) strong");
    const rejectedElem = document.querySelector(".stats-row .stat-card:nth-child(2) .d-flex div:nth-child(3) strong");
    const upcomingContainer = document.querySelector(".stats-row .stat-card:nth-child(3) .upcoming-container");
    const carouselInner = document.querySelector("#notificationCarousel .carousel-inner");

   

    // --- 1) Solde de congés (calculé à partir des congés utilisés)
    if (soldeElem) {
      const leaveRequestsByUser = data.MyCongesPage?.leaveRequests || {};
      const userLeaves = leaveRequestsByUser?.[userId] || [];

      const totalDays = data.UserIfon?.leaveBalance?.[userId]?.totalDays ?? 0;

      // Calcul des jours utilisés (status approved)
      const usedDays = userLeaves
        .filter(req => req?.status?.toLowerCase() === "approved")
        .reduce((sum, req) => sum + (req?.duration || 0), 0);

      const remainingDays = totalDays - usedDays;

      soldeElem.textContent = `${totalDays} jours`;
      if (soldeNoteElem) soldeNoteElem.textContent = `Utilisé : ${usedDays} jours  restant : ${remainingDays} jours`;
    }

    // --- 2) Demandes en cours
    const leaveRequestsByUser = data.MyCongesPage?.leaveRequests || {};
    const userLeaves = leaveRequestsByUser?.[userId] || [];

    const counts = userLeaves.reduce(
      (acc, l) => {
        const s = (l.status || "").toLowerCase();
        if (s.includes("pending") || s.includes("attente")) acc.pending++;
        else if (s.includes("approved") || s.includes("approuv")) acc.approved++;
        else if (s.includes("reject") || s.includes("refus")) acc.rejected++;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 }
    );

    if (pendingElem) pendingElem.textContent = counts.pending;
    if (approvedElem) approvedElem.textContent = counts.approved;
    if (rejectedElem) rejectedElem.textContent = counts.rejected;

    // --- 3) Prochains congés (les 3 premiers du JSON DashboardPage)
    if (upcomingContainer) {
      upcomingContainer.innerHTML = "";
      const upcomingLeaves = dashboardPage.upcomingLeaves || [];
      const firstThree = upcomingLeaves.slice(0, 3);

      if (firstThree.length === 0) {
        upcomingContainer.innerHTML = `<small class="text-muted">Aucun congé prochain.</small>`;
      } else {
        firstThree.forEach(l => {
          const dates = l?.dates?.split("-") || [];
          const start = dates[0]?.trim() || "—";
          const end = dates[1]?.trim() || start;

          const item = document.createElement("div");
          item.className = "upcoming-item mb-2";
          item.innerHTML = `<strong>${l.type || ""}</strong>&ensp; : &ensp;
                            <small>${start}</small> → <small>${end}</small>`;
          upcomingContainer.appendChild(item);
        });
      }
    }

    // --- 4) Notifications (Bootstrap carousel)
    if (carouselInner) {
      carouselInner.innerHTML = "";
      const notifications = dashboardPage.notifications || [];

      if (notifications.length === 0) {
        carouselInner.innerHTML = `<div class="carousel-item active">
                                     <div class="p-3 text-muted">Aucune notification.</div>
                                   </div>`;
      } else {
        notifications.forEach((notif, index) => {
          const item = document.createElement("div");
          item.className = `carousel-item${index === 0 ? " active" : ""}`;
          item.innerHTML = `
  <div class="notification"> <h4 style="color: ${notif.color || '#007bff'};"> <strong>${notif.title}</strong>
    </h4> <p>${notif.message}</p>
  </div>
`;
          carouselInner.appendChild(item);
        });

        // Initialize carousel (Bootstrap 5)
        const carouselElement = document.getElementById("notificationCarousel");
        if (carouselElement) {
          const carousel = new bootstrap.Carousel(carouselElement, {
            interval: 5000,
            ride: "carousel",
          });
        }
      }
    }

  } catch (err) {
    console.error("DashBord error:", err);
  }
});
