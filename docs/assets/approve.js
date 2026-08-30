(() => {"use strict";
const {demoMode,getClient,readDemoRequests,updateDemoRequest,escapeHtml,formatDate,attendeeTypeLabel}=window.AccessApp;
const q=s=>document.querySelector(s); let client=null,requests=[],selected=null,dailyRecords=new Map();
const login=q('#login-panel'),dash=q('#dashboard'),tbody=q('#request-table-body'),empty=q('#empty-state'),detail=q('#detail-panel'),content=q('#detail-content');
function badge(s){return `<span class="status status--${s}">${({pending:'รอตรวจสอบ',approved:'อนุมัติแล้ว',rejected:'ไม่อนุมัติ',completed:'เสร็จสิ้น'})[s]||s}</span>`}
async function load(){ if(demoMode) {requests=readDemoRequests();dailyRecords=new Map()} else {const r=await client.from('access_requests').select('*, attendees(*)').order('created_at',{ascending:false}); if(r.error) throw r.error; requests=r.data||[]} render(); if(selected&&!detail.hidden){selected=requests.find(r=>r.id===selected.id)||selected;await open(selected)} }
async function loadDailyRecords(requestId){
  const records=new Map();
  if(demoMode)return records;
  const result=await client.from('attendee_daily_records').select('*').eq('request_id',requestId).order('record_date',{ascending:false});
  if(result.error)throw result.error;
  (result.data||[]).forEach(record=>{
    const attendeeId=String(record.attendee_id);
    if(!records.has(attendeeId))records.set(attendeeId,record);
  });
  return records;
}
function render(){const term=q('#search').value.toLowerCase(),st=q('#status-filter').value,dt=q('#date-filter').value; const rows=requests.filter(r=>(!st||r.status===st)&&(!dt||r.visit_date===dt)&&(!term||JSON.stringify(r).toLowerCase().includes(term))); tbody.innerHTML=rows.map(r=>`<tr data-id="${r.id}"><td><strong>${escapeHtml(r.request_code)}</strong></td><td>${escapeHtml(r.location)}</td><td>${escapeHtml(r.project_name)}<small>${escapeHtml(r.room)}</small></td><td>
  ${escapeHtml(formatDate(r.visit_date))}
  ${
    r.visit_end_date &&
    r.visit_end_date !== r.visit_date
      ? ` - ${escapeHtml(formatDate(r.visit_end_date))}`
      : ""
  }
</td><td>${(r.attendees||[]).length}</td><td>${badge(r.status)}</td><td><button class="mini-button view">ตรวจสอบ</button></td></tr>`).join(''); empty.hidden=rows.length>0;}
function timeValue(value){return value?escapeHtml(String(value).slice(0,5)):'-'}
async function open(r){
  selected=r;
  const records=await loadDailyRecords(r.id);
  if(selected.id!==r.id)return;
  dailyRecords=records;
  const attendees=r.attendees||[];
const people = attendees.map((p, i) => `
  <tr data-attendee-id="${p.id}">
    <td>${i + 1}</td>

    <td>
      <strong>${escapeHtml(p.name)}</strong>
    </td>

    <td>${escapeHtml(p.company)}</td>

    <td>${escapeHtml(attendeeTypeLabel(p.attendee_type))}</td>

    <td>${escapeHtml(p.mobile || "-")}</td>

    <td>${escapeHtml(p.email || "-")}</td>

    <td>
      <select class="table-input edit-card-type">
        <option value="">ไม่ระบุ</option>

        <option
          value="ID"
          ${p.card_type === "ID" ? "selected" : ""}
        >
          ID
        </option>

        <option
          value="PASSPORT"
          ${p.card_type === "PASSPORT" ? "selected" : ""}
        >
          PASSPORT
        </option>
      </select>
    </td>

    <td>
      <input
        class="table-input edit-id-last4"
        maxlength="4"
        value="${escapeHtml(p.identity_last4 || "")}"
        placeholder="4 ตัวท้าย"
        style="text-transform: uppercase"
      >
    </td>

    <td>${escapeHtml(p.car_license || "-")}</td>
  </tr>
`).join("");
  const securityRows=attendees.map((p,i)=>{const record=dailyRecords.get(String(p.id))||{};return `<tr><td>${i+1}</td><td><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.company||'')}</small></td><td>${record.record_date?escapeHtml(formatDate(record.record_date)):'-'}</td><td>${escapeHtml(record.tidc_card_no||'-')}</td><td>${timeValue(record.entry_time)}</td><td>${timeValue(record.exit_time)}</td><td>${timeValue(record.card_exchange_time)}</td><td>${timeValue(record.card_return_time)}</td></tr>`}).join('');
  const securityView=(r.status==='approved'||r.status==='completed')?`<section class="security-view"><div class="section-heading"><div><p class="eyebrow">Security Record</p><h3>ข้อมูลที่ รปภ. บันทึก</h3></div><span class="status-note">ดูได้อย่างเดียว</span></div><div class="table-wrap table-wrap--detail"><table class="security-table"><thead><tr><th>No.</th><th>Name / Company</th><th>Record Date</th><th>Card No.</th><th>เวลาเข้า</th><th>เวลาออก</th><th>เวลาแลกบัตร</th><th>เวลาคืนบัตร</th></tr></thead><tbody>${securityRows}</tbody></table></div></section>`:'';
const approvalButtons =
  r.status === "pending"
    ? `
      <button
        class="button button--success status-action"
        data-status="approved"
        type="button"
      >
        Approve
      </button>

      <button
        class="button button--danger status-action"
        data-status="rejected"
        type="button"
      >
        Reject
      </button>
    `
    : r.status === "approved"
      ? `
        <button
          class="button button--danger status-action"
          data-status="rejected"
          type="button"
        >
          Reject
        </button>
      `
      : "";

const actions = `
  <div class="detail-actions">
    <button
      id="save-attendee-identity"
      class="button button--primary"
      type="button"
    >
      บันทึก Card Type / ID
    </button>

    ${approvalButtons}
  </div>
`;
  content.innerHTML=`<div class="detail-header"><div><p class="eyebrow">${escapeHtml(r.request_code)}</p><h2>${escapeHtml(r.project_name)}</h2></div><button id="close-detail" class="icon-button">×</button></div><div class="detail-meta"><div><span>Location</span><strong>${escapeHtml(r.location)}</strong></div><div>
  <span>Work Date</span>
  <strong>
    ${escapeHtml(formatDate(r.visit_date))}
    ${
      r.visit_end_date &&
      r.visit_end_date !== r.visit_date
        ? ` - ${escapeHtml(formatDate(r.visit_end_date))}`
        : ""
    }
  </strong>
</div><div><span>Room</span><strong>${escapeHtml(r.room)}</strong></div><div><span>Objective</span><strong>${escapeHtml(r.objective)}</strong></div><div>   <span>ผู้ประสานงานภายใน</span>   <strong>     ${escapeHtml(r.host_name || "-")}   </strong>   <small>     ${escapeHtml(r.host_phone || "-")}   </small> </div>  <div>   <span>Request by</span>   <strong>     ${escapeHtml(r.requester_name || "-")}   </strong>   <small>     ${escapeHtml(r.requester_company || "-")}   </small> </div>  <div>   <span>Requester Contact</span>   <strong>     ${escapeHtml(r.requester_phone || "-")}   </strong>   <small>     ${escapeHtml(r.requester_email || "-")}   </small> </div>  <div>   <span>Status</span>   <strong>${badge(r.status)}</strong> </div></div><div class="table-wrap"><table><thead><tr><th>No.</th>
<th>Name</th>
<th>Company</th>
<th>Type</th>
<th>Mobile</th>
<th>Email</th><th>Card Type</th><th>ID / Passport</th><th>Car</th></tr></thead><tbody>${people}</tbody></table></div>${securityView}${actions}`;
  detail.hidden=false;
}
async function status(s){let u;if(demoMode)u=updateDemoRequest(selected.id,{status:s,reviewed_at:new Date().toISOString()});else{const r=await client.from('access_requests').update({status:s,reviewed_at:new Date().toISOString()}).eq('id',selected.id).select('*, attendees(*)').single();if(r.error)throw r.error;u=r.data} requests[requests.findIndex(x=>x.id===u.id)]=u; selected=u; render();await open(u)}
async function saveAttendeeIdentity() {
  const rows = [
    ...content.querySelectorAll("tr[data-attendee-id]")
  ];

  if (!rows.length) {
    throw new Error("ไม่พบข้อมูลผู้เข้าพื้นที่");
  }

  const updates = rows.map((row, index) => {
    const cardTypeInput =
      row.querySelector(".edit-card-type");

    const identityInput =
      row.querySelector(".edit-id-last4");

    if (!cardTypeInput || !identityInput) {
      throw new Error(
        `ไม่พบช่อง Card Type หรือ ID ในแถว ${index + 1}`
      );
    }

    const cardType = cardTypeInput.value
      .trim()
      .toUpperCase();

    const identityLast4 = identityInput.value
      .replace(/[\s-]/g, "")
      .trim()
      .toUpperCase();

    if (
      cardType &&
      !["ID", "PASSPORT"].includes(cardType)
    ) {
      throw new Error(
        `Card Type แถว ${index + 1} ไม่ถูกต้อง`
      );
    }

    if (
      identityLast4 &&
      !/^[A-Z0-9]{4}$/.test(identityLast4)
    ) {
      throw new Error(
        `ID / Passport แถว ${index + 1} ต้องมี 4 ตัว`
      );
    }

    if (identityLast4 && !cardType) {
      throw new Error(
        `กรุณาเลือก Card Type แถว ${index + 1}`
      );
    }

    return {
      id: row.dataset.attendeeId,
      card_type: cardType || null,
      identity_last4: identityLast4 || null,
      identity_masked: identityLast4
        ? `XXXX${identityLast4}`
        : null
    };
  });

  for (const item of updates) {
    const { id, ...data } = item;

    const { error } = await client
      .from("attendees")
      .update(data)
      .eq("id", id);

    if (error) {
      throw error;
    }
  }

  const { data, error } = await client
    .from("access_requests")
    .select("*, attendees(*)")
    .eq("id", selected.id)
    .single();

  if (error) {
    throw error;
  }

  selected = data;

  const requestIndex = requests.findIndex(
    (item) => item.id === data.id
  );

  if (requestIndex >= 0) {
    requests[requestIndex] = data;
  }

  render();
  await open(data);

  alert("บันทึก Card Type / ID เรียบร้อย");
}
        tbody.onclick=e=>{const tr=e.target.closest('tr[data-id]');if(tr)open(requests.find(x=>x.id===tr.dataset.id)).catch(error=>alert(error.message||"ไม่สามารถโหลดข้อมูลได้"))}; detail.onclick = (e) => {
  if (
    e.target.id === "close-detail" ||
    e.target === detail
  ) {
    detail.hidden = true;
    return;
  }

  const statusButton =
    e.target.closest(".status-action");

  if (statusButton) {
    status(statusButton.dataset.status)
      .catch((error) => {
        alert(
          error.message ||
          "ไม่สามารถเปลี่ยนสถานะได้"
        );
      });

    return;
  }

  if (
    e.target.id === "save-attendee-identity"
  ) {
    saveAttendeeIdentity()
      .catch((error) => {
        alert(
          error.message ||
          "ไม่สามารถบันทึกข้อมูลได้"
        );
      });
  }
};
        ["search", "status-filter", "date-filter"].forEach((id) => {
  q("#" + id).addEventListener("input", render);
  q("#" + id).addEventListener("change", render);
});

q("#refresh-button").onclick = () => {
  load().catch((error) => {
    alert(
      error.message ||
      "ไม่สามารถรีเฟรชข้อมูลได้"
    );
  });
};
function show(){login.hidden=true;dash.hidden=false;load().catch(e=>alert(e.message))} function signin(){if(demoMode){q('#mode-banner').hidden=false;q('#mode-banner').innerHTML='<strong>Demo mode:</strong> ใช้งานในเบราว์เซอร์เครื่องเดียว';q('#logout-button').hidden=true;show();return}client=getClient().then(c=>{client=c;return c.auth.getSession()}).then(({data})=>data.session?show():(login.hidden=false));}
q('#login-form').onsubmit=async e=>{e.preventDefault();client=client||await getClient();const {error}=await client.auth.signInWithPassword({email:q('#admin-email').value,password:q('#admin-password').value});if(error){q('#login-error').textContent=error.message;q('#login-error').hidden=false}else show()};q('#logout-button').onclick=async()=>{await client.auth.signOut();location.reload()};signin();})();