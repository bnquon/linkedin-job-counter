let lastUrl = window.location.href;

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

window.addEventListener("popstate", checkUrlChange);

function checkUrlChange() {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;

    window.postMessage(
      {
        type: "LINKEDIN_URL_CHANGE",
        url: currentUrl,
      },
      "*"
    );
  }
}
