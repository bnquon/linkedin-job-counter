const jobCache = {};

// Listen for messages from the injected scripts
window.addEventListener("message", function (event) {
  if (event.source !== window) return;

  if (event.data.type === "LINKEDIN_JOB_DATA") {
    const { jobId, applies, views, expireAt, isRemoteAllowed } = event.data;

    if (jobId && applies && views && expireAt) {
      // Cache the job data
      jobCache[jobId] = {
        applies: applies,
        views: views,
        expireAt: expireAt,
        analyticsSent: false,
        isRemoteAllowed: isRemoteAllowed,
      };

      if (
        chrome &&
        chrome.runtime &&
        chrome.runtime.sendMessage &&
        !jobCache[jobId].analyticsSent
      ) {
        try {
          chrome.runtime.sendMessage({ type: "update" });
          jobCache[jobId].analyticsSent = true;
        } catch (e) {
          console.warn("Failed to send analytics message:", e);
        }
      }

      updateAppliesOnPage(applies, views, expireAt, isRemoteAllowed);
    }
  }

  if (event.data.type === "LINKEDIN_URL_CHANGE") {
    const currentUrl = event.data.url;

    // Extract job ID from URL
    const jobIdMatch = currentUrl.match(
      /(?:jobs\/view\/(\d+)|currentJobId=(\d+))/
    );
    if (jobIdMatch) {
      const jobId = jobIdMatch[1] || jobIdMatch[2];

      // Show loading state immediately when navigating to a new job
      showLoadingState();

      // Check cache for this job
      if (jobCache[jobId]) {
        // Small delay to ensure loading state is visible
        setTimeout(() => {
          updateAppliesOnPage(
            jobCache[jobId].applies,
            jobCache[jobId].views,
            jobCache[jobId].expireAt,
            jobCache[jobId].isRemoteAllowed
          );
        }, 100);
      }
      // If not in cache, loading state will remain until API call completes
    } else {
      // Not a job page, remove all custom elements
      document.querySelectorAll(".custom-views-count, .custom-applies-count, .custom-expires-count, .custom-remote-allowed, .custom-loading-indicator")
        .forEach(el => el.remove());
    }
  }
});

function injectScript(src) {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL(src);
  script.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Inject the API fetcher script (replaces xhr-interceptor.js)
injectScript("api-fetcher.js");

// Show loading state on initial page load if we're on a job page
function checkInitialJobPage() {
  const url = window.location.href;
  const jobIdMatch = url.match(/(?:jobs\/view\/(\d+)|currentJobId=(\d+))/);
  if (jobIdMatch) {
    const jobId = jobIdMatch[1] || jobIdMatch[2];
    // Only show loading if not in cache (meaning we need to fetch)
    if (!jobCache[jobId]) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        showLoadingState();
      }, 100);
    }
  }
}

// Check on page load
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', checkInitialJobPage);
} else {
  checkInitialJobPage();
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

function showLoadingState() {
  // Remove all existing custom divs and loading indicators
  document.querySelectorAll(".custom-views-count, .custom-applies-count, .custom-expires-count, .custom-remote-allowed, .custom-loading-indicator")
    .forEach(el => el.remove());

  // Find container
  const selectors = [
    ".job-details-jobs-unified-top-card__primary-description-container",
    ".jobs-unified-top-card__primary-description",
    ".job-details-jobs-unified-top-card__content",
    ".jobs-search__job-details",
  ];

  let container = null;
  for (const selector of selectors) {
    container = document.querySelector(selector);
    if (container) {
      break;
    }
  }

  if (container) {
    container.style.flexDirection = "column";
    container.style.alignItems = "flex-start";

    // Create loading indicator with animation
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "custom-loading-indicator";
    loadingDiv.style.cssText = `
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
      opacity: 0.8;
      position: relative;
    `;
    loadingDiv.innerHTML = `
      <span style="display: inline-block; animation: pulse 1.5s ease-in-out infinite;">⏳</span>
      Loading job stats...
    `;
    
    // Add CSS animation if not already added
    if (!document.getElementById('jobscura-loading-styles')) {
      const style = document.createElement('style');
      style.id = 'jobscura-loading-styles';
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
        }
      `;
      document.head.appendChild(style);
    }
    
    container.appendChild(loadingDiv);
  }
}

function updateAppliesOnPage(appliesCount, viewsCount, expiresAt, isRemoteAllowed) {
  // Remove all existing custom divs and loading indicators from the entire document first
  // This ensures we don't have duplicates even if container changes
  document.querySelectorAll(".custom-views-count, .custom-applies-count, .custom-expires-count, .custom-remote-allowed, .custom-loading-indicator")
    .forEach(el => el.remove());

  // Target the parent container
  const selectors = [
    ".job-details-jobs-unified-top-card__primary-description-container",
    ".jobs-unified-top-card__primary-description",
    ".job-details-jobs-unified-top-card__content",
    ".jobs-search__job-details",
  ];

  let container = null;
  for (const selector of selectors) {
    container = document.querySelector(selector);
    if (container) {
      break;
    }
  }

  if (container) {
    container.style.flexDirection = "column";
    container.style.alignItems = "flex-start";

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

    // Create remote allowed div
    if (isRemoteAllowed !== null && isRemoteAllowed !== undefined) {
      const remoteAllowedDiv = document.createElement("div");
      remoteAllowedDiv.className = "custom-remote-allowed";
      const backgroundColor = isRemoteAllowed ? "#00b759" : "#e05d44";
      remoteAllowedDiv.style.cssText = `
        background: ${backgroundColor};
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
      remoteAllowedDiv.textContent = isRemoteAllowed ? "Primarily Remote" : "Primarily On-Site";
      container.appendChild(remoteAllowedDiv);
    }
  }
}
