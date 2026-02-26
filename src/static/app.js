document.addEventListener("DOMContentLoaded", () => {
  // Git Branch Line Background Animation
  (function initBranchAnimation() {
    const canvas = document.createElement("canvas");
    canvas.id = "branch-canvas";
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d");

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const LANE_COUNT = 5;
    const COMMIT_SPACING = 160;
    const LINE_COLOR = "#558b2f";
    const NODE_COLOR = "#7cb342";
    const LINE_WIDTH = 2;
    const NODE_RADIUS = 5;

    // Pre-generate branch/merge events at fixed x positions
    const events = [];
    for (let i = 0; i < 30; i++) {
      const fromLane = Math.floor(Math.random() * LANE_COUNT);
      let toLane = Math.floor(Math.random() * LANE_COUNT);
      if (toLane === fromLane) toLane = (fromLane + 1) % LANE_COUNT;
      events.push({ x: 250 + i * 260 + Math.random() * 80, fromLane, toLane });
    }

    let scrollX = 0;

    function getLaneY(lane) {
      const spacing = canvas.height / (LANE_COUNT + 1);
      return spacing * (lane + 1);
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw horizontal lane lines
      for (let lane = 0; lane < LANE_COUNT; lane++) {
        const y = getLaneY(lane);
        ctx.strokeStyle = LINE_COLOR;
        ctx.lineWidth = LINE_WIDTH;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw branch/merge connectors as bezier curves
      for (const event of events) {
        const x = ((event.x - scrollX) % (30 * 260)) + scrollX % (30 * 260) - scrollX;
        const drawX = event.x - (scrollX % (30 * 260));
        if (drawX < -100 || drawX > canvas.width + 100) continue;

        const fromY = getLaneY(event.fromLane);
        const toY = getLaneY(event.toLane);

        ctx.strokeStyle = NODE_COLOR;
        ctx.lineWidth = LINE_WIDTH;
        ctx.beginPath();
        ctx.moveTo(drawX, fromY);
        ctx.bezierCurveTo(drawX + 60, fromY, drawX - 60, toY, drawX, toY);
        ctx.stroke();
      }

      // Draw commit nodes on each lane
      const commitOffset = scrollX % COMMIT_SPACING;
      for (let lane = 0; lane < LANE_COUNT; lane++) {
        const y = getLaneY(lane);
        for (let x = -commitOffset; x < canvas.width + COMMIT_SPACING; x += COMMIT_SPACING) {
          ctx.beginPath();
          ctx.arc(x, y, NODE_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = "white";
          ctx.fill();
          ctx.strokeStyle = NODE_COLOR;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      scrollX += 0.4;
      requestAnimationFrame(draw);
    }

    draw();
  })();

  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
