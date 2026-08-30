(() => {
  "use strict";

  const q = (selector, root = document) => root.querySelector(selector);
  const esc = (value) => window.AccessApp.escapeHtml(value == null ? "" : String(value));
  const dashboard = q("#dashboard");
  const toolbar = q(".dashboard-toolbar");

  if (!dashboard || !toolbar || !window.AccessApp) return;

  let client = null;
  let overlay = null;
  let countButton = null;

  function todayLocal() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatDate(value) {
    if (!value) return "-";
    return window.AccessApp.formatDate ? window.AccessApp.formatDate(value) : value;
  }

  async function getClient() {
    if (!client) client = await window.AccessApp.getClient();
    return client;
  }

  function ensureUI() {
    if (!countButton) {
      countButton = document.createElement("button");
      countButton.id = "overdue-card-button";
      countButton.className = "button button--danger";
      countButton.type = "button";
      countButton.innerHTML = `บัตรค้างข้ามวัน <strong id="overdue-card-count">0</strong>`;
      toolbar.insertBefore(countButton, toolbar.firstChild);
      countButton.addEventListener("click", openSummary);
    }

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "detail-overlay";
      overlay.id = "overdue-card-overlay";
      overlay.hidden = true;
      overlay.innerHTML = `<aside class="detail-drawer overdue-card-drawer">
        <div class="detail-header">
          <div><p class="eyebrow">Security Follow-up</p><h2>สรุปผู้ที่ยังไม่คืนบัตรข้ามวัน</h2></div>
          <button id="close-overdue-card" class="icon-button" type="button">×</button>
        </div>
        <p class="status-note">แสดงเฉพาะรายการที่รับบัตรก่อนวันนี้ และยังไม่มีเวลาคืนบัตร</p>
        <div id="overdue-card-content"><div class="empty-state">กำลังโหลดข้อมูล...</div></div>
      </aside>`;
      document.body.appendChild(overlay);

      overlay.addEventListener("click", (event) => {
        if (event.target === overlay || event.target.id === "close-overdue-card") {
          overlay.hidden = true;
        }
      });
    }
  }

  async function loadOverdue() {
    if (window.AccessApp.demoMode) return [];
    const supabase = await getClient();
    const today = todayLocal();

    const recordsResult = await supabase
      .from("attendee_daily_records")
      .select("id,request_id,attendee_id,record_date,tidc_card_no,card_exchange_time,card_return_time")
      .lt("record_date", today)
      .not("card_exchange_time", "is", null)
      .is("card_return_time", null)
      .order("record_date", { ascending: true });

    if (recordsResult.error) throw recordsResult.error;
    const records = recordsResult.data || [];
    if (!records.length) return [];

    const attendeeIds = [...new Set(records.map((r) => r.attendee_id).filter(Boolean))];
    const requestIds = [...new Set(records.map((r) => r.request_id).filter(Boolean))];

    const [attendeesResult, requestsResult] = await Promise.all([
      supabase.from("attendees").select("id,name,mobile,company").in("id", attendeeIds),
      supabase.from("access_requests").select("id,request_code,requester_name,requester_phone,requester_company").in("id", requestIds)
    ]);

    if (attendeesResult.error) throw attendeesResult.error;
    if (requestsResult.error) throw requestsResult.error;

    const attendees = new Map((attendeesResult.data || []).map((x) => [String(x.id), x]));
    const requests = new Map((requestsResult.data || []).map((x) => [String(x.id), x]));

    return records.map((record) => ({
      ...record,
      attendee: attendees.get(String(record.attendee_id)) || {},
      request: requests.get(String(record.request_id)) || {}
    }));
  }

  function renderRows(rows) {
    const target = q("#overdue-card-content", overlay);
    if (!rows.length) {
      target.innerHTML = `<div class="empty-state">ไม่มีรายการบัตรค้างข้ามวัน</div>`;
      return;
    }

    target.innerHTML = `<div class="table-wrap table-wrap--detail">
      <table class="security-table overdue-card-table">
        <thead><tr>
          <th>No.</th>
          <th>เลขลงทะเบียน</th>
          <th>ชื่อ</th>
          <th>เบอร์โทร</th>
          <th>เลขบัตร</th>
          <th>ชื่อผู้ Request</th>
          <th>เบอร์ผู้ Request</th>
          <th>วันที่รับบัตร</th>
        </tr></thead>
        <tbody>${rows.map((row, index) => `<tr>
          <td>${index + 1}</td>
          <td><strong>${esc(row.request.request_code || "-")}</strong></td>
          <td><strong>${esc(row.attendee.name || "-")}</strong><small>${esc(row.attendee.company || "")}</small></td>
          <td>${esc(row.attendee.mobile || "-")}</td>
          <td><strong>${esc(row.tidc_card_no || "-")}</strong></td>
          <td><strong>${esc(row.request.requester_name || "-")}</strong><small>${esc(row.request.requester_company || "")}</small></td>
          <td>${esc(row.request.requester_phone || "-")}</td>
          <td>${esc(formatDate(row.record_date))}<small>${esc(window.AccessApp.formatTime?.(row.card_exchange_time) || "")}</small></td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`;
  }

  async function refreshCount() {
    ensureUI();
    try {
      const rows = await loadOverdue();
      const count = q("#overdue-card-count", countButton);
      if (count) count.textContent = String(rows.length);
      countButton.classList.toggle("button--danger", rows.length > 0);
      countButton.classList.toggle("button--secondary", rows.length === 0);
      return rows;
    } catch (error) {
      console.error("Unable to load overdue card summary", error);
      return [];
    }
  }

  async function openSummary() {
    ensureUI();
    overlay.hidden = false;
    q("#overdue-card-content", overlay).innerHTML = `<div class="empty-state">กำลังโหลดข้อมูล...</div>`;
    try {
      const rows = await loadOverdue();
      const count = q("#overdue-card-count", countButton);
      if (count) count.textContent = String(rows.length);
      renderRows(rows);
    } catch (error) {
      q("#overdue-card-content", overlay).innerHTML = `<div class="error-list"><strong>โหลดข้อมูลไม่สำเร็จ</strong><p>${esc(error.message || error)}</p></div>`;
    }
  }

  const style = document.createElement("style");
  style.textContent = `
    #overdue-card-button strong {
      display: inline-flex;
      min-width: 24px;
      height: 24px;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
      margin-left: 6px;
      border-radius: 999px;
      background: rgba(255,255,255,.22);
    }
    .overdue-card-drawer { width: min(1180px, 96vw); }
    .overdue-card-table { min-width: 1050px; }
  `;
  document.head.appendChild(style);

  ensureUI();

  const dashboardObserver = new MutationObserver(() => {
    if (!dashboard.hidden) refreshCount();
  });
  dashboardObserver.observe(dashboard, { attributes: true, attributeFilter: ["hidden"] });

  q("#refresh-button")?.addEventListener("click", () => setTimeout(refreshCount, 300));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !dashboard.hidden) refreshCount();
  });

  setTimeout(() => {
    if (!dashboard.hidden) refreshCount();
  }, 700);
})();