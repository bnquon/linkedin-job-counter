const url = "https://api.counterapi.dev/v2/linkedinlens/jobs_viewed/up";

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === "update") {
    fetch(url, { method: "GET" })
      .then((response) => {
        if (!response.ok) {
          console.warn("[Jobscura] CounterAPI request failed:", response.status);
        }
      })
      .catch((error) => {
        // Silently fail - metrics are non-critical
        console.warn("[Jobscura] CounterAPI error:", error);
      });
  }
});
