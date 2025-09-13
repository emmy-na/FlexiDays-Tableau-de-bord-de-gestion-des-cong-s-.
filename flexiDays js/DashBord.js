
document.addEventListener("DOMContentLoaded", async () => {
  try {

    const userId = shared.getCurrentUserId();


    const data = await shared.fetchData(
      { name: "UserIfon", url: "http://localhost:4000/UserIfon" },
      { name: "DashboardPage", url: "http://localhost:4000/DashboardPage" },
      { name: "MyCongesPage", url: "http://localhost:4000/MyCongesPage" }
    );


    const currentUser = shared.getUserById(data.UserIfon, userId);


    if (currentUser) {
      shared.renderProfile(currentUser);  // show profile image, etc.
      shared.renderWelcome(currentUser);  // show “Welcome, [Name]”
    } else {
      // If user data is missing, log error so you notice
      console.error("Current user not found for profile/welcome");
    }


    const dashboardPage = data.DashboardPage || {};



    // Element that shows total leave days (“solde de congés”)
    const soldeElem = document.querySelector(".stats-row .stat-card:nth-child(1) h3");
    // Element that shows “used / remaining days”
    const soldeNoteElem = document.querySelector(".stats-row .stat-card:nth-child(1) p");
    // Elements for pending / approved / rejected counts
    const pendingElem = document.querySelector(".stats-row .stat-card:nth-child(2) .d-flex div:nth-child(1) strong");
    const approvedElem = document.querySelector(".stats-row .stat-card:nth-child(2) .d-flex div:nth-child(2) strong");
    const rejectedElem = document.querySelector(".stats-row .stat-card:nth-child(2) .d-flex div:nth-child(3) strong");
    // Container for upcoming leaves list
    const upcomingContainer = document.querySelector(".stats-row .stat-card:nth-child(3) .upcoming-container");
    // Carousel inner element for notifications
    const carouselInner = document.querySelector("#notificationCarousel .carousel-inner");


    if (soldeElem) {

      const leaveRequestsByUser = data.MyCongesPage?.leaveRequests || {};
      const userLeaves = leaveRequestsByUser[userId] || [];


      const totalDays = data.UserIfon?.leaveBalance?.[userId]?.totalDays ?? 0;


      const usedDays = userLeaves
        .filter(req => (req.status || "").toLowerCase() === "approved")
        .reduce((sum, req) => sum + (req.duration || 0), 0);


      const remainingDays = totalDays - usedDays;


      soldeElem.textContent = `${totalDays} jours`;  
      if (soldeNoteElem) {
        soldeNoteElem.textContent = `Utilisé : ${usedDays} jours  restant : ${remainingDays} jours`;
      }
    }

    {
      const leaveRequestsByUser = data.MyCongesPage?.leaveRequests || {};
      const userLeaves = leaveRequestsByUser[userId] || [];


      const counts = { pending: 0, approved: 0, rejected: 0 };

      userLeaves.forEach(l => {
        const statusStr = (l.status || "").toLowerCase();
        if (statusStr.includes("pending") || statusStr.includes("attente")) {
          counts.pending++;
        } else if (statusStr.includes("approved") || statusStr.includes("approuv")) {
          counts.approved++;
        } else if (statusStr.includes("reject") || statusStr.includes("refus")) {
          counts.rejected++;
        }
      });


      if (pendingElem) pendingElem.textContent = counts.pending;
      if (approvedElem) approvedElem.textContent = counts.approved;
      if (rejectedElem) rejectedElem.textContent = counts.rejected;
    }


    if (upcomingContainer) {
      // Clear existing children
      upcomingContainer.innerHTML = "";

      const upcomingLeaves = dashboardPage.upcomingLeaves || [];

      const firstThree = upcomingLeaves.slice(0, 3);

      if (firstThree.length === 0) {

        upcomingContainer.innerHTML = `<small class="text-muted">Aucun congé prochain.</small>`;
      } else {

        firstThree.forEach(l => {

          const dates = (l.dates && l.dates.split("-")) || [];
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

    if (carouselInner) {

      carouselInner.innerHTML = "";

      const notifications = dashboardPage.notifications || [];

      if (notifications.length === 0) {
  
        carouselInner.innerHTML = `
          <div class="carousel-item active">
            <div class="p-3 text-muted">Aucune notification.</div>
          </div>`;
      } else {

        notifications.forEach((notif, index) => {
          const div = document.createElement("div");

          div.className = `carousel-item${index === 0 ? " active" : ""}`;
          div.innerHTML = `
            <div class="notification">
              <h4 style="color: ${notif.color || "#007bff"};">
                <strong>${notif.title}</strong>
              </h4>
              <p>${notif.message}</p>
            </div>`;
          carouselInner.appendChild(div);
        });


        const carouselElement = document.getElementById("notificationCarousel");
        if (carouselElement) {
          new bootstrap.Carousel(carouselElement, {
            interval: 5000,
            ride: "carousel",
          });
        }
      }
    }

  } catch (error) {
    // If any error in try block, log it so you can debug
    console.error("Dashboard error:", error);
  }
});

