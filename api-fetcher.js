
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
      console.log('[Jobscura] No job ID found in URL');
      return;
    }

    const apiUrl = `https://www.linkedin.com/voyager/api/jobs/jobPostings/${jobId}`;
    
    const headers = {
      'Accept': 'application/vnd.linkedin.normalized+json+2.1',
      'x-restli-protocol-version': '2.0.0'
    };

    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['csrf-token'] = csrfToken;
    } else {
      console.warn('[Jobscura] CSRF token not found, API call may fail');
    }

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

function checkUrlAndFetch() {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    
    // Small delay to ensure page is ready
    setTimeout(() => {
      if (getJobIDFromURL()) {
        fetchJobStats();
      }
    }, 500);
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

// Also use MutationObserver as a fallback (like the example code)
const observer = new MutationObserver(() => {
  checkUrlAndFetch();
});

observer.observe(document, { subtree: true, childList: true });

// Initial fetch if already on a job page
if (getJobIDFromURL()) {
  // Wait for page to be ready
  if (document.readyState === 'loading') {
    window.addEventListener('load', () => {
      setTimeout(fetchJobStats, 1000);
    });
  } else {
    setTimeout(fetchJobStats, 1000);
  }
}

