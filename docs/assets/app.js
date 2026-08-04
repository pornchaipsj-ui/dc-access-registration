(() => {
  "use strict";

  const {
    config,
    demoMode,
    getClient,
    saveDemoRequest,
    escapeHtml,
    loadScript,
    attendeeTypeLabel,
    todayDateString
  } = window.AccessApp;

  const form = document.querySelector("#access-form");
  const fileInput = document.querySelector("#staff-file");
  const uploadZone = document.querySelector("#upload-zone");
  const fileStatus = document.querySelector("#file-status");
  const fileErrors = document.querySelector("#file-errors");
  const previewSection = document.querySelector("#preview-section");
  const previewBody = document.querySelector("#preview-body");
  const sourceFileName = document.querySelector("#source-file-name");
  const submitButton = document.querySelector("#submit-button");
  const resultBox = document.querySelector("#submission-result");
  const modeBanner = document.querySelector("#mode-banner");
  const attendeeCount = document.querySelector("#attendee-count");
  const visitDateInput = document.querySelector("#visit-date");
  const visitEndDateInput = document.querySelector("#visit-end-date");
  const maxAttendees = Number(config.MAX_ATTENDEES || 25);
  const maxFileSize = Number(config.MAX_FILE_SIZE_MB || 5) * 1024 * 1024;

  const expectedHeaders = [
    "COMPANY",
    "ATTENDEE TYPE",
    "NAME",
    "MOBILE",
    "EMAIL",
    "CARD TYPE",
    "ID",
    "CAR LICENSE"
  ];
  const allowedAttendeeTypes = new Set(["STAFF", "STAFF-EMERGENCY", "STAFF-TECHNICIAN", "VENDOR", "VISITOR"]);
  const allowedCardTypes = new Set(["ID", "PASSPORT"]);

  let parsedAttendees = [];
  let selectedFileName = "";

  async function ensureExcelJS() {
    if (window.ExcelJS) return;
    await loadScript("https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js");
    if (!window.ExcelJS) throw new Error("โหลดตัวอ่านไฟล์ Excel ไม่สำเร็จ กรุณาตรวจสอบ Internet");
  }

  function normalizeHeader(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toUpperCase();
  }

  function cellText(cell) {
    if (!cell || cell.value === null || cell.value === undefined) return "";
    if (typeof cell.value === "object") {
      if (cell.value.text !== undefined) return String(cell.value.text).trim();
      if (cell.value.result !== undefined && cell.value.result !== null) return String(cell.value.result).trim();
      if (cell.value.richText) return cell.value.richText.map((part) => part.text || "").join("").trim();
    }
    const text = String(cell.text || cell.value).trim();
    return text === "[object Object]" ? "" : text;
  }

  function identityInfo(value) {
  const raw = String(value || "")
    .replace(/[\s-]/g, "")
    .toUpperCase();

  if (!raw) {
    return {
      last4: null,
      masked: null
    };
  }

  let last4 = "";

  if (/[X*]/.test(raw)) {
    const visibleGroups = raw
      .split(/[X*]+/)
      .filter(Boolean);

    const candidates = visibleGroups
      .map((group) => group.replace(/[^A-Z0-9]/g, ""))
      .filter((group) => group.length >= 4);

    if (candidates.length) {
      last4 = candidates
        .sort((a, b) => b.length - a.length)[0]
        .slice(-4);
    }
  }

  if (!last4) {
    last4 = raw
      .replace(/[^A-Z0-9]/g, "")
      .slice(-4);
  }

  if (!/^[A-Z0-9]{4}$/.test(last4)) {
    throw new Error(
      "ID / Passport ถ้าระบุ ต้องมีข้อมูลอย่างน้อย 4 ตัว"
    );
  }

  return {
    last4,
    masked: `XXXX${last4}`
  };
}

  function clearFileState() {
    parsedAttendees = [];
    selectedFileName = "";
    previewBody.innerHTML = "";
    previewSection.hidden = true;
    fileStatus.hidden = true;
    fileErrors.hidden = true;
    fileErrors.innerHTML = "";
    attendeeCount.textContent = `0/${maxAttendees}`;
    uploadZone.classList.remove("upload-zone--success", "upload-zone--error");
  }

  function showErrors(errors) {
    uploadZone.classList.add("upload-zone--error");
    fileErrors.hidden = false;
    fileErrors.innerHTML = `<strong>ไม่สามารถใช้ไฟล์นี้ได้</strong><ul>${errors.slice(0, 12).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>${errors.length > 12 ? `<p>และอีก ${errors.length - 12} รายการ</p>` : ""}`;
  }

  function renderPreview() {
    attendeeCount.textContent = `${parsedAttendees.length}/${maxAttendees}`;
    sourceFileName.textContent = selectedFileName;
    previewBody.innerHTML = parsedAttendees.map((person, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(person.name)}</strong></td>
        <td>${escapeHtml(attendeeTypeLabel(person.attendee_type))}</td>
        <td>${escapeHtml(person.company)}</td>
<td>${escapeHtml(person.mobile || "-")}</td>
<td>${escapeHtml(person.email || "-")}</td>
<td>
  ${
    person.identity_last4
      ? `${escapeHtml(person.card_type || "-")} / ${escapeHtml(person.identity_last4)}`
      : "-"
  }
</td>
<td>${escapeHtml(person.car_license || "N/A")}</td>
      </tr>`).join("");
    previewSection.hidden = false;
    fileStatus.hidden = false;
    fileStatus.className = "file-status file-status--success";
    fileStatus.innerHTML = `<strong>อ่านไฟล์สำเร็จ</strong> พบ ${parsedAttendees.length} รายชื่อจากชีต Data`;
    uploadZone.classList.add("upload-zone--success");
  }

  function validateRow(values, excelRow) {
    const [company, attendeeTypeRaw, name, mobileRaw, emailRaw, cardTypeRaw, identityRaw, carLicenseRaw] = values;
    const attendeeType = attendeeTypeRaw.toUpperCase();
    const cardType = cardTypeRaw.toUpperCase();
    const mobile = mobileRaw.replace(/\.0$/, "").trim();
    const email = emailRaw.toLowerCase();
    const errors = [];

    if (!company) errors.push("COMPANY ว่าง");
    if (!allowedAttendeeTypes.has(attendeeType)) errors.push(`ATTENDEE TYPE ไม่ถูกต้อง (${attendeeTypeRaw || "ว่าง"})`);
    if (!name) errors.push("NAME ว่าง");
    // MOBILE และ EMAIL ไม่บังคับรูปแบบ และสามารถเว้นว่างได้

    // MOBILE, EMAIL, CARD TYPE และ ID สามารถเว้นว่างได้
if (cardType && !allowedCardTypes.has(cardType)) {
  errors.push(
    `CARD TYPE ต้องเป็น ID หรือ PASSPORT (${cardTypeRaw})`
  );
}

let identity = {
  last4: null,
  masked: null
};

try {
  identity = identityInfo(identityRaw);
} catch (error) {
  errors.push(error.message);
}

    if (errors.length) {
      return { errors: errors.map((message) => `แถว ${excelRow}: ${message}`) };
    }

    return {
      attendee: {
  company: company.slice(0, 120),
  attendee_type: attendeeType,
  name: name.slice(0, 160),
  mobile: mobile.slice(0, 100),
  email: email.slice(0, 200),
  card_type: cardType || null,
  identity_last4: identity.last4,
  identity_masked: identity.masked,
  car_license: (carLicenseRaw || "").slice(0, 50)
},
      errors: []
    };
  }

  async function parseStaffTemplate(file) {
    clearFileState();
    if (!file) return;
    selectedFileName = file.name;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      showErrors(["รองรับเฉพาะไฟล์ .xlsx"]);
      return;
    }
    if (file.size > maxFileSize) {
      showErrors([`ไฟล์มีขนาดเกิน ${config.MAX_FILE_SIZE_MB || 5} MB`]);
      return;
    }

    fileStatus.hidden = false;
    fileStatus.className = "file-status";
    fileStatus.textContent = "กำลังอ่านไฟล์…";

    try {
      await ensureExcelJS();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.getWorksheet("Data");
      if (!worksheet) throw new Error("ไม่พบชีตชื่อ Data");

      const actualHeaders = expectedHeaders.map((_, index) => normalizeHeader(cellText(worksheet.getRow(1).getCell(index + 1))));
      const headerErrors = expectedHeaders.flatMap((expected, index) => actualHeaders[index] === expected ? [] : [`คอลัมน์ ${index + 1} ต้องเป็น “${expected}” แต่พบ “${actualHeaders[index] || "ว่าง"}”`]);
      if (headerErrors.length) {
        showErrors(headerErrors);
        fileStatus.hidden = true;
        return;
      }

      const attendees = [];
      const errors = [];
      const lastRow = Math.max(worksheet.actualRowCount || 1, 1);
      for (let rowNumber = 2; rowNumber <= lastRow; rowNumber += 1) {
        const row = worksheet.getRow(rowNumber);
        const values = expectedHeaders.map((_, index) => cellText(row.getCell(index + 1)));
        if (values.every((value) => !value)) continue;
        const result = validateRow(values, rowNumber);
        errors.push(...result.errors);
        if (result.attendee) attendees.push({ ...result.attendee, line_no: attendees.length + 1 });
      }

      if (!attendees.length && !errors.length) errors.push("ไม่พบรายชื่อในชีต Data กรุณากรอกข้อมูลตั้งแต่แถว 2");
      if (attendees.length > maxAttendees) errors.push(`พบ ${attendees.length} รายชื่อ แต่ FR-037 รองรับสูงสุด ${maxAttendees} รายชื่อ`);
      if (errors.length) {
        showErrors(errors);
        fileStatus.hidden = true;
        return;
      }

      parsedAttendees = attendees;
      renderPreview();
    } catch (error) {
      fileStatus.hidden = true;
      showErrors([error.message || "อ่านไฟล์ Excel ไม่สำเร็จ"]);
    }
  }

  function collectRequest() {
  const value = (selector) =>
    document.querySelector(selector).value.trim();

  const visitDate = value("#visit-date");
  const visitEndDate = value("#visit-end-date");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
    throw new Error("กรุณาระบุวันที่เริ่มงาน");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitEndDate)) {
    throw new Error("กรุณาระบุวันที่สิ้นสุดงาน");
  }

  const start = new Date(`${visitDate}T00:00:00`);
  const end = new Date(`${visitEndDate}T00:00:00`);

  const totalDays =
    Math.floor(
      (end.getTime() - start.getTime()) /
      86400000
    ) + 1;

  if (totalDays < 1) {
    throw new Error(
      "วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มงาน"
    );
  }

  if (totalDays > 7) {
    throw new Error(
      "ระยะเวลาทำงานต้องไม่เกิน 7 วัน"
    );
  }

  return {
    location: value("#location"),
    visit_date: visitDate,
    visit_end_date: visitEndDate,
    project_name: value("#project-name"),
    objective: value("#objective"),
    room: value("#room"),
    host_name: value("#host-name") || null,
    host_phone: value("#host-phone") || null,
    notes: value("#notes") || null,
    source_file_name: selectedFileName.slice(0, 255)
  };
}

  async function submitRequest(request, attendees) {
    if (demoMode) return saveDemoRequest(request, attendees);
    const client = await getClient();
    const { data, error } = await client.rpc("submit_access_request", {
      p_request: request,
      p_attendees: attendees
    });
    if (error) throw error;
    return {
      id: data.id,
      request_code: data.request_code,
      status: data.status || "pending"
    };
  }

  function showResult(record) {
    resultBox.hidden = false;
    resultBox.innerHTML = `
      <div class="result-card">
        <div class="result-card__icon">✓</div>
        <div>
          <h2>ส่ง StaffTemplate เรียบร้อย</h2>
          <p>เลขที่คำขอ: <strong>${escapeHtml(record.request_code)}</strong></p>
          <p>สถานะเริ่มต้น: <span class="status status--pending">รอตรวจสอบ</span></p>
          <p>รปภ. สามารถบันทึก Card no. TIDC และเวลาเข้า–ออกจริงในหน้า Security Dashboard</p>
          ${demoMode ? "<p class=\"notice\">โหมดทดลอง: ข้อมูลอยู่เฉพาะในเบราว์เซอร์เครื่องนี้</p>" : ""}
        </div>
      </div>`;
    resultBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  fileInput.addEventListener("change", () => parseStaffTemplate(fileInput.files?.[0]));

  ["dragenter", "dragover"].forEach((eventName) => {
    uploadZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      uploadZone.classList.add("upload-zone--drag");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    uploadZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      uploadZone.classList.remove("upload-zone--drag");
    });
  });
  uploadZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    parseStaffTemplate(file);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    resultBox.hidden = true;
    if (!form.reportValidity()) return;
    if (!parsedAttendees.length) {
      window.alert("กรุณาอัปโหลด StaffTemplate ที่ตรวจสอบผ่านแล้ว");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "กำลังส่งข้อมูล…";
    try {
      const request = collectRequest();
      const result = await submitRequest(request, parsedAttendees);
      showResult(result);
      form.reset();
      clearFileState();
      visitDateInput.value = todayDateString();
      visitEndDateInput.value = todayDateString();
updateVisitEndDateLimit();
    } catch (error) {
      window.alert(error.message || "ไม่สามารถส่งข้อมูลได้ กรุณาลองใหม่");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "ส่ง StaffTemplate";
    }
  });

  visitDateInput.min = todayDateString();
visitDateInput.value = todayDateString();

visitEndDateInput.min = todayDateString();
visitEndDateInput.value = todayDateString();

function updateVisitEndDateLimit() {
  if (!visitDateInput.value) return;

  const startDate = new Date(
    `${visitDateInput.value}T00:00:00`
  );

  const maximumEndDate = new Date(startDate);

  // วันเริ่มนับเป็นวันที่ 1 จึงบวกได้อีก 6 วัน
  maximumEndDate.setDate(
    maximumEndDate.getDate() + 6
  );

  const maxDate = [
    maximumEndDate.getFullYear(),
    String(
      maximumEndDate.getMonth() + 1
    ).padStart(2, "0"),
    String(
      maximumEndDate.getDate()
    ).padStart(2, "0")
  ].join("-");

  visitEndDateInput.min =
    visitDateInput.value;

  visitEndDateInput.max = maxDate;

  if (
    !visitEndDateInput.value ||
    visitEndDateInput.value <
      visitDateInput.value ||
    visitEndDateInput.value > maxDate
  ) {
    visitEndDateInput.value =
      visitDateInput.value;
  }
}

visitDateInput.addEventListener(
  "change",
  updateVisitEndDateLimit
);

updateVisitEndDateLimit();

  if (demoMode) {
    modeBanner.hidden = false;
    modeBanner.innerHTML = "<strong>Demo mode:</strong> ข้อมูลถูกเก็บเฉพาะบนอุปกรณ์นี้ กรุณาตั้งค่า Supabase ก่อนใช้งานจริง";
  }
})();
