"use strict";

const STORAGE_KEY = "ridego_driver_state_v1";

const DEMO_RIDE = {
  id: Date.now(),
  fare: 320,
  pickup: "Howrah Railway Station",
  drop: "Park Street, Kolkata",
  distance: "14.8 km",
  duration: "38 min",
  type: "Cash",
  passengerName: "Rahul Sharma",
  passengerRating: "4.8",
  passengerRides: 26
};

let state = {
  loggedIn: false,
  mobile: "",
  online: false,
  activeRide: null,
  tripStep: 0,
  completedRides: [],
  profileName: "RideGo Driver",
  vehicle: "",
  passengerRating: 5
};

function $(id) {
  return document.getElementById(id);
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    const parsed = JSON.parse(saved);

    state = {
      ...state,
      ...parsed
    };
  } catch (error) {
    console.error("Unable to load RideGo state:", error);
  }
}

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch (error) {
    console.error("Unable to save RideGo state:", error);
  }
}

function money(amount) {
  const value = Number(amount) || 0;
  return "₹" + value.toLocaleString("en-IN");
}

function totalEarnings() {
  return state.completedRides.reduce(
    (total, ride) => total + (Number(ride.fare) || 0),
    0
  );
}

function isToday(dateValue) {
  const today = new Date();
  const date = new Date(dateValue);

  return (
    today.getFullYear() === date.getFullYear() &&
    today.getMonth() === date.getMonth() &&
    today.getDate() === date.getDate()
  );
}

function todayEarnings() {
  return state.completedRides.reduce(
    (total, ride) => {
      if (!isToday(ride.completedAt)) return total;

      return total + (Number(ride.fare) || 0);
    },
    0
  );
}

function todayRideCount() {
  return state.completedRides.filter(
    ride => isToday(ride.completedAt)
  ).length;
}

function showPage(pageId) {
  document
    .querySelectorAll(".page")
    .forEach(page => {
      page.classList.remove("active");
    });

  const target = $(pageId);

  if (target) {
    target.classList.add("active");
  }

  document
    .querySelectorAll(".nav-item")
    .forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.page === pageId
      );
    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function setLoggedInUI() {
  const loginPage = $("loginPage");
  const mainApp = $("mainApp");
  const bottomNav = $("bottomNav");

  if (state.loggedIn) {
    loginPage.classList.add("hidden");
    mainApp.classList.remove("hidden");
    bottomNav.classList.remove("hidden");

    showPage("dashboardPage");
    updateAllUI();
  } else {
    loginPage.classList.remove("hidden");
    mainApp.classList.add("hidden");
    bottomNav.classList.add("hidden");
  }
}

function updateGreeting() {
  const element = $("welcomeGreeting");

  if (!element) return;

  const hour = new Date().getHours();

  let greeting = "Good Morning";

  if (hour >= 12 && hour < 17) {
    greeting = "Good Afternoon";
  } else if (hour >= 17) {
    greeting = "Good Evening";
  }

  element.textContent = greeting;
}

function updateOnlineUI() {
  const toggle = $("onlineToggle");
  const title = $("onlineTitle");
  const text = $("onlineText");
  const card = document.querySelector(".online-card");

  if (!toggle) return;

  toggle.checked = state.online;

  if (state.online) {
    title.textContent = "You're Online";
    text.textContent =
      "You're ready to receive ride requests";

    card.classList.add("is-online");
  } else {
    title.textContent = "You're Offline";
    text.textContent =
      "Go online to receive ride requests";

    card.classList.remove("is-online");
  }

  renderRideRequest();
}

function renderRideRequest() {
  const noRide = $("noRide");
  const rideRequest = $("rideRequest");
  const noRideText = $("noRideText");

  if (!noRide || !rideRequest) return;

  if (state.activeRide) {
    noRide.classList.add("hidden");
    rideRequest.classList.add("hidden");
    return;
  }

  if (!state.online) {
    noRide.classList.remove("hidden");
    rideRequest.classList.add("hidden");

    noRideText.textContent =
      "Go online to start receiving ride requests.";

    return;
  }

  noRide.classList.add("hidden");
  rideRequest.classList.remove("hidden");

  const ride = DEMO_RIDE;

  $("requestFare").textContent = money(ride.fare);
  $("pickupLocation").textContent = ride.pickup;
  $("dropLocation").textContent = ride.drop;
  $("requestDistance").textContent = ride.distance;
  $("requestDuration").textContent = ride.duration;
  $("requestType").textContent = ride.type;
}

