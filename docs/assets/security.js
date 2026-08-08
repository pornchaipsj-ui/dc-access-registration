(() => {"use strict";
const {demoMode,getClient,readDemoRequests,updateDemoRequest,escapeHtml,formatDate,formatTime}=window.AccessApp;const q=s=>document.querySelector(s);let client = null; let requests = []; let selected = null; let dailyRecords = new Map();
const login=q('#login-panel'),dash=q('#dashboard'),tbody=q('#request-table-body'),empty=q('#empty-state'),detail=q('#detail-panel'),content=q('#detail-content');
function badge(s) {   return `     <span class="status status--${s}">       ${s === "approved" ? "อนุมัติแล้ว" : s}     </span>   `; }
async function load() {   if (demoMode) {     requests = readDemoRequests();   } else {     const r = await client       .from("access_requests")       .select("*, attendees(*)")       .eq("status", "approved")       .order("visit_date");      if (r.error) throw r.error;      requests = r.data || [];      await loadDailyRecords();   }    render(); }

async function loadDailyRecords() {
  dailyRecords = new Map();

  if (demoMode) return;

  const selectedDate = q("#date-filter").value;

  if (!selectedDate) return;

  const result = await client
    .from("attendee_daily_records")
    .select("*")
    .eq("record_date", selectedDate);

  if (result.error) throw result.error;

  (result.data || []).forEach((record) => {
    dailyRecords.set(
      String(record.attendee_id),
      record
    );
  });
}
        
   function renderSummary(filteredRequests) {
  const attendees = filteredRequests.flatMap(
    (request) => request.attendees || []
  );

  const total = attendees.length;

const exchanged = attendees.filter((person) => {
  const record = dailyRecords.get(String(person.id));

  return Boolean(record?.card_exchange_time);
}).length;

  const inside = attendees.filter((person) => {
  const record = dailyRecords.get(String(person.id));

  return (
    Boolean(record?.card_exchange_time) &&
    !record?.card_return_time
  );
}).length;

 const exited = attendees.filter((person) => {
  const record = dailyRecords.get(String(person.id));

  return Boolean(record?.card_return_time);
}).length;

  q("#summary-total").textContent = total;
  q("#summary-exchanged").textContent = exchanged;
  q("#summary-inside").textContent = inside;
  q("#summary-exited").textContent = exited;
}     
        
        function render(){const term=q('#search').value.toLowerCase(),dt=q('#date-filter').value,st=q('#status-filter').value;const rows=requests.filter(r=>(!st||r.status===st)&&(   !dt ||   (     r.visit_date <= dt &&     (       !r.visit_end_date ||       r.visit_end_date >= dt     )   ) )&&(!term||JSON.stringify(r).toLowerCase().includes(term)));renderSummary(rows);tbody.innerHTML=rows.map(r=>`<tr data-id="${r.id}"><td><strong>${escapeHtml(r.request_code)}</strong></td><td>${escapeHtml(r.location)}</td><td>${escapeHtml(r.project_name)}<small>${escapeHtml(r.room)}</small></td><td>
  ${escapeHtml(formatDate(r.visit_date))}
  ${
    r.visit_end_date &&
    r.visit_end_date !== r.visit_date
      ? ` - ${escapeHtml(formatDate(r.visit_end_date))}`
      : ""
  }
</td><td>${(r.attendees||[]).length}</td><td>${badge(r.status)}</td><td><button class="mini-button">บันทึกเวลา</button></td></tr>`).join('');empty.hidden=rows.length>0}
const timeEditor=(cls,val)=>`<div class="time-editor"><input class="table-input ${cls}" type="time" value="${escapeHtml(formatTime(val))}"><button type="button" class="mini-button time-now" data-target="${cls}">ตอนนี้</button></div>`;
function open(r) {
  selected = r;
   const selectedDate = q("#date-filter").value;

  const rows = (r.attendees || []).map((p, i) => {   const record =     dailyRecords.get(String(p.id)) || {};    return `
    <tr data-attendee-id="${p.id}">
      <td>${i + 1}</td>

      <td>
        <strong>${escapeHtml(p.name)}</strong>
        <small>${escapeHtml(p.company)}</small>
      </td>

      <td>${escapeHtml(p.card_type || "-")}</td>

      <td>
  ${escapeHtml(
    p.identity_masked ||
    p.identity_last4 ||
    "-"
  )}
</td>

<td>
  ${escapeHtml(p.car_license || "-")}
</td>

<td>
  <input
          class="table-input tidc-card"
          value="${escapeHtml(record.tidc_card_no || "")}"
          placeholder="Card no."
        >
      </td>

      <td>${timeEditor("entry-time", record.entry_time)}</td>
      <td>${timeEditor("exit-time", record.exit_time)}</td>
      <td>${timeEditor("card-exchange", record.card_exchange_time)}</td>
      <td>${timeEditor("card-return", record.card_return_time)}</td>
   </tr>
`;
}).join("");content.innerHTML=`<div class="detail-header"><div><p class="eyebrow">${escapeHtml(r.request_code)}</p><h2>${escapeHtml(r.project_name)}</h2></div><button id="close-detail" class="icon-button">×</button></div><div class="detail-meta"><div><span>Location</span><strong>${escapeHtml(r.location)}</strong></div><div><span>Work Date</span><strong>${escapeHtml(formatDate(r.visit_date))}${r.visit_end_date && r.visit_end_date !== r.visit_date ? ` - ${escapeHtml(formatDate(r.visit_end_date))}` : ""}</strong></div><div><span>Room</span><strong>${escapeHtml(r.room)}</strong></div><div><span>Objective</span><strong>${escapeHtml(r.objective)}</strong></div></div><div class="security-instruction"><strong>ลำดับการบันทึก:</strong> Card No. → เวลาเข้า → เวลาออก → เวลาแลกบัตร → เวลาคืนบัตร</div><div class="table-wrap table-wrap--detail"><table class="security-table"><thead><tr><th>No.</th>
<th>Name / Company</th><th>Card Type</th><th>ID / Passport</th><th>ทะเบียนรถ</th><th>Card No.</th>
<th>เวลาเข้า</th>
<th>เวลาออก</th>
<th>เวลาแลกบัตร</th>
<th>เวลาคืนบัตร</th></tr></thead><tbody>${rows}</tbody></table></div><div class="detail-actions"><button id="save" class="button button--primary">บันทึกข้อมูล รปภ.</button><span class="action-divider"></span><button id="export-fr" class="button button--secondary">ดาวน์โหลด FR-037</button><button id="print-fr" class="button button--ghost">พิมพ์ FR-037</button></div>`;detail.hidden=false}
function clock(){return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())}
function collect(){return [...content.querySelectorAll('tr[data-attendee-id]')].map(row=>{const entry=row.querySelector('.entry-time').value||null,exit=row.querySelector('.exit-time').value||null,exchange=row.querySelector('.card-exchange').value||null,returned=row.querySelector('.card-return').value||null;if(exit&&!entry)throw new Error('กรุณาระบุเวลาเข้าก่อนเวลาออก');if(returned&&!exchange)throw new Error('กรุณาระบุเวลาแลกบัตรก่อนเวลาคืนบัตร');return{id:row.dataset.attendeeId,tidc_card_no:row.querySelector('.tidc-card').value.trim()||null,card_exchange_time:exchange,entry_time:entry,exit_time:exit,card_return_time:returned}})}
async function save() {
  const patches = collect();
  const selectedDate = q("#date-filter").value;

  if (!selectedDate) {
    throw new Error("กรุณาเลือกวันที่ก่อนบันทึก");
  }

  if (demoMode) {
    alert("Demo mode ยังไม่รองรับข้อมูลรายวัน");
    return;
  }

  const dailyRows = patches.map((p) => ({
    request_id: selected.id,
    attendee_id: p.id,
    record_date: selectedDate,
    tidc_card_no: p.tidc_card_no,
    card_exchange_time: p.card_exchange_time,
    card_return_time: p.card_return_time,
    entry_time: p.entry_time,
    exit_time: p.exit_time
  }));

  const result = await client
    .from("attendee_daily_records")
    .upsert(dailyRows, {
      onConflict: "attendee_id,record_date"
    });

  if (result.error) throw result.error;

  await loadDailyRecords();

  open(selected);
  render();

  alert("บันทึกข้อมูลรายวันเรียบร้อย");
}
function printDailySummary() {
  const selectedDate = q("#date-filter").value;

  if (!selectedDate) {
    alert("กรุณาเลือกวันที่ก่อนพิมพ์ FR-037");
    return;
  }

  const dailyRequests = requests.filter((request) => {
    return (
      request.status === "approved" &&
      request.visit_date <= selectedDate &&
      (
        !request.visit_end_date ||
        request.visit_end_date >= selectedDate
      )
    );
  });

  if (!dailyRequests.length) {
    alert("ไม่พบรายการที่อนุมัติในวันที่เลือก");
    return;
  }

const dailyAttendees = dailyRequests.flatMap(
  (request) =>
    (request.attendees || [])
      .map((person) => {
        const record =
          dailyRecords.get(String(person.id)) || {};

        return {
          ...person,
          request_code: request.request_code,
          project_name: request.project_name,
          objective: request.objective,
          room: request.room,
          location: request.location,

          tidc_card_no:
            record.tidc_card_no || "",

          entry_time:
            record.entry_time || null,

          exit_time:
            record.exit_time || null,

          card_exchange_time:
            record.card_exchange_time || null,

          card_return_time:
            record.card_return_time || null
        };
      })
      .filter((person) =>
  Boolean(person.card_exchange_time)
)
.sort((a, b) =>
  String(a.card_exchange_time || "")
    .localeCompare(String(b.card_exchange_time || ""))
)
);

  if (!dailyAttendees.length) {
    alert("ไม่พบรายชื่อผู้เข้าพื้นที่ในวันที่เลือก");
    return;
  }

  const pages = [];

  for (
    let index = 0;
    index < dailyAttendees.length;
    index += 25
  ) {
    pages.push(
      dailyAttendees.slice(index, index + 25)
    );
  }

  const locations = [
    ...new Set(
      dailyRequests
        .map((request) => request.location)
        .filter(Boolean)
    )
  ];

  const locationCheckboxes = [
    "TT1",
    "TT2",
    "MTG",
    "BNA",
    "RYG"
  ].map((location) => `
    <span>
      ${locations.includes(location) ? "☒" : "☐"}
      ${location}
    </span>
  `).join("");

  const pageContents = pages.map(
    (pageAttendees, pageIndex) => {
      const rows = Array.from(
        { length: 25 },
        (_, rowIndex) => {
          const person = pageAttendees[rowIndex];

          return `
            <tr>
              <td>${pageIndex * 25 + rowIndex + 1}</td>

              <td>
                ${
                  person
                    ? escapeHtml(
                        person.project_name || ""
                      )
                    : ""
                }
              </td>

              <td>
                ${
                  person
                    ? escapeHtml(person.name || "")
                    : ""
                }
              </td>

              <td>
                ${
                  person
                    ? escapeHtml(
                        person.identity_last4 || ""
                      )
                    : ""
                }
              </td>

              <td>
                ${
                  person
                    ? escapeHtml(person.mobile || "")
                    : ""
                }
              </td>

              <td>
                ${
                  person
                    ? escapeHtml(person.email || "")
                    : ""
                }
              </td>

              <td>
                ${
                  person
                    ? escapeHtml(
                        window.AccessApp.attendeeTypeLabel(
                          person.attendee_type
                        )
                      )
                    : ""
                }
              </td>

              <td>
                ${
                  person
                    ? escapeHtml(person.company || "")
                    : ""
                }
              </td>

              <td>
                ${
                  person
                    ? escapeHtml(
                        person.tidc_card_no || ""
                      )
                    : ""
                }
              </td>

              <td>
                ${
                  person
                    ? escapeHtml(person.objective || "")
                    : ""
                }
              </td>

              <td>
                ${
                  person
                    ? escapeHtml(person.room || "")
                    : ""
                }
              </td>

              <td>
                ${
                  person
                    ? escapeHtml(
                        formatTime(person.card_exchange_time)
                      )
                    : ""
                }
              </td>

              <td>
                ${
                  person
                    ? escapeHtml(
                        formatTime(person.card_return_time)
                      )
                    : ""
                }
              </td>
            </tr>
          `;
        }
      ).join("");

      return `
        <section class="fr-page">
          <h1>
            แบบฟอร์มลงทะเบียนเข้า-ออก
            ภายในศูนย์คอมพิวเตอร์
          </h1>

          <div class="meta">
            <div class="locations">
              Location:
              ${locationCheckboxes}
            </div>

            <div>
              วันที่ตามแผน:
              ${escapeHtml(formatDate(selectedDate))}
            </div>
          </div>

          <div class="page-info">
            Daily Summary |
            จำนวนบุคคลทั้งหมด:
            ${dailyAttendees.length}
            |
            หน้า ${pageIndex + 1}/${pages.length}
          </div>

          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Project Name</th>
                <th>Name</th>
                <th>
                  ID Card<br>
                  Last 4
                </th>
                <th>Mobile No</th>
                <th>Email</th>
                <th>Type</th>
                <th>Company Name</th>
                <th>Card no. TIDC</th>
                <th>Objective</th>
                <th>Room</th>
                <th>Date In</th>
                <th>Date Out</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="note">
            * กรุณาคัดลายมือตัวบรรจง
            และกรอกข้อมูลให้ครบทุกช่อง
            ขอบคุณครับ/ค่ะ *
          </div>
        </section>
      `;
    }
  ).join("");

  const popup = window.open("", "_blank");

  if (!popup) {
    alert("กรุณาอนุญาต Pop-up เพื่อพิมพ์ FR-037");
    return;
  }

  popup.document.write(`
    <!doctype html>
    <html lang="th">
      <head>
        <meta charset="utf-8">

        <title>
          FR-037 Daily ${escapeHtml(selectedDate)}
        </title>

        <style>
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          body {
            font-family:
              Arial,
              "Noto Sans Thai",
              sans-serif;
            margin: 0;
            color: #111;
          }

          .fr-page {
            page-break-after: always;
          }

          .fr-page:last-child {
            page-break-after: auto;
          }

          h1 {
            text-align: center;
            font-size: 20px;
            margin: 0 0 9px;
          }

          .meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            font-size: 11px;
            margin-bottom: 5px;
          }

          .locations {
            font-weight: 700;
          }

          .locations span {
            margin-left: 10px;
          }

          .page-info {
            text-align: right;
            font-size: 10px;
            margin-bottom: 5px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 8px;
          }

          th,
          td {
            border: 1px solid #222;
            padding: 3px 2px;
            text-align: center;
            vertical-align: middle;
            word-break: break-word;
            height: 18px;
          }

          th {
            background: #f7e4d5;
            font-size: 8px;
          }

          th:nth-child(1) {
            width: 3%;
          }

          th:nth-child(2) {
            width: 8%;
          }

          th:nth-child(3) {
            width: 18%;
          }

          th:nth-child(4) {
            width: 8%;
          }

          th:nth-child(5) {
            width: 8%;
          }

          th:nth-child(6) {
            width: 15%;
          }

          th:nth-child(7) {
            width: 7%;
          }

          th:nth-child(8) {
            width: 8%;
          }

          th:nth-child(9) {
            width: 7%;
          }

          th:nth-child(10) {
            width: 8%;
          }

          th:nth-child(11) {
            width: 5%;
          }

          th:nth-child(12),
          th:nth-child(13) {
            width: 5%;
          }

          .note {
            font-size: 10px;
            margin-top: 5px;
          }
        </style>
      </head>

      <body>
        ${pageContents}

        <script>
          window.onload = function () {
            window.print();
          };
        <\/script>
      </body>
    </html>
  `);

  popup.document.close();
}
tbody.onclick=e=>{const tr=e.target.closest('tr[data-id]');if(tr)open(requests.find(x=>x.id===tr.dataset.id))};detail.onclick=e=>{if(e.target.id==='close-detail'||e.target===detail)detail.hidden=true;const n=e.target.closest('.time-now');if(n)n.closest('td').querySelector('.'+n.dataset.target).value=clock();if(e.target.id==='save')save().catch(x=>alert(x.message));if(e.target.id==='export-fr')window.AccessExports.exportFR037(selected);if(e.target.id==='print-fr')window.AccessExports.printFR037(selected)};['search','date-filter','status-filter'].forEach(id=>q('#'+id).addEventListener('input',render));q("#print-daily-button").onclick =
  printDailySummary;q('#refresh-button').onclick=load;
function show(){login.hidden=true;dash.hidden=false;load().catch(e=>alert(e.message))}q("#date-filter").addEventListener(
  "change",
  async () => {
    try {
      await loadDailyRecords();
      render();

      if (!detail.hidden && selected) {
        open(selected);
      }
    } catch (error) {
      alert(
        error.message ||
        "ไม่สามารถโหลดข้อมูลรายวันได้"
      );
    }
  }
);async function init(){const thaiDate = new Intl.DateTimeFormat(
  "en-CA",
  {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }
).format(new Date());

q("#date-filter").value =
  q("#date-filter").value || thaiDate;if(demoMode){q('#mode-banner').hidden=false;q('#mode-banner').innerHTML='<strong>Demo mode:</strong> เห็นข้อมูลเฉพาะเบราว์เซอร์เครื่องเดียว';q('#logout-button').hidden=true;show()}else{client=await getClient();const {data}=await client.auth.getSession();data.session?show():login.hidden=false}}q('#login-form').onsubmit=async e=>{e.preventDefault();client=client||await getClient();const {error}=await client.auth.signInWithPassword({email:q('#admin-email').value,password:q('#admin-password').value});if(error){q('#login-error').textContent=error.message;q('#login-error').hidden=false}else show()};q('#logout-button').onclick=async()=>{await client.auth.signOut();location.reload()};init();})();
