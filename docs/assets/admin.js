(() => {
  "use strict";

  const {
    config,
    demoMode,
    getClient,
    readDemoRequests,
    updateDemoRequest,
    escapeHtml,
    formatDateTime,
    formatDate,
    formatTime,
    todayDateString,
    attendeeTypeLabel
  } = window.AccessApp;

  const loginPanel = document.querySelector("#login-panel");
  const dashboard = document.querySelector("#dashboard");
  const loginForm = document.querySelector("#login-form");
  const logoutButton = document.querySelector("#logout-button");
  const tableBody = document.querySelector("#request-table-body");
  const emptyState = document.querySelector("#empty-state");
  const detailPanel = document.querySelector("#detail-panel");
  const detailContent = document.querySelector("#detail-content");
  const refreshButton = document.querySelector("#refresh-button");
  const modeBanner = document.querySelector("#mode-banner");
  const searchInput = document.querySelector("#search");
  const statusFilter = document.querySelector("#status-filter");
  const locationFilter = document.querySelector("#location-filter");
  const dateFilter = document.querySelector("#date-filter");
  const loginError = document.querySelector("#login-error");

  let client = null;
  let requests = [];
  let selectedRequest = null;

  const statusLabels = {
    pending: "รอตรวจสอบ",
    approved: "อนุมัติ",
    rejected: "ไม่อนุมัติ",
    completed: "เสร็จสิ้น"
  };

  function showDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
    loadRequests();
  }

  function showLogin() {
    dashboard.hidden = true;
    loginPanel.hidden = false;
  }

  async function loadRequests() {
    refreshButton.disabled = true;
    try {
      if (demoMode) {
        requests = readDemoRequests();
      } else {
        const { data, error } = await client
          .from("access_requests")
          .select("*, attendees(*)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        requests = data || [];
      }
      renderRequests();
      updateStats();
      if (selectedRequest) {
        selectedRequest = requests.find((item) => item.id === selectedRequest.id) || null;
        if (selectedRequest) renderDetail(selectedRequest);
      }
    } catch (error) {
      window.alert(error.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      refreshButton.disabled = false;
    }
  }

  function filteredRequests() {
    const query = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;
    const location = locationFilter.value;
    const date = dateFilter.value;
    return requests.filter((request) => {
      const searchable = [
        request.request_code,
        request.project_name,
        request.objective,
        request.room,
        request.host_name,
        request.source_file_name,
        ...(request.attendees || []).flatMap((person) => [person.name, person.company, person.mobile, person.email, person.car_license, person.tidc_card_no])
      ].join(" ").toLowerCase();
      return (!query || searchable.includes(query)) &&
        (!status || request.status === status) &&
        (!location || request.location === location) &&
        (!date || request.visit_date === date);
    });
  }

  function renderRequests() {
    const items = filteredRequests();
    tableBody.innerHTML = items.map((request) => `
      <tr data-id="${escapeHtml(request.id)}">
        <td><strong>${escapeHtml(request.request_code)}</strong><small>ส่งเมื่อ ${escapeHtml(formatDateTime(request.created_at))}</small></td>
        <td>${escapeHtml(request.location)}</td>
        <td>${escapeHtml(request.project_name)}<small>${escapeHtml(request.room)}</small></td>
        <td>${escapeHtml(formatDate(request.visit_date))}</td>
        <td>${escapeHtml(request.source_file_name || "-")}</td>
        <td>${(request.attendees || []).length}</td>
        <td><span class="status status--${escapeHtml(request.status)}">${escapeHtml(statusLabels[request.status] || request.status)}</span></td>
        <td><button class="button button--ghost button--small view-request" data-id="${escapeHtml(request.id)}">ตรวจสอบ</button></td>
      </tr>`).join("");
    emptyState.hidden = items.length > 0;
  }

  function updateStats() {
    const count = (status) => requests.filter((item) => item.status === status).length;
    document.querySelector("#stat-total").textContent = String(requests.length);
    document.querySelector("#stat-pending").textContent = String(count("pending"));
    document.querySelector("#stat-approved").textContent = String(count("approved"));
    document.querySelector("#stat-today").textContent = String(requests.filter((item) => item.visit_date === todayDateString()).length);
  }

  function operationalComplete(request) {
    const attendees = request.attendees || [];
    if (!attendees.length) return false;
    return attendees.every((person) => person.entry_time && person.exit_time);
  }

  function renderDetail(request) {
    selectedRequest = request;
    const attendeeRows = [...(request.attendees || [])].sort((a, b) => Number(a.line_no || 999) - Number(b.line_no || 999)).map((person, index) => `
      <tr data-attendee-id="${escapeHtml(person.id)}">
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.email)}</small></td>
        <td>${escapeHtml(attendeeTypeLabel(person.attendee_type))}</td>
        <td>${escapeHtml(person.company)}<small>${escapeHtml(person.car_license || "N/A")}</small></td>
        <td>${escapeHtml(person.mobile)}</td>
        <td>${escapeHtml(person.card_type)} / ${escapeHtml(person.identity_last4)}</td>
        <td><input class="table-input tidc-card" maxlength="40" value="${escapeHtml(person.tidc_card_no || "")}" placeholder="Card no."></td>
        <td>
          <div class="time-editor"><input class="table-input entry-time" type="time" value="${escapeHtml(formatTime(person.entry_time))}"><button type="button" class="mini-button time-now" data-target="entry-time">ตอนนี้</button></div>
        </td>
        <td>
          <div class="time-editor"><input class="table-input exit-time" type="time" value="${escapeHtml(formatTime(person.exit_time))}"><button type="button" class="mini-button time-now" data-target="exit-time">ตอนนี้</button></div>
        </td>
      </tr>`).join("");

    detailContent.innerHTML = `
      <div class="detail-header">
        <div><p class="eyebrow">${escapeHtml(request.request_code)}</p><h2>${escapeHtml(request.project_name)}</h2></div>
        <button type="button" class="icon-button" id="close-detail" aria-label="ปิด">×</button>
      </div>
      <div class="detail-meta">
        <div><span>สถานที่</span><strong>${escapeHtml(request.location)}</strong></div>
        <div><span>วันที่เข้าพื้นที่</span><strong>${escapeHtml(formatDate(request.visit_date))}</strong></div>
        <div><span>ห้อง</span><strong>${escapeHtml(request.room)}</strong></div>
        <div><span>วัตถุประสงค์</span><strong>${escapeHtml(request.objective)}</strong></div>
        <div><span>ผู้ประสานงาน</span><strong>${escapeHtml(request.host_name || "-")} ${escapeHtml(request.host_phone || "")}</strong></div>
        <div><span>ไฟล์ต้นทาง</span><strong>${escapeHtml(request.source_file_name || "-")}</strong></div>
      </div>
      ${request.notes ? `<div class="notes"><strong>หมายเหตุ:</strong> ${escapeHtml(request.notes)}</div>` : ""}
      <div class="security-instruction"><strong>สำหรับ รปภ.:</strong> ตรวจสอบ ID / Passport แล้วกรอก Card no. TIDC และเวลาเข้า–ออกจริงของแต่ละคน จากนั้นกด “บันทึกข้อมูล รปภ.”</div>
      <div class="table-wrap table-wrap--detail"><table class="security-table"><thead><tr><th>No.</th><th>Name</th><th>Type</th><th>Company / Car</th><th>Mobile</th><th>ID/Passport</th><th>Card no. TIDC</th><th>Time In</th><th>Time Out</th></tr></thead><tbody>${attendeeRows}</tbody></table></div>
      <div class="detail-actions">
        <button class="button button--primary" id="save-security-data">บันทึกข้อมูล รปภ.</button>
        <button class="button button--success status-action" data-status="approved">อนุมัติ</button>
        <button class="button button--danger status-action" data-status="rejected">ไม่อนุมัติ</button>
        <button class="button button--ghost status-action" data-status="completed">เสร็จสิ้น</button>
        <span class="action-divider"></span>
        <button class="button button--secondary" id="export-fr">ดาวน์โหลด FR-037</button>
        <button class="button button--ghost" id="print-fr">พิมพ์ FR-037</button>
      </div>
      ${operationalComplete(request) ? "<p class=\"completion-note\">บันทึกเวลาเข้า–ออกครบทุกคนแล้ว</p>" : ""}`;
    detailPanel.hidden = false;
  }

  function currentClock() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: config.TIMEZONE || "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.hour}:${values.minute}`;
  }

  function collectSecurityRows() {
    return [...detailContent.querySelectorAll("tr[data-attendee-id]")].map((row) => {
      const entryTime = row.querySelector(".entry-time").value || null;
      const exitTime = row.querySelector(".exit-time").value || null;
      if (exitTime && !entryTime) throw new Error("กรุณาระบุ Time In ก่อน Time Out");
      return {
        id: row.dataset.attendeeId,
        tidc_card_no: row.querySelector(".tidc-card").value.trim() || null,
        entry_time: entryTime,
        exit_time: exitTime
      };
    });
  }

  async function saveSecurityData() {
    if (!selectedRequest) return;
    const button = detailContent.querySelector("#save-security-data");
    button.disabled = true;
    button.textContent = "กำลังบันทึก…";
    try {
      const patches = collectSecurityRows();
      let updated;
      if (demoMode) {
        const patchMap = new Map(patches.map((item) => [item.id, item]));
        const attendees = (selectedRequest.attendees || []).map((person) => ({ ...person, ...(patchMap.get(person.id) || {}) }));
        updated = updateDemoRequest(selectedRequest.id, { attendees });
      } else {
        const results = await Promise.all(patches.map((patch) => client
          .from("attendees")
          .update({
            tidc_card_no: patch.tidc_card_no,
            entry_time: patch.entry_time,
            exit_time: patch.exit_time
          })
          .eq("id", patch.id)));
        const failed = results.find((result) => result.error);
        if (failed) throw failed.error;
        const { data, error } = await client
          .from("access_requests")
          .select("*, attendees(*)")
          .eq("id", selectedRequest.id)
          .single();
        if (error) throw error;
        updated = data;
      }

      const index = requests.findIndex((item) => item.id === updated.id);
      if (index >= 0) requests[index] = updated;
      selectedRequest = updated;
      renderRequests();
      updateStats();
      renderDetail(updated);
      window.alert("บันทึกข้อมูล รปภ. เรียบร้อย");
    } catch (error) {
      window.alert(error.message || "บันทึกข้อมูลไม่สำเร็จ");
      if (button) {
        button.disabled = false;
        button.textContent = "บันทึกข้อมูล รปภ.";
      }
    }
  }

  async function changeStatus(status) {
    if (!selectedRequest) return;
    try {
      let updated;
      if (demoMode) {
        updated = updateDemoRequest(selectedRequest.id, { status, reviewed_at: new Date().toISOString() });
      } else {
        const { data: authData } = await client.auth.getUser();
        const { data, error } = await client
          .from("access_requests")
          .update({
            status,
            reviewed_at: new Date().toISOString(),
            reviewed_by: authData?.user?.id || null
          })
          .eq("id", selectedRequest.id)
          .select("*, attendees(*)")
          .single();
        if (error) throw error;
        updated = data;
      }
      const index = requests.findIndex((item) => item.id === updated.id);
      if (index >= 0) requests[index] = updated;
      renderRequests();
      updateStats();
      renderDetail(updated);
    } catch (error) {
      window.alert(error.message || "เปลี่ยนสถานะไม่สำเร็จ");
    }
  }

  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest(".view-request");
    const row = event.target.closest("tr[data-id]");
    const id = button?.dataset.id || row?.dataset.id;
    if (!id) return;
    const request = requests.find((item) => item.id === id);
    if (request) renderDetail(request);
  });

  detailPanel.addEventListener("click", async (event) => {
    if (event.target.id === "close-detail" || event.target === detailPanel) {
      detailPanel.hidden = true;
      return;
    }

    const nowButton = event.target.closest(".time-now");
    if (nowButton) {
      const row = nowButton.closest("tr[data-attendee-id]");
      row.querySelector(`.${nowButton.dataset.target}`).value = currentClock();
      return;
    }

    const statusButton = event.target.closest(".status-action");
    if (statusButton) return changeStatus(statusButton.dataset.status);
    if (event.target.id === "save-security-data") return saveSecurityData();

    try {
      if (event.target.id === "export-fr") await window.AccessExports.exportFR037(selectedRequest);
      if (event.target.id === "print-fr") window.AccessExports.printFR037(selectedRequest);
    } catch (error) {
      window.alert(error.message || "ไม่สามารถสร้างเอกสารได้");
    }
  });

  [searchInput, statusFilter, locationFilter, dateFilter].forEach((element) => {
    element.addEventListener(element.tagName === "INPUT" ? "input" : "change", renderRequests);
  });
  refreshButton.addEventListener("click", loadRequests);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.hidden = true;
    const email = document.querySelector("#admin-email").value.trim();
    const password = document.querySelector("#admin-password").value;
    if (!client) client = await getClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      loginError.textContent = error.message;
      loginError.hidden = false;
      return;
    }
    showDashboard();
  });

  logoutButton.addEventListener("click", async () => {
    if (!demoMode) await client.auth.signOut();
    showLogin();
  });

  async function initialize() {
    if (demoMode) {
      modeBanner.hidden = false;
      modeBanner.innerHTML = "<strong>Demo mode:</strong> Dashboard นี้เห็นเฉพาะข้อมูลที่อัปโหลดด้วยเบราว์เซอร์เครื่องเดียวกัน";
      logoutButton.hidden = true;
      showDashboard();
      return;
    }
    client = await getClient();
    const { data } = await client.auth.getSession();
    if (data.session) showDashboard();
    else showLogin();
  }

  initialize();
})();