function renderActiveRide() {
  const activeRide = $("activeRide");

  if (!activeRide) return;

  if (!state.activeRide) {
    activeRide.classList.add("hidden");
    return;
  }

  activeRide.classList.remove("hidden");

  const ride = state.activeRide;

  $("activeFare").textContent = money(ride.fare);
  $("activePickup").textContent = ride.pickup;
  $("activeDrop").textContent = ride.drop;
  $("activeDistance").textContent = ride.distance;
  $("activeDuration").textContent = ride.duration;

  $("activePayment").textContent =
    ride.type === "Cash"
      ? "💵 Cash"
      : "💳 " + ride.type;

  $("passengerName").textContent =
    ride.passengerName || "Rahul Sharma";

  const steps = [
    {
      status: "Accepted",
      button: "Go to Pickup",
      location: "Heading to pickup"
    },
    {
      status: "Going to Pickup",
      button: "Arrived at Pickup",
      location: "Near pickup location"
    },
    {
      status: "Arrived at Pickup",
      button: "Start Trip",
      location: "Waiting for passenger"
    },
    {
      status: "Trip Started",
      button: "Complete Trip",
      location: "Trip in progress"
    }
  ];

  const current = steps[state.tripStep] || steps[0];

  $("tripStatusTag").textContent = current.status;
  $("tripActionBtn").textContent = current.button;
  $("mapLocationText").textContent = current.location;

  updateMapPosition();
}

function updateMapPosition() {
  const marker = $("driverMapMarker");

  if (!marker) return;

  const positions = [
    {
      left: "19%",
      top: "56%"
    },
    {
      left: "31%",
      top: "51%"
    },
    {
      left: "48%",
      top: "43%"
    },
    {
      left: "69%",
      top: "32%"
    }
  ];

  const position =
    positions[state.tripStep] || positions[0];

  marker.style.left = position.left;
  marker.style.top = position.top;
}

function updateDashboardStats() {
  const today = todayEarnings();
  const todayCount = todayRideCount();

  $("todayEarning").textContent = money(today);
  $("completedCount").textContent = todayCount;

  $("earningStatus").textContent =
    today > 0
      ? "You're earning!"
      : "Start earning";
}

function updateEarningsPage() {
  const total = totalEarnings();
  const count = state.completedRides.length;

  const average =
    count > 0
      ? Math.round(total / count)
      : 0;

  $("earningsTotal").textContent = money(total);
  $("earningsCompleted").textContent = count;
  $("averageFare").textContent = money(average);
  $("totalRides").textContent = count;
  $("totalEarnings").textContent = money(total);

  renderEarningHistory();
}

function renderEarningHistory() {
  const container = $("earningHistory");

  if (!container) return;

  if (state.completedRides.length === 0) {
    container.innerHTML = `
      <div class="history-empty">
        No completed rides yet.
      </div>
    `;

    return;
  }

  const rides = [...state.completedRides]
    .reverse()
    .slice(0, 8);

  container.innerHTML = rides
    .map(ride => {
      return `
        <div class="history-item">

          <div class="history-top">

            <div class="history-route">
              <strong>
                ${escapeHTML(ride.pickup)}
              </strong>

              <span>
                → ${escapeHTML(ride.drop)}
              </span>
            </div>

            <div class="history-fare">
              ${money(ride.fare)}
            </div>

          </div>

          <div class="history-bottom">

            <span>
              ${formatDate(ride.completedAt)}
            </span>

            <span class="history-payment">
              ${escapeHTML(ride.type || "Cash")}
            </span>

          </div>

        </div>
      `;
    })
    .join("");
}

