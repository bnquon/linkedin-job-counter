const url = "https://api.counterapi.dev/v2/linkedinlens/jobs_viewed/up";

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === "update") {
    fetch(url, { method: "GET" }).catch((error) => {
      console.log("Analytics update error:", error);
    });
  }
});
