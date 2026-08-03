(() => {
  "use strict";

  const { attendeeTypeLabel, formatDate, formatTime, escapeHtml, loadScript } = window.AccessApp;

  async function ensureExcelJS() {
    if (window.ExcelJS) return;
    await loadScript("https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js");
    if (!window.ExcelJS) throw new Error("โหลด ExcelJS ไม่สำเร็จ");
  }

  async function loadTemplate(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`โหลดไฟล์ต้นแบบไม่สำเร็จ (${response.status})`);
    return response.arrayBuffer();
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function safeFilename(value) {
    return String(value || "file").replace(/[^a-zA-Z0-9ก-๙._-]+/g, "_");
  }

  function setTextCell(cell, value) {
    cell.value = value ?? "";
    cell.numFmt = "@";
  }

  function orderedAttendees(request) {
    return [...(request.attendees || [])].sort((a, b) => Number(a.line_no || 999) - Number(b.line_no || 999));
  }

  async function exportFR037(request) {
    await ensureExcelJS();
    const source = await loadTemplate("./templates/FR-037-template.xlsx");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(source);
    const worksheet = workbook.getWorksheet("แบบฟอร์มลงทะเบียนเข้า-ออก");
    if (!worksheet) throw new Error("ไม่พบชีต FR-037 ในไฟล์ต้นแบบ");

    const locations = ["TT1", "TT2", "MTG", "BNA", "RYG"];
    worksheet.getCell("C3").value = locations
      .map((location) => `${request.location === location ? "☒" : "☐"} ${location}`)
      .join("          ");

    const attendees = orderedAttendees(request);
    for (let index = 0; index < 25; index += 1) {
      const rowNumber = 6 + index;
      const attendee = attendees[index];
      worksheet.getCell(rowNumber, 1).value = index + 1;
      for (let col = 2; col <= 13; col += 1) worksheet.getCell(rowNumber, col).value = null;
      if (!attendee) continue;
      setTextCell(worksheet.getCell(rowNumber, 2), request.project_name);
      setTextCell(worksheet.getCell(rowNumber, 3), attendee.name);
      setTextCell(worksheet.getCell(rowNumber, 4), attendee.identity_last4);
      setTextCell(worksheet.getCell(rowNumber, 5), attendee.mobile);
      setTextCell(worksheet.getCell(rowNumber, 6), attendee.email);
      setTextCell(worksheet.getCell(rowNumber, 7), attendeeTypeLabel(attendee.attendee_type));
      setTextCell(worksheet.getCell(rowNumber, 8), attendee.company);
      setTextCell(worksheet.getCell(rowNumber, 9), attendee.tidc_card_no || "");
      setTextCell(worksheet.getCell(rowNumber, 10), request.objective);
      setTextCell(worksheet.getCell(rowNumber, 11), request.room);
      setTextCell(worksheet.getCell(rowNumber, 12), formatTime(attendee.entry_time));
      setTextCell(worksheet.getCell(rowNumber, 13), formatTime(attendee.exit_time));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      safeFilename(`FR-037_${request.location}_${request.visit_date}_${request.request_code}.xlsx`)
    );
  }

  function printFR037(request) {
    const attendees = orderedAttendees(request);
    const rows = Array.from({ length: 25 }, (_, index) => {
      const person = attendees[index];
      return `<tr>
        <td>${index + 1}</td>
        <td>${person ? escapeHtml(request.project_name) : ""}</td>
        <td>${person ? escapeHtml(person.name) : ""}</td>
        <td>${person ? escapeHtml(person.identity_last4) : ""}</td>
        <td>${person ? escapeHtml(person.mobile) : ""}</td>
        <td>${person ? escapeHtml(person.email) : ""}</td>
        <td>${person ? escapeHtml(attendeeTypeLabel(person.attendee_type)) : ""}</td>
        <td>${person ? escapeHtml(person.company) : ""}</td>
        <td>${person ? escapeHtml(person.tidc_card_no || "") : ""}</td>
        <td>${person ? escapeHtml(request.objective) : ""}</td>
        <td>${person ? escapeHtml(request.room) : ""}</td>
        <td>${person ? escapeHtml(formatTime(person.entry_time)) : ""}</td>
        <td>${person ? escapeHtml(formatTime(person.exit_time)) : ""}</td>
      </tr>`;
    }).join("");

    const popup = window.open("", "_blank");
    if (!popup) throw new Error("เบราว์เซอร์บล็อกหน้าต่างพิมพ์");
    popup.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>FR-037 ${escapeHtml(request.request_code)}</title>
      <style>
        @page{size:A4 landscape;margin:8mm}body{font-family:Arial,"Noto Sans Thai",sans-serif;margin:0;color:#111}h1{text-align:center;font-size:20px;margin:0 0 9px}.meta{display:flex;justify-content:space-between;font-size:11px;margin-bottom:7px}.locations{font-weight:700}.locations span{margin-right:15px}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8px}th,td{border:1px solid #222;padding:3px 2px;text-align:center;word-break:break-word;height:18px}th{background:#f7e4d5;font-size:8px}th:nth-child(1){width:3%}th:nth-child(2){width:8%}th:nth-child(3){width:18%}th:nth-child(4){width:8%}th:nth-child(5){width:8%}th:nth-child(6){width:15%}th:nth-child(7){width:7%}th:nth-child(8){width:8%}th:nth-child(9){width:7%}th:nth-child(10){width:8%}th:nth-child(11){width:5%}th:nth-child(12),th:nth-child(13){width:5%}.note{font-size:10px;margin-top:5px}
      </style></head><body>
      <h1>แบบฟอร์มลงทะเบียนเข้า-ออก ภายในศูนย์คอมพิวเตอร์</h1>
      <div class="meta"><div class="locations">Location: ${["TT1","TT2","MTG","BNA","RYG"].map((location) => `<span>${location === request.location ? "☒" : "☐"} ${location}</span>`).join("")}</div><div>วันที่ตามแผน ${escapeHtml(formatDate(request.visit_date))}</div></div>
      <table><thead><tr><th>No.</th><th>Project Name</th><th>Name</th><th>ID Card<br>Last 4</th><th>Mobile No</th><th>Email</th><th>Type</th><th>Company Name</th><th>Card no. TIDC</th><th>Objective</th><th>Room</th><th>Date In</th><th>Date Out</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="note">* กรุณา คัดลายมือตัวบรรจงและกรอกข้อมูลให้ครบทุกช่อง ขอบคุณครับ/ค่ะ *</div>
      <script>window.onload=()=>{window.print();}</script></body></html>`);
    popup.document.close();
  }

  window.AccessExports = { exportFR037, printFR037 };
})();
