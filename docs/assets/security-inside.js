(() => {
  "use strict";

  const q = (selector, root = document) => root.querySelector(selector);
  const dateFilter = q("#date-filter");
  const insideCount = q("#summary-inside");
  const insideCard = insideCount?.closest(".security-summary-card");

  if (!dateFilter || !insideCount || !insideCard || !window.AccessApp) return;

  let client = null;
  let insideRows = [];

  function esc(value) {
    return window.AccessApp.escapeHtml(String(value ?? ""));
  }

  function formatTime(value) {
    return value ? window.AccessApp.formatTime(value) : "-";
  }

  function clock() {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date());
  }

  async function getClient() {
    if (!client) client = await window.AccessApp.getClient();
    return client;
  }

  function ensureModal() {
    let modal = q("#inside-return-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "inside-return-modal";
    modal.className = "inside-return-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="inside-return-backdrop" data-close-inside></div>
      <section class="inside-return-dialog" role="dialog" aria-modal="true" aria-labelledby="inside-return-title">
        <div class="inside-return-header">
          <div>
            <p class="eyebrow">Currently Inside</p>
            <h2 id="inside-return-title">คืนบัตรผู้ที่ยังอยู่</h2>
            <small id="inside-return-date"></small>
          </div>
          <button type="button" class="icon-button" data-close-inside aria-label="Close">×</button>
        </div>

        <label class="inside-return-search-label">
          ค้นหา / Search
          <input id="inside-return-search" type="search" placeholder="Request 6 ตัวท้าย / ชื่อ / Card / ID 4 ตัวท้าย">
        </label>

        <div class="table-wrap inside-return-table-wrap">
          <table class="inside-return-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>ชื่อ / Name</th>
                <th>Card</th>
                <th>เวลาเข้า</th>
                <th>เวลาคืนบัตร</th>
              </tr>
            </thead>
            <tbody id="inside-return-body"></tbody>
          </table>
        </div>
        <div id="inside-return-empty" class="empty-state" hidden>ไม่พบผู้ที่ยังไม่ได้คืนบัตร</div>
      </section>
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-inside]")) {
        modal.hidden = true;
        return;
      }

      const button = event.target.closest("button[data-return-attendee]");
      if (button) returnCard(button).catch((error) => alert(error.message || "ไม่สามารถบันทึกเวลาคืนบัตรได้"));
    });

    q("#inside-return-search", modal).addEventListener("input", renderRows);

    return modal;
  }

  async function loadInsideRows() {
    const selectedDate = dateFilter.value;
    if (!selectedDate) throw new Error("กรุณาเลือกวันที่ก่อน");
    if (window.AccessApp.demoMode) throw new Error("Demo mode ยังไม่รองรับรายการคืนบัตร");

    const supabase = await getClient();

    const requestResult = await supabase
      .from("access_requests")
      .select("id,request_code,visit_date,visit_end_date,status,attendees(id,name,identity_last4)")
      .eq("status", "approved")
      .lte("visit_date", selectedDate);

    if (requestResult.error) throw requestResult.error;

    const requests = (requestResult.data || []).filter((request) =>
      !request.visit_end_date || request.visit_end_date >= selectedDate
    );

    const attendeeInfo = new Map();
    requests.forEach((request) => {
      (request.attendees || []).forEach((person) => {
        attendeeInfo.set(String(person.id), {
          requestId: request.id,
          requestCode: request.request_code || "",
          name: person.name || "",
          identityLast4: person.identity_last4 || ""
        });
      });
    });

    if (!attendeeInfo.size) {
      insideRows = [];
      return;
    }

    const dailyResult = await supabase
      .from("attendee_daily_records")
      .select("attendee_id,record_date,tidc_card_no,entry_time,card_exchange_time,card_return_time")
      .eq("record_date", selectedDate)
      .not("card_exchange_time", "is", null)
      .is("card_return_time", null);

    if (dailyResult.error) throw dailyResult.error;

    insideRows = (dailyResult.data || [])
      .map((record) => {
        const info = attendeeInfo.get(String(record.attendee_id));
        if (!info) return null;
        return {
          attendeeId: String(record.attendee_id),
          requestId: info.requestId,
          requestCode: info.requestCode,
          requestTail: String(info.requestCode || "").slice(-6),
          name: info.name,
          identityLast4: info.identityLast4,
          card: record.tidc_card_no || "",
          entryTime: record.entry_time || record.card_exchange_time || null
        };
      })
      .filter(Boolean)
      .sort((a, b) => String(a.entryTime || "").localeCompare(String(b.entryTime || "")));
  }

  function renderRows() {
    const modal = ensureModal();
    const body = q("#inside-return-body", modal);
    const empty = q("#inside-return-empty", modal);
    const term = q("#inside-return-search", modal).value.trim().toLowerCase();

    const rows = insideRows.filter((row) => {
      if (!term) return true;
      return [
        row.requestTail,
        row.requestCode,
        row.name,
        row.card,
        row.identityLast4
      ].some((value) => String(value || "").toLowerCase().includes(term));
    });

    body.innerHTML = rows.map((row) => `
      <tr>
        <td><strong>${esc(row.requestTail || row.requestCode)}</strong></td>
        <td>${esc(row.name)}</td>
        <td>${esc(row.card || "No Card")}</td>
        <td>${esc(formatTime(row.entryTime))}</td>
        <td>
          <button
            type="button"
            class="button button--primary inside-return-button"
            data-return-attendee="${esc(row.attendeeId)}"
          >คืนบัตรตอนนี้</button>
        </td>
      </tr>
    `).join("");

    empty.hidden = rows.length > 0;
  }

  async function openInside() {
    const modal = ensureModal();
    const selectedDate = dateFilter.value;
    q("#inside-return-date", modal).textContent = selectedDate ? `วันที่ ${selectedDate}` : "";
    q("#inside-return-search", modal).value = "";
    q("#inside-return-body", modal).innerHTML = `<tr><td colspan="5">กำลังโหลด...</td></tr>`;
    q("#inside-return-empty", modal).hidden = true;
    modal.hidden = false;

    await loadInsideRows();
    renderRows();
  }

  async function returnCard(button) {
    const attendeeId = String(button.dataset.returnAttendee || "");
    const selectedDate = dateFilter.value;
    if (!attendeeId || !selectedDate) return;

    button.disabled = true;
    const previousText = button.textContent;
    button.textContent = "กำลังบันทึก...";

    try {
      const supabase = await getClient();
      const result = await supabase
        .from("attendee_daily_records")
        .update({ card_return_time: clock() })
        .eq("attendee_id", attendeeId)
        .eq("record_date", selectedDate)
        .is("card_return_time", null);

      if (result.error) throw result.error;

      insideRows = insideRows.filter((row) => row.attendeeId !== attendeeId);
      renderRows();

      const refreshButton = q("#refresh-button");
      if (refreshButton) refreshButton.click();
    } catch (error) {
      button.disabled = false;
      button.textContent = previousText;
      throw error;
    }
  }

  insideCard.classList.add("security-summary-card--clickable");
  insideCard.setAttribute("role", "button");
  insideCard.setAttribute("tabindex", "0");
  insideCard.setAttribute("title", "กดเพื่อดูรายชื่อผู้ที่ยังไม่ได้คืนบัตร");

  insideCard.addEventListener("click", () => {
    openInside().catch((error) => {
      ensureModal().hidden = true;
      alert(error.message || "ไม่สามารถโหลดรายการผู้ที่ยังอยู่ได้");
    });
  });

  insideCard.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      insideCard.click();
    }
  });

  const style = document.createElement("style");
  style.textContent = `
    .security-summary-card--clickable {
      cursor: pointer;
      transition: transform .12s ease, box-shadow .12s ease;
    }
    .security-summary-card--clickable:hover {
      transform: translateY(-1px);
      box-shadow: 0 5px 18px rgba(15, 23, 42, .10);
    }
    .inside-return-modal[hidden] { display: none !important; }
    .inside-return-modal {
      position: fixed;
      inset: 0;
      z-index: 1200;
      display: grid;
      place-items: center;
      padding: 18px;
    }
    .inside-return-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, .55);
    }
    .inside-return-dialog {
      position: relative;
      width: min(980px, 96vw);
      max-height: 88vh;
      overflow: auto;
      background: #fff;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 24px 70px rgba(15, 23, 42, .28);
    }
    .inside-return-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .inside-return-header h2 { margin: 2px 0 2px; }
    .inside-return-search-label {
      display: grid;
      gap: 6px;
      margin-bottom: 14px;
      font-weight: 700;
    }
    .inside-return-search-label input {
      width: 100%;
      padding: 11px 12px;
    }
    .inside-return-table th,
    .inside-return-table td {
      vertical-align: middle;
    }
    .inside-return-button {
      white-space: nowrap;
      padding: 8px 12px;
    }
    @media (max-width: 720px) {
      .inside-return-dialog { padding: 14px; }
      .inside-return-table-wrap { overflow-x: auto; }
      .inside-return-table { min-width: 720px; }
    }
  `;
  document.head.appendChild(style);
})();
