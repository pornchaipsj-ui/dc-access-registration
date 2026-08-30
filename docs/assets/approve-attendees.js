(() => {
  "use strict";

  const content = document.querySelector("#detail-content");
  if (!content || !window.AccessApp) return;

  let client = null;
  let timer = null;

  async function getClient() {
    if (!client) client = await window.AccessApp.getClient();
    return client;
  }

  function q(selector, root = document) {
    return root.querySelector(selector);
  }

  function qa(selector, root = document) {
    return [...root.querySelectorAll(selector)];
  }

  function esc(value) {
    return window.AccessApp.escapeHtml(value);
  }

  async function currentRequest() {
    const code = q(".detail-header .eyebrow", content)?.textContent?.trim();
    if (!code) throw new Error("ไม่พบเลข Request");

    const supabase = await getClient();
    const result = await supabase
      .from("access_requests")
      .select("id,request_code,status")
      .eq("request_code", code)
      .single();

    if (result.error) throw result.error;
    return result.data;
  }

  function findPeopleTable() {
    return qa("table", content).find((table) => {
      const text = table.querySelector("thead")?.textContent || "";
      return /Card Type/i.test(text) && /ID\s*\/\s*Passport/i.test(text);
    });
  }

  async function enhance() {
    const table = findPeopleTable();
    if (!table || table.dataset.attendeeEditReady === "1") return;
    table.dataset.attendeeEditReady = "1";

    const request = await currentRequest().catch(() => null);
    const canChangePeople = request?.status === "pending";

    const headRow = q("thead tr", table);
    if (headRow && !q(".attendee-action-head", headRow)) {
      headRow.insertAdjacentHTML("beforeend", '<th class="attendee-action-head">Action</th>');
    }

    qa("tbody tr[data-attendee-id]", table).forEach((row) => {
      const cells = row.children;
      if (cells.length < 9) return;

      const carCell = cells[8];
      if (!q(".edit-car-license", carCell)) {
        const current = carCell.textContent.trim() === "-" ? "" : carCell.textContent.trim();
        carCell.innerHTML = `<input class="table-input edit-car-license" maxlength="50" value="${esc(current)}" placeholder="ทะเบียนรถ">`;
      }

      if (!q(".attendee-row-action", row)) {
        const td = document.createElement("td");
        td.className = "attendee-row-action";
        td.innerHTML = canChangePeople
          ? '<button type="button" class="mini-button attendee-delete" style="white-space:nowrap">ลบ</button>'
          : '<span style="color:#98a2b3">-</span>';
        row.appendChild(td);
      }
    });

    const actionBar = q(".detail-actions", content);
    if (actionBar && !q("#save-attendee-list", actionBar)) {
      actionBar.insertAdjacentHTML(
        "afterbegin",
        `<button id="save-attendee-list" class="button button--secondary" type="button">บันทึกรายชื่อ / ทะเบียนรถ</button>${canChangePeople ? '<button id="add-attendee" class="button button--secondary" type="button">+ เพิ่มคน</button>' : ''}`
      );
    }
  }

  async function saveExisting() {
    const supabase = await getClient();
    const rows = qa("tr[data-attendee-id]", findPeopleTable() || content);

    for (const row of rows) {
      const id = row.dataset.attendeeId;
      const car = q(".edit-car-license", row)?.value?.trim() || null;
      const cardType = q(".edit-card-type", row)?.value?.trim().toUpperCase() || null;
      const identityLast4 = q(".edit-id-last4", row)?.value?.replace(/[\s-]/g, "").trim().toUpperCase() || null;

      const patch = {
        car_license: car,
        card_type: cardType,
        identity_last4: identityLast4,
        identity_masked: identityLast4 ? `XXXX${identityLast4}` : null
      };

      const result = await supabase.from("attendees").update(patch).eq("id", id);
      if (result.error) throw result.error;
    }

    alert("บันทึกรายชื่อและทะเบียนรถเรียบร้อย");
  }

  async function deleteAttendee(row) {
    const name = row.children[1]?.textContent?.trim() || "รายการนี้";
    if (!confirm(`ยืนยันลบ ${name} ออกจาก Request นี้?`)) return;

    const supabase = await getClient();
    const result = await supabase.from("attendees").delete().eq("id", row.dataset.attendeeId);
    if (result.error) throw result.error;

    row.remove();
    alert("ลบรายชื่อเรียบร้อย");
    location.reload();
  }

  async function addAttendee() {
    const request = await currentRequest();
    if (request.status !== "pending") {
      throw new Error("เพิ่ม/ลบรายชื่อได้เฉพาะ Request ที่ยังรออนุมัติ");
    }

    const name = prompt("ชื่อ-นามสกุล / Name");
    if (!name?.trim()) return;

    const company = prompt("บริษัท / Company");
    if (!company?.trim()) throw new Error("กรุณาระบุบริษัท");

    const typeRaw = (prompt("ประเภท: STAFF, STAFF-EMERGENCY, STAFF-TECHNICIAN, VENDOR หรือ VISITOR", "VENDOR") || "").trim().toUpperCase();
    const allowed = ["STAFF", "STAFF-EMERGENCY", "STAFF-TECHNICIAN", "VENDOR", "VISITOR"];
    if (!allowed.includes(typeRaw)) throw new Error("Attendee Type ไม่ถูกต้อง");

    const mobile = (prompt("Mobile (เว้นว่างได้)") || "").trim();
    const email = (prompt("Email (เว้นว่างได้)") || "").trim();

    const cardType = (prompt("Card Type: ID หรือ PASSPORT", "ID") || "").trim().toUpperCase();
    if (!["ID", "PASSPORT"].includes(cardType)) {
      throw new Error("Card Type ต้องเป็น ID หรือ PASSPORT");
    }

    const identityLast4 = (prompt("ID / Passport 4 ตัวท้าย (เว้นว่างได้)") || "")
      .replace(/[\s-]/g, "")
      .trim()
      .toUpperCase();
    if (identityLast4 && !/^[A-Z0-9]{4}$/.test(identityLast4)) {
      throw new Error("ID / Passport ต้องเป็น 4 ตัวท้าย");
    }

    const car = (prompt("ทะเบียนรถ / Car License (เว้นว่างได้)") || "").trim();

    const supabase = await getClient();
    const countResult = await supabase
      .from("attendees")
      .select("id", { count: "exact", head: true })
      .eq("request_id", request.id);
    if (countResult.error) throw countResult.error;
    if ((countResult.count || 0) >= Number(window.AccessApp.config.MAX_ATTENDEES || 25)) {
      throw new Error(`Request นี้มีรายชื่อครบสูงสุด ${window.AccessApp.config.MAX_ATTENDEES || 25} คนแล้ว`);
    }

    const lineResult = await supabase
      .from("attendees")
      .select("line_no")
      .eq("request_id", request.id)
      .order("line_no", { ascending: false })
      .limit(1);
    if (lineResult.error) throw lineResult.error;
    const lineNo = Number(lineResult.data?.[0]?.line_no || 0) + 1;

    const insert = await supabase.from("attendees").insert({
      request_id: request.id,
      line_no: lineNo,
      company: company.trim().slice(0, 120),
      attendee_type: typeRaw,
      name: name.trim().slice(0, 160),
      mobile: mobile.slice(0, 100),
      email: email.slice(0, 200),
      card_type: cardType,
      identity_last4: identityLast4 || null,
      identity_masked: identityLast4 ? `XXXX${identityLast4}` : null,
      car_license: car.slice(0, 50)
    });
    if (insert.error) throw insert.error;

    alert("เพิ่มรายชื่อเรียบร้อย");
    location.reload();
  }

  content.addEventListener("click", (event) => {
    const save = event.target.closest("#save-attendee-list");
    if (save) {
      saveExisting().catch((error) => alert(error.message || "บันทึกไม่สำเร็จ"));
      return;
    }

    const add = event.target.closest("#add-attendee");
    if (add) {
      addAttendee().catch((error) => alert(error.message || "เพิ่มรายชื่อไม่สำเร็จ"));
      return;
    }

    const del = event.target.closest(".attendee-delete");
    if (del) {
      const row = del.closest("tr[data-attendee-id]");
      if (row) deleteAttendee(row).catch((error) => alert(error.message || "ลบรายชื่อไม่สำเร็จ"));
    }
  });

  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => enhance().catch(console.error), 50);
  });
  observer.observe(content, { childList: true, subtree: true });
})();
