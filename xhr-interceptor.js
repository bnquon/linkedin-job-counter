const originalXHR = XMLHttpRequest.prototype.open;

XMLHttpRequest.prototype.open = function (method, url) {
  if (url && url.includes("voyager/api/jobs")) {
    this.addEventListener("readystatechange", function () {
      if (this.readyState === 4 && this.status === 200) {
        this.response
          .text()
          .then((text) => JSON.parse(text))
          .then((data) => {
            const jobId = data.data.jobPostingId;
            const appliesCount = data.data.applies;
            const viewsCount = data.data.views;
            const expireAt = data.data.expireAt;

            if (jobId && appliesCount && viewsCount && expireAt) {
              // Send data to content script
              window.postMessage(
                {
                  type: "LINKEDIN_JOB_DATA",
                  jobId: jobId,
                  applies: appliesCount,
                  views: viewsCount,
                  expireAt: expireAt,
                },
                "*"
              );
            }
          })
          .catch((e) => console.log("Error:", e));
      }
    });
  }
  return originalXHR.apply(this, arguments);
};
