(() => {
  "use strict";

  const detail = document.querySelector("#detail-panel");
  const content = document.querySelector("#detail-content");
  if (!detail || !content || !window.AccessApp) return;

  let working = false;

  function ensureButton() {
    const actions = content.querySelector(".detail-actions");
    if (!actions || content.querySelector("#download-fr333")) return;

    const button = document.createElement("button");
    button.id = "download-fr333";
    button.type = "button";
    button.className = "button button--secondary";
    button.textContent = "Download FR-333";
    actions.appendChild(button);
  }

  async function getCurrentRequest() {
    const code = content.querySelector(".detail-header .eyebrow")?.textContent?.trim();
    if (!code) throw new Error("ไม่พบเลข Request");

    if (window.AccessApp.demoMode) {
      const found = (window.AccessApp.readDemoRequests?.() || []).find(
        (request) => request.request_code === code
      );
      if (!found) throw new Error("ไม่พบ Request");
      return found;
    }

    const client = await window.AccessApp.getClient();
    const result = await client
      .from("access_requests")
      .select("*, attendees(*)")
      .eq("request_code", code)
      .single();

    if (result.error) throw result.error;
    return result.data;
  }

  detail.addEventListener("click", async (event) => {
    const button = event.target.closest("#download-fr333");
    if (!button || working) return;

    event.preventDefault();
    event.stopPropagation();

    working = true;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "กำลังสร้าง FR-333...";

    try {
      if (!window.FR333Export?.download) {
        throw new Error("ไม่พบระบบสร้าง FR-333");
      }
      const request = await getCurrentRequest();
      await window.FR333Export.download(request);
    } catch (error) {
      alert(error.message || "ไม่สามารถสร้าง FR-333 ได้");
    } finally {
      working = false;
      button.disabled = false;
      button.textContent = original;
    }
  }, true);

  const observer = new MutationObserver(ensureButton);
  observer.observe(content, { childList: true, subtree: true });
  ensureButton();
})();