function renderHistory() {
  const container = $("historyList");

  if (!container) return;

  if (state.completedRides.length === 0) {
    container.innerHTML = `
      <div class="history-empty">

        <div style="font-size:28px;margin-bottom:8px;">
          🚗
        </div>

        No completed rides yet.

        <div style="margin-top:4px;">
          Your completed trips will appear here.
        </div>

      </div>
    `;

    return;
  }

  const rides = [...state.completedRides].reverse();

  container.innerHTML = rides
    .map(ride => {
      return `
        <div class="history-item">

          <div class="history-top">

            <div class="history-route">

              <strong>
                ${escapeHTML(ride.pickup)}
              </strong>

              <span>
                → ${escapeHTML(ride.drop)}
              </span>

            </div>

            <div class="history-fare">
              ${money(ride.fare)}
            </div>

          </div>

          <div class="history-bottom">

            <span>
              ${formatDate(ride.completedAt)}
            </span>

            <span class="history-payment">
              ${escapeHTML(ride.type || "Cash")}
            </span>

          </div>

        </div>
      `;
    })
    .join("");
}

function updateProfile() {
  const name =
    state.profileName || "RideGo Driver";

  $("profileName").textContent = name;

  $("profileMobile").textContent =
    state.mobile
      ? "+91 " + state.mobile
      : "+91 XXXXX XXXXX";

  $("driverName").value =
    state.profileName || "";

  $("driverVehicle").value =
    state.vehicle || "";
}

function updateAllUI() {
  updateGreeting();
  updateOnlineUI();
  renderActiveRide();
  updateDashboardStats();
  updateEarningsPage();
  renderHistory();
  updateProfile();
}

function formatDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   INITIALIZE
========================================================= */

