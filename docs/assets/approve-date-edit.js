(() => {
  "use strict";

  const q = (selector, root = document) => root.querySelector(selector);
  const content = q("#detail-content");
  if (!content || !window.AccessApp) return;

  let client = null;
  let saving = false;

  async function getClient() {
    if (!client) client = await window.AccessApp.getClient();
    return client;
  }

  function diffDaysInclusive(start, end) {
    const a = new Date(`${start}T12:00:00`);
    const b = new Date(`${end}T12:00:00`);
    return Math.floor((b - a) / 86400000) + 1;
  }

  function currentRequestCode() {
    return q(".detail-header .eyebrow", content)?.textContent?.trim() || "";
  }

  async function loadRequestDates(code) {
    const supabase = await getClient();
    const result = await supabase
      .from("access_requests")
      .select("id,visit_date,visit_end_date")
      .eq("request_code", code)
      .single();

    if (result.error) throw result.error;
    return result.data;
  }

  function ensureEditor() {
    if (q("#approve-date-editor", content)) return;

    const code = currentRequestCode();
    const meta = q(".detail-meta", content);
    if (!code || !meta) return;

    const workDateBox = [...meta.children].find((el) =>
      q("span", el)?.textContent?.trim() === "Work Date"
    );
    if (!workDateBox) return;

    const editor = document.createElement("div");
    editor.id = "approve-date-editor";
    editor.className = "approve-date-editor";
    editor.innerHTML = `
      <span>แก้ไขวันทำงาน</span>
      <div class="approve-date-fields">
        <label>
          <small>Start Date</small>
          <input id="approve-start-date" type="date" class="table-input">
        </label>
        <label>
          <small>End Date</small>
          <input id="approve-end-date" type="date" class="table-input">
        </label>
        <button id="save-work-date" class="button button--secondary" type="button">บันทึกวันที่</button>
      </div>
      <small>ผู้อนุมัติสามารถปรับช่วงวันทำงานได้ สูงสุด 7 วันต่อ Request</small>
    `;

    workDateBox.replaceWith(editor);

    loadRequestDates(code)
      .then((request) => {
        q("#approve-start-date", editor).value = request.visit_date || "";
        q("#approve-end-date", editor).value = request.visit_end_date || request.visit_date || "";
      })
      .catch((error) => {
        console.error("Unable to load request dates", error);
      });
  }

  async function saveDates(button) {
    if (saving) return;

    const code = currentRequestCode();
    const start = q("#approve-start-date", content)?.value;
    const end = q("#approve-end-date", content)?.value || start;

    if (!code) throw new Error("ไม่พบเลข Request");
    if (!start || !end) throw new Error("กรุณาระบุวันที่เริ่มและวันที่สิ้นสุด");
    if (end < start) throw new Error("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม");

    const totalDays = diffDaysInclusive(start, end);
    if (totalDays > 7) throw new Error("ช่วงวันทำงานต้องไม่เกิน 7 วัน");

    saving = true;
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "กำลังบันทึก...";

    try {
      const supabase = await getClient();
      const result = await supabase
        .from("access_requests")
        .update({
          visit_date: start,
          visit_end_date: end
        })
        .eq("request_code", code)
        .select("request_code,visit_date,visit_end_date")
        .single();

      if (result.error) throw result.error;

      alert("บันทึกวันทำงานเรียบร้อย");

      const refresh = q("#refresh-button");
      if (refresh) refresh.click();
    } finally {
      saving = false;
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  content.addEventListener("click", (event) => {
    const button = event.target.closest("#save-work-date");
    if (!button) return;
    saveDates(button).catch((error) => {
      alert(error.message || "ไม่สามารถบันทึกวันทำงานได้");
    });
  });

  const observer = new MutationObserver(() => {
    setTimeout(ensureEditor, 0);
  });
  observer.observe(content, { childList: true, subtree: true });

  const style = document.createElement("style");
  style.textContent = `
    .approve-date-editor {
      display: grid;
      gap: 8px;
    }
    .approve-date-editor > span {
      color: #667085;
      font-size: 12px;
      text-transform: uppercase;
    }
    .approve-date-fields {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 8px;
      align-items: end;
    }
    .approve-date-fields label {
      display: grid;
      gap: 4px;
      margin: 0;
    }
    .approve-date-fields small {
      color: #667085;
    }
    @media (max-width: 720px) {
      .approve-date-fields {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
})();
