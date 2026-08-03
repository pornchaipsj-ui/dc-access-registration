(() => {"use strict";
const {demoMode,getClient,readDemoRequests,updateDemoRequest,escapeHtml,formatDate,attendeeTypeLabel}=window.AccessApp;
const q=s=>document.querySelector(s); let client=null,requests=[],selected=null;
const login=q('#login-panel'),dash=q('#dashboard'),tbody=q('#request-table-body'),empty=q('#empty-state'),detail=q('#detail-panel'),content=q('#detail-content');
function badge(s){return `<span class="status status--${s}">${({pending:'รอตรวจสอบ',approved:'อนุมัติแล้ว',rejected:'ไม่อนุมัติ',completed:'เสร็จสิ้น'})[s]||s}</span>`}
async function load(){ if(demoMode) requests=readDemoRequests(); else {const r=await client.from('access_requests').select('*, attendees(*)').order('created_at',{ascending:false}); if(r.error) throw r.error; requests=r.data||[]} render(); }
function render(){const term=q('#search').value.toLowerCase(),st=q('#status-filter').value,dt=q('#date-filter').value; const rows=requests.filter(r=>(!st||r.status===st)&&(!dt||r.visit_date===dt)&&(!term||JSON.stringify(r).toLowerCase().includes(term))); tbody.innerHTML=rows.map(r=>`<tr data-id="${r.id}"><td><strong>${escapeHtml(r.request_code)}</strong></td><td>${escapeHtml(r.location)}</td><td>${escapeHtml(r.project_name)}<small>${escapeHtml(r.room)}</small></td><td>${escapeHtml(formatDate(r.visit_date))}</td><td>${(r.attendees||[]).length}</td><td>${badge(r.status)}</td><td><button class="mini-button view">ตรวจสอบ</button></td></tr>`).join(''); empty.hidden=rows.length>0;}
function timeValue(value){return value?escapeHtml(String(value).slice(0,5)):'-'}
function open(r){
  selected=r;
  const attendees=r.attendees||[];
 const people = attendees.map((p, i) => `
  <tr>
    <td>${i + 1}</td>
    <td><strong>${escapeHtml(p.name)}</strong></td>
    <td>${escapeHtml(p.company)}</td>
    <td>${escapeHtml(attendeeTypeLabel(p.attendee_type))}</td>
    <td>${escapeHtml(p.mobile || "-")}</td>
    <td>${escapeHtml(p.email || "-")}</td>
    <td>${escapeHtml(p.card_type || "-")}</td>
    <td>${escapeHtml(p.identity_masked || p.identity_last4 || "-")}</td>
    <td>${escapeHtml(p.car_license || "-")}</td>
  </tr>
`).join("");
  const securityRows=attendees.map((p,i)=>`<tr><td>${i+1}</td><td><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.company||'')}</small></td><td>${escapeHtml(p.tidc_card_no||'-')}</td><td>${timeValue(p.entry_time)}</td><td>${timeValue(p.exit_time)}</td><td>${timeValue(p.card_exchange_time)}</td><td>${timeValue(p.card_return_time)}</td></tr>`).join('');
  const securityView=(r.status==='approved'||r.status==='completed')?`<section class="security-view"><div class="section-heading"><div><p class="eyebrow">Security Record</p><h3>ข้อมูลที่ รปภ. บันทึก</h3></div><span class="status-note">ดูได้อย่างเดียว</span></div><div class="table-wrap table-wrap--detail"><table class="security-table"><thead><tr><th>No.</th><th>Name / Company</th><th>Card No.</th><th>เวลาเข้า</th><th>เวลาออก</th><th>เวลาแลกบัตร</th><th>เวลาคืนบัตร</th></tr></thead><tbody>${securityRows}</tbody></table></div></section>`:'';
  const actions=r.status==='pending'?`<div class="detail-actions"><button class="button button--success status-action" data-status="approved">Approve</button><button class="button button--danger status-action" data-status="rejected">Reject</button></div>`:'';
  content.innerHTML=`<div class="detail-header"><div><p class="eyebrow">${escapeHtml(r.request_code)}</p><h2>${escapeHtml(r.project_name)}</h2></div><button id="close-detail" class="icon-button">×</button></div><div class="detail-meta"><div><span>Location</span><strong>${escapeHtml(r.location)}</strong></div><div><span>Date</span><strong>${escapeHtml(formatDate(r.visit_date))}</strong></div><div><span>Room</span><strong>${escapeHtml(r.room)}</strong></div><div><span>Objective</span><strong>${escapeHtml(r.objective)}</strong></div><div><span>ผู้ประสานงาน</span><strong>${escapeHtml(r.host_name||'-')} ${escapeHtml(r.host_phone||'')}</strong></div><div><span>Status</span><strong>${badge(r.status)}</strong></div></div><div class="table-wrap"><table><thead><tr><th>No.</th>
<th>Name</th>
<th>Company</th>
<th>Type</th>
<th>Mobile</th>
<th>Email</th><th>Card Type</th><th>ID / Passport</th><th>Car</th></tr></thead><tbody>${people}</tbody></table></div>${securityView}${actions}`;
  detail.hidden=false;
}
async function status(s){let u;if(demoMode)u=updateDemoRequest(selected.id,{status:s,reviewed_at:new Date().toISOString()});else{const r=await client.from('access_requests').update({status:s,reviewed_at:new Date().toISOString()}).eq('id',selected.id).select('*, attendees(*)').single();if(r.error)throw r.error;u=r.data} requests[requests.findIndex(x=>x.id===u.id)]=u; selected=u; render();open(u)}
tbody.onclick=e=>{const tr=e.target.closest('tr[data-id]');if(tr)open(requests.find(x=>x.id===tr.dataset.id))}; detail.onclick=e=>{if(e.target.id==='close-detail'||e.target===detail)detail.hidden=true;const b=e.target.closest('.status-action');if(b)status(b.dataset.status).catch(x=>alert(x.message))}; ['search','status-filter','date-filter'].forEach(id=>q('#'+id).addEventListener('input',render));q('#refresh-button').onclick=load;
function show(){login.hidden=true;dash.hidden=false;load().catch(e=>alert(e.message))} function signin(){if(demoMode){q('#mode-banner').hidden=false;q('#mode-banner').innerHTML='<strong>Demo mode:</strong> ใช้งานในเบราว์เซอร์เครื่องเดียว';q('#logout-button').hidden=true;show();return}client=getClient().then(c=>{client=c;return c.auth.getSession()}).then(({data})=>data.session?show():(login.hidden=false));}
q('#login-form').onsubmit=async e=>{e.preventDefault();client=client||await getClient();const {error}=await client.auth.signInWithPassword({email:q('#admin-email').value,password:q('#admin-password').value});if(error){q('#login-error').textContent=error.message;q('#login-error').hidden=false}else show()};q('#logout-button').onclick=async()=>{await client.auth.signOut();location.reload()};signin();})();
