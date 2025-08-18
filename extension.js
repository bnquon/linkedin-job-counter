const originalXHR = XMLHttpRequest.prototype.open;

// Session cache for storing job data by job ID because there's no refetch on already viewed jobs
const jobCache = {};

// Override XHR
XMLHttpRequest.prototype.open = function (method, url) {
  if (url && url.includes("voyager/api/jobs")) {
    this.addEventListener("readystatechange", function () {
      if (this.readyState === 4 && this.status === 200) {
        // The response is a Blob, so we need to convert it to JSON
        this.response
          .text()
          .then((text) => JSON.parse(text))
          .then((data) => {
            const jobId = data.data.jobPostingId;
            const appliesCount = data.data.applies;
            const viewsCount = data.data.views;
            const expireAt = data.data.expireAt;

            if (jobId && appliesCount && viewsCount && expireAt) {
              // Cache the job data
              jobCache[jobId] = {
                applies: appliesCount,
                views: viewsCount,
                expireAt: expireAt,
              };

              updateAppliesOnPage(appliesCount, viewsCount, expireAt);
            }
          })
          .catch((e) => console.log("❌ Error:", e));
      }
    });
  }
  return originalXHR.apply(this, arguments);
};

// Listen for URL changes using history API interception
let lastUrl = window.location.href;

// Override history methods
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function () {
  originalPushState.apply(history, arguments);
  checkUrlChange();
};

history.replaceState = function () {
  originalReplaceState.apply(history, arguments);
  checkUrlChange();
};

// Listen for popstate (back/forward buttons)
window.addEventListener("popstate", checkUrlChange);

function checkUrlChange() {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;

    // Extract job ID from URL (handles both /jobs/view/ and currentJobId= patterns)
    const jobIdMatch = currentUrl.match(
      /(?:jobs\/view\/(\d+)|currentJobId=(\d+))/
    );
    if (jobIdMatch) {
      const jobId = jobIdMatch[1] || jobIdMatch[2]; // Use whichever group matched

      const existingViews = document.querySelector(".custom-views-count");
      const existingApplies = document.querySelector(".custom-applies-count");
      const existingExpires = document.querySelector(".custom-expires-count");
      if (existingViews) existingViews.remove();
      if (existingApplies) existingApplies.remove();
      if (existingExpires) existingExpires.remove();

      // Check cache for this job
      if (jobCache[jobId]) {
        updateAppliesOnPage(
          jobCache[jobId].applies,
          jobCache[jobId].views,
          jobCache[jobId].expireAt
        );
      }
    }
  }
}

function formatExpirationDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const fullDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (diffDays < 0) {
    return `Expired (${fullDate})`;
  } else if (diffDays === 0) {
    return `Expires today (${fullDate})`;
  } else if (diffDays === 1) {
    return `Expires tomorrow (${fullDate})`;
  } else {
    return `Expires in ${diffDays} days (${fullDate})`;
  }
}

// Unified coloring function
function getBadgeColors(type, value) {
  if (type === "applies") {
    if (value < 50) {
      return { background: "#00b759", color: "white" }; // green
    } else if (value < 100) {
      return { background: "#ffc107", color: "black" }; // yellow
    } else if (value < 500) {
      return { background: "#ff7961", color: "white" }; // orange
    } else {
      return { background: "#e05d44", color: "white" }; // red
    }
  }

  if (type === "expires") {
    const date = new Date(value);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { background: "#666", color: "white" }; // gray expired
    } else if (diffDays <= 3) {
      return { background: "#e05d44", color: "white" }; // urgent red
    } else if (diffDays <= 7) {
      return { background: "#ff7961", color: "white" }; // orange
    } else if (diffDays <= 14) {
      return { background: "#ffc107", color: "black" }; // yellow
    } else {
      return { background: "#00b759", color: "white" }; // green
    }
  }

  return { background: "#666", color: "white" }; // fallback
}

function updateAppliesOnPage(appliesCount, viewsCount, expiresAt) {
  // Target the parent container
  const container = document.querySelector(
    "#main > div > div.scaffold-layout__list-detail-inner.scaffold-layout__list-detail-inner--grow > div.scaffold-layout__detail.overflow-x-hidden.jobs-search__job-details > div > div.jobs-search__job-details--container > div > div.job-view-layout.jobs-details > div:nth-child(1) > div > div:nth-child(1) > div > div.relative.job-details-jobs-unified-top-card__container--two-pane > div > div.job-details-jobs-unified-top-card__primary-description-container"
  );

  if (container) {
    container.style.flexDirection = "column";
    container.style.alignItems = "flex-start";

    // Remove existing custom divs
    const existingViews = container.querySelector(".custom-views-count");
    const existingApplies = container.querySelector(".custom-applies-count");
    const existingExpires = container.querySelector(".custom-expires-count");
    if (existingViews) existingViews.remove();
    if (existingApplies) existingApplies.remove();
    if (existingExpires) existingExpires.remove();

    // Create views div (static gray badge)
    if (viewsCount) {
      const viewsDiv = document.createElement("div");
      viewsDiv.className = "custom-views-count";
      viewsDiv.style.cssText = `
        background: #666;
        color: white;
        padding: 6px 12px;
        border-radius: 16px;
        font-weight: bold;
        font-size: 14px;
        margin-top: 8px;
        display: block;
        width: fit-content;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;
      viewsDiv.textContent = `${viewsCount} views`;
      container.appendChild(viewsDiv);
    }

    // Create applies div
    const appliesDiv = document.createElement("div");
    appliesDiv.className = "custom-applies-count";

    const appliesColors = getBadgeColors("applies", appliesCount);
    appliesDiv.style.cssText = `
      background: ${appliesColors.background};
      color: ${appliesColors.color};
      padding: 6px 12px;
      border-radius: 16px;
      font-weight: bold;
      font-size: 14px;
      margin-top: 8px;
      display: block;
      width: fit-content;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    appliesDiv.textContent = `${appliesCount} applications`;
    container.appendChild(appliesDiv);

    // Create expires div
    if (expiresAt) {
      const expiresDiv = document.createElement("div");
      expiresDiv.className = "custom-expires-count";

      const expiresColors = getBadgeColors("expires", expiresAt);
      const expiresText = formatExpirationDate(expiresAt);

      expiresDiv.style.cssText = `
        background: ${expiresColors.background};
        color: ${expiresColors.color};
        padding: 6px 12px;
        border-radius: 16px;
        font-weight: bold;
        font-size: 14px;
        margin-top: 8px;
        display: block;
        width: fit-content;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;
      expiresDiv.textContent = expiresText;
      container.appendChild(expiresDiv);
    }
  }
}
