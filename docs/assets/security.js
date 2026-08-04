(() => {"use strict";
const {demoMode,getClient,readDemoRequests,updateDemoRequest,escapeHtml,formatDate,formatTime}=window.AccessApp;const q=s=>document.querySelector(s);let client=null,requests=[],selected=null;
const login=q('#login-panel'),dash=q('#dashboard'),tbody=q('#request-table-body'),empty=q('#empty-state'),detail=q('#detail-panel'),content=q('#detail-content');
function badge(s){return `<span class="status status--${s}">${({approved:'อนุมัติแล้ว',completed:'เสร็จสิ้น'})[s]||s}</span>`}
async function load(){if(demoMode)requests=readDemoRequests();else{const r=await client.from('access_requests').select('*, attendees(*)').in('status',['approved','completed']).order('visit_date');if(r.error)throw r.error;requests=r.data||[]}render()}
function render(){const term=q('#search').value.toLowerCase(),dt=q('#date-filter').value,st=q('#status-filter').value;const rows=requests.filter(r=>(!st||r.status===st)&&(!dt||r.visit_date===dt)&&(!term||JSON.stringify(r).toLowerCase().includes(term)));tbody.innerHTML=rows.map(r=>`<tr data-id="${r.id}"><td><strong>${escapeHtml(r.request_code)}</strong></td><td>${escapeHtml(r.location)}</td><td>${escapeHtml(r.project_name)}<small>${escapeHtml(r.room)}</small></td><td>
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

  const rows = (r.attendees || []).map((p, i) => `
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
          value="${escapeHtml(p.tidc_card_no || "")}"
          placeholder="Card no."
        >
      </td>

      <td>${timeEditor("entry-time", p.entry_time)}</td>
      <td>${timeEditor("exit-time", p.exit_time)}</td>
      <td>${timeEditor("card-exchange", p.card_exchange_time)}</td>
      <td>${timeEditor("card-return", p.card_return_time)}</td>
    </tr>
  `).join("");content.innerHTML=`<div class="detail-header"><div><p class="eyebrow">${escapeHtml(r.request_code)}</p><h2>${escapeHtml(r.project_name)}</h2></div><button id="close-detail" class="icon-button">×</button></div><div class="detail-meta"><div><span>Location</span><strong>${escapeHtml(r.location)}</strong></div><div><span>Work Date</span><strong>${escapeHtml(formatDate(r.visit_date))}${r.visit_end_date && r.visit_end_date !== r.visit_date ? ` - ${escapeHtml(formatDate(r.visit_end_date))}` : ""}</strong></div><div><span>Room</span><strong>${escapeHtml(r.room)}</strong></div><div><span>Objective</span><strong>${escapeHtml(r.objective)}</strong></div></div><div class="security-instruction"><strong>ลำดับการบันทึก:</strong> Card No. → เวลาเข้า → เวลาออก → เวลาแลกบัตร → เวลาคืนบัตร</div><div class="table-wrap table-wrap--detail"><table class="security-table"><thead><tr><th>No.</th>
<th>Name / Company</th><th>Card Type</th><th>ID / Passport</th><th>ทะเบียนรถ</th><th>Card No.</th>
<th>เวลาเข้า</th>
<th>เวลาออก</th>
<th>เวลาแลกบัตร</th>
<th>เวลาคืนบัตร</th></tr></thead><tbody>${rows}</tbody></table></div><div class="detail-actions"><button id="save" class="button button--primary">บันทึกข้อมูล รปภ.</button><button id="complete" class="button button--success">เสร็จสิ้น</button><span class="action-divider"></span><button id="export-fr" class="button button--secondary">ดาวน์โหลด FR-037</button><button id="print-fr" class="button button--ghost">พิมพ์ FR-037</button></div>`;detail.hidden=false}
function clock(){return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())}
function collect(){return [...content.querySelectorAll('tr[data-attendee-id]')].map(row=>{const entry=row.querySelector('.entry-time').value||null,exit=row.querySelector('.exit-time').value||null,exchange=row.querySelector('.card-exchange').value||null,returned=row.querySelector('.card-return').value||null;if(exit&&!entry)throw new Error('กรุณาระบุเวลาเข้าก่อนเวลาออก');if(returned&&!exchange)throw new Error('กรุณาระบุเวลาแลกบัตรก่อนเวลาคืนบัตร');return{id:row.dataset.attendeeId,tidc_card_no:row.querySelector('.tidc-card').value.trim()||null,card_exchange_time:exchange,entry_time:entry,exit_time:exit,card_return_time:returned}})}
async function save(){const patches=collect();let u;if(demoMode){const m=new Map(patches.map(x=>[x.id,x]));u=updateDemoRequest(selected.id,{attendees:(selected.attendees||[]).map(p=>({...p,...m.get(p.id)}))})}else{for(const p of patches){const {id,...data}=p;const r=await client.from('attendees').update(data).eq('id',id);if(r.error)throw r.error}const r=await client.from('access_requests').select('*, attendees(*)').eq('id',selected.id).single();if(r.error)throw r.error;u=r.data}requests[requests.findIndex(x=>x.id===u.id)]=u;selected=u;open(u);render();alert('บันทึกเรียบร้อย')}
async function complete(){let u;if(demoMode)u=updateDemoRequest(selected.id,{status:'completed'});else{const r=await client.from('access_requests').update({status:'completed'}).eq('id',selected.id).select('*, attendees(*)').single();if(r.error)throw r.error;u=r.data}requests[requests.findIndex(x=>x.id===u.id)]=u;selected=u;open(u);render()}
tbody.onclick=e=>{const tr=e.target.closest('tr[data-id]');if(tr)open(requests.find(x=>x.id===tr.dataset.id))};detail.onclick=e=>{if(e.target.id==='close-detail'||e.target===detail)detail.hidden=true;const n=e.target.closest('.time-now');if(n)n.closest('td').querySelector('.'+n.dataset.target).value=clock();if(e.target.id==='save')save().catch(x=>alert(x.message));if(e.target.id==='complete')complete().catch(x=>alert(x.message));if(e.target.id==='export-fr')window.AccessExports.exportFR037(selected);if(e.target.id==='print-fr')window.AccessExports.printFR037(selected)};['search','date-filter','status-filter'].forEach(id=>q('#'+id).addEventListener('input',render));q('#refresh-button').onclick=load;
function show(){login.hidden=true;dash.hidden=false;load().catch(e=>alert(e.message))}async function init(){if(demoMode){q('#mode-banner').hidden=false;q('#mode-banner').innerHTML='<strong>Demo mode:</strong> เห็นข้อมูลเฉพาะเบราว์เซอร์เครื่องเดียว';q('#logout-button').hidden=true;show()}else{client=await getClient();const {data}=await client.auth.getSession();data.session?show():login.hidden=false}}q('#login-form').onsubmit=async e=>{e.preventDefault();client=client||await getClient();const {error}=await client.auth.signInWithPassword({email:q('#admin-email').value,password:q('#admin-password').value});if(error){q('#login-error').textContent=error.message;q('#login-error').hidden=false}else show()};q('#logout-button').onclick=async()=>{await client.auth.signOut();location.reload()};init();})();
