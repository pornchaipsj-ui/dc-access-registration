(() => {
  "use strict";

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const insideCount = q("#summary-inside");
  const insideCard = insideCount?.closest(".security-summary-card");

  if (!insideCard || !window.AccessApp) return;

  let client = null;
  const idCache = new Map();
  let refreshTimer = null;

  async function getClient() {
    if (!client) client = await window.AccessApp.getClient();
    return client;
  }

  function ensureHeader(modal) {
    const headerRow = q(".inside-return-table thead tr", modal);
    if (!headerRow || q("th[data-inside-id-last4]", headerRow)) return;

    const nameHeader = headerRow.children[1];
    if (!nameHeader) return;

    const th = document.createElement("th");
    th.dataset.insideIdLast4 = "1";
    th.textContent = "ID 4 ตัวท้าย";
    nameHeader.insertAdjacentElement("afterend", th);
  }

  async function loadIds(ids) {
    const missing = ids.filter((id) => id && !idCache.has(id));
    if (!missing.length || window.AccessApp.demoMode) return;

    const supabase = await getClient();
    const result = await supabase
      .from("attendees")
      .select("id,identity_last4")
      .in("id", missing);

    if (result.error) throw result.error;

    (result.data || []).forEach((person) => {
      idCache.set(String(person.id), person.identity_last4 || "-");
    });

    missing.forEach((id) => {
      if (!idCache.has(id)) idCache.set(id, "-");
    });
  }

  async function enhanceRows() {
    const modal = q("#inside-return-modal");
    if (!modal || modal.hidden) return;

    ensureHeader(modal);

    const rows = qa("#inside-return-body tr", modal)
      .filter((row) => q("button[data-return-attendee]", row));

    const ids = rows.map((row) =>
      String(q("button[data-return-attendee]", row)?.dataset.returnAttendee || "")
    );

    try {
      await loadIds(ids);
    } catch (error) {
      console.error("Unable to load ID last 4 digits", error);
    }

    rows.forEach((row) => {
      if (q("td[data-inside-id-last4]", row)) return;

      const attendeeId = String(
        q("button[data-return-attendee]", row)?.dataset.returnAttendee || ""
      );
      const nameCell = row.children[1];
      if (!nameCell) return;

      const td = document.createElement("td");
      td.dataset.insideIdLast4 = "1";
      td.textContent = idCache.get(attendeeId) || "-";
      nameCell.insertAdjacentElement("afterend", td);
    });
  }

  function scheduleEnhance() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      enhanceRows();
    }, 0);
  }

  insideCard.addEventListener("click", () => {
    setTimeout(scheduleEnhance, 50);
  });

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.body, { childList: true, subtree: true });
})();
