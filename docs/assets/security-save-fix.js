(() => {
  "use strict";

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const detail = q("#detail-panel");
  const content = q("#detail-content");
  const dateFilter = q("#date-filter");

  if (!detail || !content || !dateFilter || !window.AccessApp) return;

  let client = null;
  let saving = false;

  async function getClient() {
    if (!client) client = await window.AccessApp.getClient();
    return client;
  }

  function prepareSaveButton() {
    const oldButton = q("#save", content);
    if (!oldButton) return;
    oldButton.id = "save-v2";
    oldButton.type = "button";
  }

  function value(row, selector) {
    return q(selector, row)?.value?.trim() || null;
  }

  function collectRows() {
    return qa("tr[data-attendee-id]", content)
      .map((row, index) => {
        const entry = value(row, ".entry-time");
        const exit = value(row, ".exit-time");
        const exchange = value(row, ".card-exchange");
        const returned = value(row, ".card-return");
        const card = value(row, ".tidc-card");

        if (exit && !entry) {
          throw new Error(`แถว ${index + 1}: กรุณาระบุเวลาเข้าก่อนเวลาออก`);
        }
        if (returned && !exchange) {
          throw new Error(`แถว ${index + 1}: กรุณาระบุเวลาแลกบัตรก่อนเวลาคืนบัตร`);
        }

        return {
          attendee_id: String(row.dataset.attendeeId || ""),
          tidc_card_no: card,
          entry_time: entry,
          exit_time: exit,
          card_exchange_time: exchange,
          card_return_time: returned
        };
      })
      .filter((row) =>
        row.attendee_id && (
          row.tidc_card_no ||
          row.entry_time ||
          row.exit_time ||
          row.card_exchange_time ||
          row.card_return_time
        )
      );
  }

  async function getRequestId(supabase) {
    const code = q(".detail-header .eyebrow", content)?.textContent?.trim();
    if (!code) throw new Error("ไม่พบเลข Request");

    const result = await supabase
      .from("access_requests")
      .select("id")
      .eq("request_code", code)
      .single();

    if (result.error) throw result.error;
    if (!result.data?.id) throw new Error("ไม่พบ Request ในระบบ");
    return result.data.id;
  }

  function applySavedRows(savedRows) {
    const byAttendee = new Map(
      (savedRows || []).map((row) => [String(row.attendee_id), row])
    );

    qa("tr[data-attendee-id]", content).forEach((row) => {
      const saved = byAttendee.get(String(row.dataset.attendeeId));
      if (!saved) return;

      const fields = [
        [".tidc-card", saved.tidc_card_no],
        [".entry-time", saved.entry_time],
        [".exit-time", saved.exit_time],
        [".card-exchange", saved.card_exchange_time],
        [".card-return", saved.card_return_time]
      ];

      fields.forEach(([selector, raw]) => {
        const input = q(selector, row);
        if (!input) return;
        const formatted = selector === ".tidc-card"
          ? (raw || "")
          : window.AccessApp.formatTime(raw);
        input.value = formatted || "";
      });
    });
  }

  async function saveNow(button) {
    if (saving) return;

    const selectedDate = dateFilter.value;
    if (!selectedDate) throw new Error("กรุณาเลือกวันที่ก่อนบันทึก");
    if (window.AccessApp.demoMode) throw new Error("Demo mode ยังไม่รองรับข้อมูลรายวัน");

    const rows = collectRows();
    if (!rows.length) throw new Error("ยังไม่มีข้อมูลเวลาหรือ Card No. ที่ต้องบันทึก");

    saving = true;
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "กำลังบันทึก...";

    try {
      const supabase = await getClient();
      const requestId = await getRequestId(supabase);
      const payload = rows.map((row) => ({
        request_id: requestId,
        record_date: selectedDate,
        ...row
      }));

      const result = await supabase
        .from("attendee_daily_records")
        .upsert(payload, { onConflict: "attendee_id,record_date" })
        .select("attendee_id,record_date,tidc_card_no,entry_time,exit_time,card_exchange_time,card_return_time");

      if (result.error) throw result.error;
      if (!result.data || result.data.length !== payload.length) {
        throw new Error("บันทึกไม่ครบ กรุณาลองใหม่อีกครั้ง");
      }

      applySavedRows(result.data);

      // Sync security.js dailyRecords cache immediately after save.
      dateFilter.dispatchEvent(new Event("change", { bubbles: true }));

      alert(`บันทึกข้อมูลรายวันเรียบร้อย ${result.data.length} คน`);
    } finally {
      saving = false;
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  detail.addEventListener("click", (event) => {
    const button = event.target.closest("#save-v2");
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    saveNow(button).catch((error) => {
      alert(error.message || "ไม่สามารถบันทึกข้อมูลได้");
    });
  }, true);

  const observer = new MutationObserver(prepareSaveButton);
  observer.observe(content, { childList: true, subtree: true });
  prepareSaveButton();
})();
