chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    sendResponse({
      text: document.body.innerText,
      url: window.location.href,
    });
  }
  return true;
});
