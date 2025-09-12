// Wait until the HTML document is fully parsed & the DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1. Get the ID of the current user from shared module or storage
    const userId = shared.getCurrentUserId();

    // 2. Fetch all needed data from server APIs
    const data = await shared.fetchData(
      { name: "UserIfon", url: "http://localhost:4000/UserIfon" },
      { name: "DashboardPage", url: "http://localhost:4000/DashboardPage" },
      { name: "MyCongesPage", url: "http://localhost:4000/MyCongesPage" }
    );

    // 3. Find the current user object using the fetched “UserIfon” data
    const currentUser = shared.getUserById(data.UserIfon, userId);

    // 4. If user exists, render profile image + full name welcome
    if (currentUser) {
      shared.renderProfile(currentUser);  // show profile image, etc.
      shared.renderWelcome(currentUser);  // show “Welcome, [Name]”
    } else {
      // If user data is missing, log error so you notice
      console.error("Current user not found for profile/welcome");
    }

    // 5. DashboardPage data may be undefined; make fallback to empty object
    const dashboardPage = data.DashboardPage || {};

    // --- 6. Find the DOM elements you will update in the page

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

    // --- 7. Section: calculate leave balance (total / used / remaining)
    if (soldeElem) {
      // Get the leave requests for the user; fallback to empty object/array if missing
      const leaveRequestsByUser = data.MyCongesPage?.leaveRequests || {};
      const userLeaves = leaveRequestsByUser[userId] || [];

      // total days assigned to this user; fallback to 0 if missing
      const totalDays = data.UserIfon?.leaveBalance?.[userId]?.totalDays ?? 0;

      // Calculate how many days have been used (only approved requests count)
      const usedDays = userLeaves
        .filter(req => (req.status || "").toLowerCase() === "approved")
        .reduce((sum, req) => sum + (req.duration || 0), 0);

      // Remaining = total minus used
      const remainingDays = totalDays - usedDays;

      // Update the DOM elements with these values
      soldeElem.textContent = `${totalDays} jours`;  
      if (soldeNoteElem) {
        soldeNoteElem.textContent = `Utilisé : ${usedDays} jours  restant : ${remainingDays} jours`;
      }
    }

    // --- 8. Section: count how many leave requests are in each status
    {
      const leaveRequestsByUser = data.MyCongesPage?.leaveRequests || {};
      const userLeaves = leaveRequestsByUser[userId] || [];

      // Initialize counters to zero
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

      // Update the DOM if the elements exist
      if (pendingElem) pendingElem.textContent = counts.pending;
      if (approvedElem) approvedElem.textContent = counts.approved;
      if (rejectedElem) rejectedElem.textContent = counts.rejected;
    }

    // --- 9. Section: show upcoming leaves (first 3)
    if (upcomingContainer) {
      // Clear existing children
      upcomingContainer.innerHTML = "";

      const upcomingLeaves = dashboardPage.upcomingLeaves || [];
      // Take up to 3 upcoming leave entries
      const firstThree = upcomingLeaves.slice(0, 3);

      if (firstThree.length === 0) {
        // If none, show a message
        upcomingContainer.innerHTML = `<small class="text-muted">Aucun congé prochain.</small>`;
      } else {
        // For each leave, build a small item
        firstThree.forEach(l => {
          // Split dates by “-” if provided
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

    // --- 10. Section: display notifications as carousel items
    if (carouselInner) {
      // Clear existing notifications
      carouselInner.innerHTML = "";

      const notifications = dashboardPage.notifications || [];

      if (notifications.length === 0) {
        // If no notifications, show placeholder
        carouselInner.innerHTML = `
          <div class="carousel-item active">
            <div class="p-3 text-muted">Aucune notification.</div>
          </div>`;
      } else {
        // Otherwise, for each notification, build a carousel item
        notifications.forEach((notif, index) => {
          const div = document.createElement("div");
          // Mark first one as “active” so carousel shows it initially
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

        // Initialize Bootstrap carousel if carousel element exists
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
