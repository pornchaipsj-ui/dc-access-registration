(() => {
  "use strict";

  let excelLoader = null;

  function loadExcelJS() {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    if (excelLoader) return excelLoader;

    excelLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
      script.onload = () => resolve(window.ExcelJS);
      script.onerror = () => reject(new Error("ไม่สามารถโหลด Excel library ได้"));
      document.head.appendChild(script);
    });

    return excelLoader;
  }

  function safe(value) {
    return value == null ? "" : String(value);
  }

  function attendeeTypeLabel(type) {
    if (window.AccessApp?.attendeeTypeLabel) {
      return window.AccessApp.attendeeTypeLabel(type);
    }
    return safe(type);
  }

  function fileNamePart(value) {
    return safe(value).replace(/[\\/:*?"<>|]+/g, "-").trim();
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function download(request) {
    if (!request) throw new Error("ไม่พบข้อมูล Request");

    const ExcelJS = await loadExcelJS();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "DC Access Registration";
    workbook.created = new Date();

    const history = workbook.addWorksheet("Related + History");
    history.columns = [
      { width: 18 },
      { width: 24 },
      { width: 24 },
      { width: 24 }
    ];
    history.addRows([
      ["Document", "FR-333-v02"],
      ["Request", safe(request.request_code)],
      ["Project", safe(request.project_name)],
      ["Location", safe(request.location)],
      ["Room", safe(request.room)],
      ["Generated", new Date()]
    ]);
    history.getColumn(2).alignment = { wrapText: true };
    history.getCell("B6").numFmt = "yyyy-mm-dd hh:mm";

    const ws = workbook.addWorksheet("FR-333-v02", {
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 }
      }
    });

    ws.mergeCells("A1:J1");
    const title = ws.getCell("A1");
    title.value = "แจ้งรายชื่อเข้าปฏิบัติงาน (Notification of Assigned Personnel)";
    title.font = { name: "Arial", size: 22, bold: true };
    title.alignment = { horizontal: "left", vertical: "middle" };
    ws.getRow(1).height = 34;

    const headers = [
      "NO.",
      "COMPANY",
      "ATTENDEE TYPE",
      "NAME",
      "MOBILE",
      "EMAIL",
      "CARD TYPE",
      "ID",
      "CAR LICENSE",
      "ROLE"
    ];

    ws.getRow(2).values = headers;
    ws.getRow(2).height = 24;

    const widths = [7, 18, 18, 24, 16, 28, 14, 14, 18, 18];
    widths.forEach((width, index) => {
      ws.getColumn(index + 1).width = width;
    });

    const border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } }
    };

    ws.getRow(2).eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: false };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = border;
    });

    const attendees = request.attendees || [];
    const minimumRows = Math.max(31, attendees.length);

    for (let i = 0; i < minimumRows; i++) {
      const rowNumber = i + 3;
      const row = ws.getRow(rowNumber);
      const person = attendees[i];

      row.values = person
        ? [
            i + 1,
            safe(person.company),
            attendeeTypeLabel(person.attendee_type),
            safe(person.name),
            safe(person.mobile),
            safe(person.email),
            safe(person.card_type),
            safe(person.identity_masked || person.identity_last4),
            safe(person.car_license),
            safe(person.role || person.position)
          ]
        : ["", "", "", "", "", "", "", "", "", ""];

      row.height = 26;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: "Arial", size: 10 };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = border;
      });
    }

    ws.views = [{ state: "frozen", ySplit: 2 }];
    ws.printArea = `A1:J${minimumRows + 2}`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    const filename = `FR-333-v02_${fileNamePart(request.request_code || "Request")}.xlsx`;
    triggerDownload(blob, filename);
  }

  window.FR333Export = { download };
})();
