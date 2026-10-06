(function () {
  if (window.__leadAgentLoaded) return;
  window.__leadAgentLoaded = true;

  var script = document.currentScript;
  var origin = script ? new URL(script.src).origin : window.location.origin;
  var open = false;

  var frame = document.createElement("iframe");
  frame.src = origin + "/widget?page=" + encodeURIComponent(window.location.href);
  frame.title = "Chat with us";
  frame.style.cssText =
    "position:fixed;bottom:88px;right:16px;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100vh - 120px));" +
    "border:0;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.25);z-index:2147483646;display:none;background:#fff;";

  var button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "Open chat");
  button.innerHTML =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  button.style.cssText =
    "position:fixed;bottom:16px;right:16px;width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;" +
    "background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;" +
    "box-shadow:0 6px 20px rgba(0,0,0,.25);z-index:2147483647;";
  button.onclick = function () {
    open = !open;
    frame.style.display = open ? "block" : "none";
    button.setAttribute("aria-label", open ? "Close chat" : "Open chat");
  };

  document.body.appendChild(frame);
  document.body.appendChild(button);
})();
