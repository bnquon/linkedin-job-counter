const originalXHR = XMLHttpRequest.prototype.open;

// Session cache for storing job data by job ID because there's no refetch on already viewed jobs
const jobCache = {};

// Override XHR
XMLHttpRequest.prototype.open = function (url) {
  if (url && url.includes("voyager/api/jobs")) {
    this.addEventListener("readystatechange", function () {
      if (this.readyState === 4 && this.status === 200) {
        // THe response is a Blob, so we need to convert it to JSON
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

function getExpirationColor(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "#666"; // gray for expired
  } else if (diffDays <= 3) {
    return "#e05d44"; // red for urgent (3 days or less)
  } else if (diffDays <= 7) {
    return "#ff7961"; // orange for soon (4-7 days)
  } else if (diffDays <= 14) {
    return "#ffc107"; // yellow for moderate (8-14 days)
  } else {
    return "#00b759"; // green for plenty of time (15+ days)
  }
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

    // Create views div (if views data exists)
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
    const customDiv = document.createElement("div");
    customDiv.className = "custom-applies-count";

    let backgrondColor;
    let textColor = "white";
    if (appliesCount < 50) {
      backgrondColor = "#00b759"; // green
    } else if (appliesCount < 100) {
      backgrondColor = "#ffc107"; // yellow
      textColor = "black";
    } else if (appliesCount < 500) {
      backgrondColor = "#ff7961"; // orange
    } else {
      backgrondColor = "#e05d44"; // red
    }

    customDiv.style.cssText = `
      background: ${backgrondColor};
      color: ${textColor};
      padding: 6px 12px;
      border-radius: 16px;
      font-weight: bold;
      font-size: 14px;
      margin-top: 8px;
      display: block;
      width: fit-content;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    customDiv.textContent = `${appliesCount} applications`;

    // Append it to the container
    container.appendChild(customDiv);

    // Create expires div (if expires data exists)
    if (expiresAt) {
      const expiresDiv = document.createElement("div");
      expiresDiv.className = "custom-expires-count";

      const expiresColor = getExpirationColor(expiresAt);
      const expiresText = formatExpirationDate(expiresAt);

      expiresDiv.style.cssText = `
        background: ${expiresColor};
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
      expiresDiv.textContent = expiresText;
      container.appendChild(expiresDiv);
    }
  }
}
