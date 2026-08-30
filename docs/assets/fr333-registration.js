(() => {
  "use strict";

  const EXPECTED = [
    "COMPANY",
    "ATTENDEE TYPE",
    "NAME",
    "MOBILE",
    "EMAIL",
    "CARD TYPE",
    "ID",
    "CAR LICENSE"
  ];

  const input = document.querySelector("#staff-file");
  if (!input || !window.AccessApp) return;

  let bypassNextChange = false;

  async function ensureExcelJS() {
    if (window.ExcelJS) return;
    await window.AccessApp.loadScript("https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js");
    if (!window.ExcelJS) throw new Error("โหลดตัวอ่านไฟล์ Excel ไม่สำเร็จ");
  }

  function text(cell) {
    if (!cell || cell.value == null) return "";
    if (typeof cell.value === "object") {
      if (cell.value.text != null) return String(cell.value.text).trim();
      if (cell.value.result != null) return String(cell.value.result).trim();
      if (cell.value.richText) return cell.value.richText.map(p => p.text || "").join("").trim();
    }
    return String(cell.text || cell.value || "").trim();
  }

  function norm(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toUpperCase();
  }

  function findHeaderRow(ws) {
    const max = Math.min(Math.max(ws.actualRowCount || 1, 1), 50);
    for (let r = 1; r <= max; r += 1) {
      const values = [];
      for (let c = 1; c <= 12; c += 1) values.push(norm(text(ws.getRow(r).getCell(c))));
      const start = values.indexOf("NO.");
      if (start < 0) continue;
      const ten = values.slice(start, start + 10);
      if (
        ten[1] === "COMPANY" &&
        ten[2] === "ATTENDEE TYPE" &&
        ten[3] === "NAME" &&
        ten[4] === "MOBILE" &&
        ten[5] === "EMAIL" &&
        ten[6] === "CARD TYPE" &&
        ten[7] === "ID" &&
        ten[8] === "CAR LICENSE"
      ) return { row: r, startCol: start + 1 };
    }
    return null;
  }

  async function convertFR333ToLegacyData(file) {
    await ensureExcelJS();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());

    // Old StaffTemplate remains supported silently for compatibility.
    if (wb.getWorksheet("Data")) return null;

    const ws = wb.getWorksheet("FR-333-v02") || wb.worksheets.find(s => /^FR-333/i.test(s.name));
    if (!ws) throw new Error("ไม่พบชีต FR-333-v02 ในไฟล์ที่อัปโหลด");

    const header = findHeaderRow(ws);
    if (!header) throw new Error("ไม่พบหัวตาราง FR-333 (NO., COMPANY, ATTENDEE TYPE, NAME ...)");

    const rows = [];
    const maxRow = Math.max(ws.actualRowCount || header.row, header.row);
    for (let r = header.row + 1; r <= maxRow; r += 1) {
      const source = ws.getRow(r);
      const values = [];
      // FR-333 columns: NO. + 8 columns used by system + ROLE.
      for (let offset = 1; offset <= 8; offset += 1) {
        values.push(text(source.getCell(header.startCol + offset)));
      }
      if (values.every(v => !v)) continue;
      rows.push(values);
    }

    if (!rows.length) throw new Error("ไม่พบรายชื่อใน FR-333 กรุณากรอกข้อมูลใต้หัวตาราง");

    const data = wb.addWorksheet("Data");
    data.addRow(EXPECTED);
    rows.forEach(row => data.addRow(row));
    data.state = "veryHidden";

    const buffer = await wb.xlsx.writeBuffer();
    return new File([buffer], file.name, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      lastModified: Date.now()
    });
  }

  input.addEventListener("change", async (event) => {
    if (bypassNextChange) {
      bypassNextChange = false;
      return;
    }

    const file = input.files?.[0];
    if (!file) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      const converted = await convertFR333ToLegacyData(file);
      if (converted) {
        const dt = new DataTransfer();
        dt.items.add(converted);
        input.files = dt.files;
      }
      bypassNextChange = true;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (error) {
      alert(error.message || "ไม่สามารถอ่าน FR-333 ได้");
      input.value = "";
    }
  }, true);

  function downloadBlankFR333(event) {
    event?.preventDefault();
    if (!window.FR333Export?.download) {
      alert("ไม่สามารถสร้าง FR-333 ได้ กรุณารีเฟรชหน้าแล้วลองอีกครั้ง");
      return;
    }
    window.FR333Export.download({
      request_code: "Blank",
      project_name: "",
      location: "",
      room: "",
      attendees: []
    }).catch(error => alert(error.message || "ไม่สามารถดาวน์โหลด FR-333 ได้"));
  }

  function updatePageText() {
    document.title = "FR-333 Access Registration";
    document.querySelectorAll("body *").forEach(el => {
      if (el.children.length) return;
      if (typeof el.textContent !== "string") return;
      if (el.textContent.includes("StaffTemplate")) {
        el.textContent = el.textContent.replaceAll("StaffTemplate.xlsx", "FR-333-v02.xlsx").replaceAll("StaffTemplate", "FR-333");
      }
    });

    const link = document.querySelector(".upload-help a");
    if (link && !link.dataset.fr333Ready) {
      link.dataset.fr333Ready = "1";
      link.href = "#";
      link.removeAttribute("download");
      link.textContent = "Download Blank FR-333 / ดาวน์โหลด FR-333 เปล่า";
      link.addEventListener("click", downloadBlankFR333);
    }
  }

  updatePageText();
  const observer = new MutationObserver(updatePageText);
  observer.observe(document.body, { childList: true, subtree: true });
})();
