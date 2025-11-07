
// Get CSRF token
function getCsrfToken() {
  // Extract CSRF token from JSESSIONID cookie
  const match = document.cookie.match(/JSESSIONID="(.*?)"/);
  return match ? match[1] : null;
}

// Get job ID from URL
function getJobIDFromURL() {
  const url = window.location.href;
  // Match patterns like: /jobs/view/123456 or currentJobId=123456
  const jobIdMatch = url.match(/(?:jobs\/view\/(\d+)|currentJobId=(\d+))/);
  if (jobIdMatch) {
    return jobIdMatch[1] || jobIdMatch[2];
  }
  return null;
}

// Fetch job stats from LinkedIn API
async function fetchJobStats() {
  try {
    const jobId = getJobIDFromURL();
    if (!jobId) {
      return;
    }

    // Check if CSRF token is available - if not, page might not be ready
    const csrfToken = getCsrfToken();
    if (!csrfToken) {
      // Silently return - page might not be ready yet
      return;
    }

    const apiUrl = `https://www.linkedin.com/voyager/api/jobs/jobPostings/${jobId}`;
    
    const headers = {
      'Accept': 'application/vnd.linkedin.normalized+json+2.1',
      'x-restli-protocol-version': '2.0.0',
      'csrf-token': csrfToken
    };

    const response = await fetch(apiUrl, {
      headers: headers,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`API request failed: Status ${response.status}`);
    }

    const data = await response.json();

    if (data.data) {
      const jobId = data.data.jobPostingId;
      const appliesCount = data.data.applies;
      const viewsCount = data.data.views;
      const expireAt = data.data.expireAt;
      const isRemoteAllowed = data.data.workRemoteAllowed

      console.log(data.data);

      if (jobId && appliesCount !== undefined && viewsCount !== undefined && expireAt) {
        // Send data to content script
        window.postMessage(
          {
            type: 'LINKEDIN_JOB_DATA',
            jobId: jobId,
            applies: appliesCount,
            views: viewsCount,
            expireAt: expireAt,
            isRemoteAllowed: isRemoteAllowed,
          },
          '*'
        );
      } else {
        console.warn('[Jobscura] Incomplete data in API response:', data.data);
      }
    } else {
      console.warn('[Jobscura] No data present in API response');
    }
  } catch (error) {
    console.error('[Jobscura] Error fetching job stats:', error);
  }
}

// Watch for URL changes and fetch job stats when on a job page
let lastUrl = window.location.href;
let fetchTimeout = null;

function checkUrlAndFetch() {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    
    // Clear any pending fetch
    if (fetchTimeout) {
      clearTimeout(fetchTimeout);
    }
    
    // Wait for page to be ready before fetching
    if (getJobIDFromURL()) {
      // Wait for DOM to be ready and check if job container exists
      fetchTimeout = setTimeout(() => {
        // Check if the job details container exists (page is loaded)
        const jobContainer = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container') ||
                            document.querySelector('.jobs-unified-top-card__primary-description') ||
                            document.querySelector('.job-details-jobs-unified-top-card__content');
        
        if (jobContainer || document.readyState === 'complete') {
          fetchJobStats();
        } else {
          // If container not found, wait a bit more and try again
          fetchTimeout = setTimeout(() => {
            if (getJobIDFromURL()) {
              fetchJobStats();
            }
          }, 1000);
        }
      }, 1000);
    }
  }
}

// Monitor URL changes
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function () {
  originalPushState.apply(history, arguments);
  checkUrlAndFetch();
};

history.replaceState = function () {
  originalReplaceState.apply(history, arguments);
  checkUrlAndFetch();
};

window.addEventListener('popstate', checkUrlAndFetch);

// Use MutationObserver to detect URL changes (LinkedIn uses client-side navigation)
const observer = new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    checkUrlAndFetch();
  }
});

// Only observe after page is loaded
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    observer.observe(document, { subtree: true, childList: true });
  });
} else {
  observer.observe(document, { subtree: true, childList: true });
}

// Initial fetch if already on a job page - wait for page to be fully loaded
if (getJobIDFromURL()) {
  if (document.readyState === 'loading') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const jobContainer = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container') ||
                            document.querySelector('.jobs-unified-top-card__primary-description');
        if (jobContainer) {
          fetchJobStats();
        } else {
          // Wait a bit more if container not ready
          setTimeout(fetchJobStats, 1000);
        }
      }, 500);
    });
  } else if (document.readyState === 'complete') {
    setTimeout(() => {
      const jobContainer = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container') ||
                          document.querySelector('.jobs-unified-top-card__primary-description');
      if (jobContainer) {
        fetchJobStats();
      } else {
        setTimeout(fetchJobStats, 1000);
      }
    }, 500);
  }
}

