(() => {
"use strict";
const workspace=document.querySelector("#fr125-pdf-workspace"); if(!workspace)return;
const $=s=>document.querySelector(s), byId=id=>document.getElementById(id);
const overlay=byId("fr125-overlay-page1");
async function renderPdfBackground(){
  document.querySelectorAll(".fr125-pdf-canvas").forEach(c=>{c.style.zIndex="1";c.style.background="#fff"});
  document.querySelectorAll(".fr125-pdf-overlay").forEach(o=>{o.style.zIndex="2"});
  try{
    if(!window.pdfjsLib){
      await window.AccessApp.loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf=await window.pdfjsLib.getDocument("./assets/FR-125-v03%20Work%20Permit-1.pdf").promise;
    for(const canvas of document.querySelectorAll(".fr125-pdf-canvas")){
      const page=await pdf.getPage(Number(canvas.dataset.pdfPage));
      const base=page.getViewport({scale:1});
      const target=1040;
      const viewport=page.getViewport({scale:target/base.width});
      canvas.width=viewport.width; canvas.height=viewport.height;
      await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
      canvas.dataset.rendered="true";
    }
  }catch(e){
    console.error("FR-125 PDF render failed",e);
    workspace.insertAdjacentHTML("afterbegin",'<div class="file-status file-status--error">ไม่สามารถแสดง FR-125 PDF ได้ กรุณารีเฟรชหน้า</div>');
  }
}
renderPdfBackground();
let workPermitNo="";
const no=document.createElement("input");no.id="wp-work-permit-no";no.readOnly=true;no.placeholder="Run Work Permit No.";no.className="fr125-overlay-input fr125-overlay-number";Object.assign(no.style,{left:"73%",top:"7.2%",width:"21%",height:"1.65%"});overlay.appendChild(no);
const fields=[
["wp-work-date","date",27.0,22.45,17.5,1.75],["wp-start-time","time",52.0,22.45,13.5,1.75],["wp-end-time","time",73.0,22.45,13.5,1.75],
["wp-description","text",28.0,25.35,59,1.7],["wp-equipment","text",19.5,27.85,45,1.7],["wp-area","text",69.0,27.85,20,1.7],
["wp-car-license","text",25.0,33.55,61,1.65],["wp-requester-name","text",25.0,36.25,26,1.65],["wp-requester-phone","text",54.0,36.25,14,1.65],["wp-requester-company","text",71.0,36.25,16,1.65],
["wp-job-owner","text",28.0,38.55,24,1.65],["wp-job-owner-phone","text",54.0,38.55,14,1.65],["wp-job-owner-company","text",71.0,38.55,16,1.65],
["wp-contractor-controller","text",30.0,40.85,22,1.65],["wp-contractor-phone","text",54.0,40.85,14,1.65],["wp-contractor-company","text",71.0,40.85,16,1.65]
];
for(const [id,type,x,y,w,h] of fields){const el=document.createElement("input");el.id=id;el.type=type;el.className="fr125-overlay-input";Object.assign(el.style,{left:x+"%",top:y+"%",width:w+"%",height:h+"%"});overlay.appendChild(el)}
const checks=[
["general","งานทั่วไป",8.0,16.0],["confined","งานในพื้นที่อับอากาศ",28.0,16.0],["height","งานบนที่สูง > 1.8 m.",49.8,16.0],["excavation","งานขุด",70.0,16.0],["radiation","งานที่เกี่ยวข้องกับรังสี",83.0,16.0],
["hot","Hot Work",8.0,18.25],["lifting","งานยก (Mobile Crane)",28.0,18.25],["electrical","งานไฟฟ้า",49.8,18.25],["other","อื่นๆ",70.0,18.25]
];
for(const [key,value,x,y] of checks){const el=document.createElement("input");el.type="radio";el.name="wp-permit-type";el.value=value;el.className="fr125-overlay-check";Object.assign(el.style,{left:x+"%",top:y+"%"});overlay.appendChild(el)}
const work=[["งานก่อสร้าง",15.3,30.15],["ระบบภายในอาคาร",44.3,30.15],["งานจัดการอาคาร",73.7,30.15],["งานซ่อมบำรุง",15.3,32.35],["Security",44.3,32.35],["อื่นๆ",73.7,32.35]];
for(const [value,x,y] of work){const el=document.createElement("input");el.type="radio";el.name="wp-work-type";el.value=value;el.className="fr125-overlay-check";Object.assign(el.style,{left:x+"%",top:y+"%"});overlay.appendChild(el)}
const docs=[["wp-jsa",8.5,44.55],["wp-supervisor-cert",44.7,44.55],["wp-personnel",8.5,46.85],["wp-risk-checklist",44.7,46.85],["wp-tools-list",8.5,49.15],["wp-sds",44.7,49.15]];
for(const [id,x,y] of docs){const el=document.createElement("input");el.id=id;el.type="checkbox";el.className="fr125-overlay-check";Object.assign(el.style,{left:x+"%",top:y+"%"});overlay.appendChild(el)}
function radio(name){return document.querySelector('input[name="'+name+'"]:checked')?.value||""}
function val(id){return byId(id)?.value?.trim()||""}
function sync(){const pairs=[["wp-work-date","visit-date"],["wp-description","objective"],["wp-area","room"],["wp-requester-name","requester-name"],["wp-requester-phone","requester-phone"],["wp-requester-company","requester-company"],["wp-job-owner","host-name"],["wp-job-owner-phone","host-phone"]];for(const [a,b] of pairs){const A=byId(a),B=byId(b);if(A&&B)A.value=B.value||""}}
function syncAttendees(attendees=[]){const cars=[...new Set(attendees.map(x=>String(x.car_license||"").trim()).filter(Boolean))].slice(0,4);const el=byId("wp-car-license");if(el)el.value=cars.join(" / ");}
["visit-date","objective","room","requester-name","requester-phone","requester-company","host-name","host-phone"].forEach(id=>byId(id)?.addEventListener("change",sync));document.querySelector("#work-area-picker")?.addEventListener("change",()=>setTimeout(sync,0));sync();
async function runNumber(){const btn=byId("wp-run-number"),status=byId("wp-number-status");if(workPermitNo)return workPermitNo;btn.disabled=true;status.textContent="กำลังรันเลข…";try{if(window.AccessApp?.demoMode){workPermitNo="WP-DEMO-"+Date.now().toString().slice(-6)}else{const client=await window.AccessApp.getClient();const {data,error}=await client.rpc("reserve_work_permit_no");if(error)throw error;workPermitNo=String(data||"")}no.value=workPermitNo;status.textContent=workPermitNo;return workPermitNo}catch(e){status.textContent="รันเลขไม่สำเร็จ";alert(e.message||"ไม่สามารถรันเลข Work Permit ได้");throw e}finally{btn.disabled=false}}
byId("wp-run-number")?.addEventListener("click",runNumber);
function collect(){sync();return {workPermitNo,startDate:val("wp-work-date"),endDate:byId("visit-end-date")?.value||"",startTime:val("wp-start-time"),endTime:val("wp-end-time"),permitType:radio("wp-permit-type"),workType:radio("wp-work-type"),description:val("wp-description"),equipment:val("wp-equipment"),area:val("wp-area"),carLicense:val("wp-car-license"),requester:val("wp-requester-name"),requesterPhone:val("wp-requester-phone"),requesterCompany:val("wp-requester-company"),jobOwner:val("wp-job-owner"),jobOwnerPhone:val("wp-job-owner-phone"),jobOwnerCompany:val("wp-job-owner-company"),contractor:val("wp-contractor-controller"),contractorPhone:val("wp-contractor-phone"),contractorCompany:val("wp-contractor-company"),docs:[["wp-jsa","JSA"],["wp-supervisor-cert","Cer. จป."],["wp-personnel","รายชื่อผู้ปฏิบัติงาน"],["wp-risk-checklist","แบบตรวจความปลอดภัยตามประเภทงานเสี่ยง"],["wp-tools-list","รายการเครื่องมือ/อุปกรณ์"],["wp-sds","SDS"]].filter(x=>byId(x[0])?.checked).map(x=>x[1]),ppe:[],tools:""}}
function valid(){if(!workPermitNo){alert("กรุณากด Run Work Permit No. ก่อน Submit");byId("wp-run-number")?.focus();return false}for(const id of ["wp-work-date","wp-start-time","wp-end-time","wp-description","wp-requester-name","wp-requester-company","wp-contractor-controller","wp-contractor-phone","wp-contractor-company"]){const x=byId(id);if(x&&!x.value){x.focus();alert("กรุณากรอกข้อมูล FR-125 ให้ครบ");return false}}if(!radio("wp-permit-type")||!radio("wp-work-type")){alert("กรุณาเลือก Permit Type และประเภทของงาน");return false}return true}
function preview(printNow=false){if(!valid())return;const w=window.open("./assets/FR-125-v03 Work Permit-1.pdf","_blank");if(printNow&&w)setTimeout(()=>w.print?.(),800)}
window.WorkPermitForm={collect,validate:valid,preview:()=>preview(false),print:()=>preview(true),runNumber,syncAttendees};
byId("wp-preview")?.addEventListener("click",()=>preview(false));byId("wp-print")?.addEventListener("click",()=>preview(true));
const st=document.createElement("style");st.textContent=`
.fr125-pdf-workspace{display:flex;flex-direction:column;align-items:center;gap:28px;padding:24px;background:#eef1f5;border-radius:12px;overflow:auto}.fr125-pdf-page{position:relative;width:min(100%,1040px);aspect-ratio:210/297;background:#fff;box-shadow:0 4px 18px #0002;margin:0 auto}.fr125-pdf-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:1;background:#fff}.fr125-pdf-overlay{z-index:2}.fr125-pdf-overlay{position:absolute;inset:0;pointer-events:none}.fr125-overlay-input,.fr125-overlay-check{position:absolute;z-index:3;pointer-events:auto}.fr125-overlay-input{border:0;border-bottom:1px solid #1d4ed8;background:rgba(255,255,210,.28);font-size:clamp(8px,1vw,12px);padding:0 2px;outline:none}.fr125-overlay-input:focus{background:#fff7b2;box-shadow:0 0 0 1px #1d4ed8}.fr125-overlay-check{width:1.15%;height:1.15%;margin:0;accent-color:#111}.fr125-pdf-overlay--locked{pointer-events:none}@media(max-width:700px){.fr125-pdf-workspace{align-items:flex-start;padding:10px}.fr125-pdf-page{width:900px;max-width:none}}@media print{.site-header,.hero,.panel:not(#work-permit-section),.wp-actions{display:none!important}.fr125-pdf-workspace{padding:0;background:#fff}.fr125-pdf-page{box-shadow:none;page-break-after:always;width:210mm;height:297mm}}`;document.head.appendChild(st);
})();