function initializeApp() {

  loadState();

  const loginForm = $("loginForm");

  if (loginForm) {
    loginForm.addEventListener(
      "submit",
      function(event) {

        event.preventDefault();

        const mobile =
          $("mobile").value.trim();

        const password =
          $("password").value.trim();

        if (!/^\d{10}$/.test(mobile)) {

          alert(
            "Please enter a valid 10-digit mobile number."
          );

          $("mobile").focus();

          return;
        }

        if (!password) {

          alert(
            "Please enter your password."
          );

          $("password").focus();

          return;
        }

        state.loggedIn = true;
        state.mobile = mobile;

        saveState();

        setLoggedInUI();
      }
    );
  }

  /* ONLINE */

  const onlineToggle = $("onlineToggle");

  if (onlineToggle) {

    onlineToggle.addEventListener(
      "change",
      function() {

        state.online = this.checked;

        saveState();

        updateOnlineUI();
        renderActiveRide();
      }
    );
  }

  /* ACCEPT */

  const acceptBtn = $("acceptBtn");

  if (acceptBtn) {

    acceptBtn.addEventListener(
      "click",
      function() {

        if (!state.online) {

          alert(
            "Please go online first."
          );

          return;
        }

        state.activeRide = {
          ...DEMO_RIDE
        };

        state.tripStep = 0;

        saveState();

        renderRideRequest();
        renderActiveRide();
      }
    );
  }

  /* REJECT */

  const rejectBtn = $("rejectBtn");

  if (rejectBtn) {

    rejectBtn.addEventListener(
      "click",
      function() {

        $("rideRequest")
          .classList.add("hidden");

        $("noRide")
          .classList.remove("hidden");

        $("noRideText").textContent =
          "Ride rejected. Waiting for the next request...";

        setTimeout(
          function() {

            if (
              state.online &&
              !state.activeRide
            ) {

              renderRideRequest();
            }

          },
          1800
        );
      }
    );
  }

  /* TRIP ACTION */

  const tripActionBtn =
    $("tripActionBtn");

  if (tripActionBtn) {

    tripActionBtn.addEventListener(
      "click",
      function() {

        if (!state.activeRide) {
          return;
        }

        if (state.tripStep < 3) {

          state.tripStep += 1;

          saveState();

          renderActiveRide();

          return;
        }

        openTripCompleteModal();
      }
    );
  }

  /* RATING */

  document
    .querySelectorAll("#ratingStars button")
    .forEach(button => {

      button.addEventListener(
        "click",
        function() {

          const rating =
            Number(this.dataset.rating);

          state.passengerRating = rating;

          document
            .querySelectorAll(
              "#ratingStars button"
            )
            .forEach(star => {

              star.classList.toggle(
                "selected",
                Number(
                  star.dataset.rating
                ) <= rating
              );

            });
        }
      );

    });

  /* FINISH TRIP */

  const finishTripBtn =
    $("finishTripBtn");

  if (finishTripBtn) {

    finishTripBtn.addEventListener(
      "click",
      function() {

        if (!state.activeRide) {
          return;
        }

        const completedRide = {
          ...state.activeRide,

          completedAt:
            new Date().toISOString(),

          passengerRating:
            state.passengerRating || 5
        };

        state.completedRides.push(
          completedRide
        );

        state.activeRide = null;
        state.tripStep = 0;

        saveState();

        closeTripCompleteModal();

        updateAllUI();

        showPage("dashboardPage");

        alert(
          "Ride completed successfully! Earnings added."
        );
      }
    );
  }

  /* CALL */

  const callPassengerBtn =
    $("callPassengerBtn");

  if (callPassengerBtn) {

    callPassengerBtn.addEventListener(
      "click",
      function() {

        alert(
          "Demo: Calling Rahul Sharma..."
        );

      }
    );
  }

  /* MESSAGE */

  const messagePassengerBtn =
    $("messagePassengerBtn");

  if (messagePassengerBtn) {

    messagePassengerBtn.addEventListener(
      "click",
      function() {

        alert(
          "Demo: Opening passenger chat..."
        );

      }
    );
  }

  /* LOCATION */

  const locateBtn =
    $("locateBtn");

  if (locateBtn) {

    locateBtn.addEventListener(
      "click",
      function() {

        alert(
          "Demo: Driver location centered on map."
        );

      }
    );
  }

  /* SOS */

  const sosBtn = $("sosBtn");

  if (sosBtn) {

    sosBtn.addEventListener(
      "click",
      function() {

        $("sosModal")
          .classList.remove("hidden");

      }
    );
  }

  const sosCancelBtn =
    $("sosCancelBtn");

  if (sosCancelBtn) {

    sosCancelBtn.addEventListener(
      "click",
      function() {

        $("sosModal")
          .classList.add("hidden");

      }
    );
  }

  const sosCallBtn =
    $("sosCallBtn");

  if (sosCallBtn) {

    sosCallBtn.addEventListener(
      "click",
      function() {

        alert(
          "Demo: Emergency assistance call initiated."
        );

      }
    );
  }

  /* PROFILE BUTTON */

  const headerProfileBtn =
    $("headerProfileBtn");

  if (headerProfileBtn) {

    headerProfileBtn.addEventListener(
      "click",
      function() {

        if (!state.loggedIn) {
          return;
        }

        showPage("profilePage");
      }
    );
  }

  /* NAVIGATION */

  document
    .querySelectorAll(".nav-item")
    .forEach(item => {

      item.addEventListener(
        "click",
        function() {

          const pageId =
            this.dataset.page;

          if (!pageId) {
            return;
          }

          showPage(pageId);

          updateAllUI();
        }
      );

    });

  /* SAVE PROFILE */

  const saveProfileBtn =
    $("saveProfileBtn");

  if (saveProfileBtn) {

    saveProfileBtn.addEventListener(
      "click",
      function() {

        const name =
          $("driverName")
            .value
            .trim();

        const vehicle =
          $("driverVehicle")
            .value
            .trim();

        state.profileName =
          name || "RideGo Driver";

        state.vehicle =
          vehicle;

        saveState();

        updateProfile();

        alert(
          "Profile saved successfully."
        );
      }
    );
  }

  /* LOGOUT */

  const logoutBtn =
    $("logoutBtn");

  if (logoutBtn) {

    logoutBtn.addEventListener(
      "click",
      function() {

        const confirmed =
          confirm(
            "Are you sure you want to logout?"
          );

        if (!confirmed) {
          return;
        }

        state.loggedIn = false;
        state.online = false;
        state.activeRide = null;
        state.tripStep = 0;

        saveState();

        setLoggedInUI();

        $("password").value = "";
      }
    );
  }

  setLoggedInUI();
}

/* =========================================================
   TRIP COMPLETE MODAL
========================================================= */

function openTripCompleteModal() {

  if (!state.activeRide) {
    return;
  }

  $("completeFare").textContent =
    money(state.activeRide.fare);

  state.passengerRating = 5;

  document
    .querySelectorAll("#ratingStars button")
    .forEach(button => {

      button.classList.toggle(
        "selected",
        Number(button.dataset.rating) === 5
      );

    });

  $("tripCompleteModal")
    .classList.remove("hidden");
}

function closeTripCompleteModal() {

  $("tripCompleteModal")
    .classList.add("hidden");
}

/* START APP */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeApp
  );

} else {

  initializeApp();

}
