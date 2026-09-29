(() => {
"use strict";
const workspace=document.querySelector("#fr125-pdf-workspace"); if(!workspace)return;
const $=s=>document.querySelector(s), byId=id=>document.getElementById(id);
const overlay=byId("fr125-overlay-page1");
const fields=[
["wp-work-date","date",27.2,16.0,18,2.3],["wp-start-time","time",48.0,16.0,15,2.3],["wp-end-time","time",69.3,16.0,15,2.3],
["wp-description","text",28.5,18.8,58,2.3],["wp-equipment","text",19.5,21.2,45,2.3],["wp-area","text",69.2,21.2,20,2.3],
["wp-car-license","text",25.5,29.5,61,2.3],["wp-requester-name","text",25.5,32.0,26,2.3],["wp-requester-phone","text",54.3,32.0,14,2.3],["wp-requester-company","text",71.0,32.0,16,2.3],
["wp-job-owner","text",28.0,34.2,24,2.3],["wp-job-owner-phone","text",54.3,34.2,14,2.3],["wp-job-owner-company","text",71.0,34.2,16,2.3],
["wp-contractor-controller","text",30.0,36.5,22,2.3],["wp-contractor-phone","text",54.3,36.5,14,2.3],["wp-contractor-company","text",71.0,36.5,16,2.3]
];
for(const [id,type,x,y,w,h] of fields){const el=document.createElement("input");el.id=id;el.type=type;el.className="fr125-overlay-input";Object.assign(el.style,{left:x+"%",top:y+"%",width:w+"%",height:h+"%"});overlay.appendChild(el)}
const checks=[
["general","งานทั่วไป",8.2,10.8],["confined","งานในพื้นที่อับอากาศ",28.0,10.8],["height","งานบนที่สูง > 1.8 m.",49.8,10.8],["excavation","งานขุด",70.0,10.8],["radiation","งานที่เกี่ยวข้องกับรังสี",83.0,10.8],
["hot","Hot Work",8.2,13.0],["lifting","งานยก (Mobile Crane)",28.0,13.0],["electrical","งานไฟฟ้า",49.8,13.0],["other","อื่นๆ",70.0,13.0]
];
for(const [key,value,x,y] of checks){const el=document.createElement("input");el.type="radio";el.name="wp-permit-type";el.value=value;el.className="fr125-overlay-check";Object.assign(el.style,{left:x+"%",top:y+"%"});overlay.appendChild(el)}
const work=[["งานก่อสร้าง",15.3,24.0],["ระบบภายในอาคาร",44.3,24.0],["งานจัดการอาคาร",73.7,24.0],["งานซ่อมบำรุง",15.3,26.2],["Security",44.3,26.2],["อื่นๆ",73.7,26.2]];
for(const [value,x,y] of work){const el=document.createElement("input");el.type="radio";el.name="wp-work-type";el.value=value;el.className="fr125-overlay-check";Object.assign(el.style,{left:x+"%",top:y+"%"});overlay.appendChild(el)}
const docs=[["wp-jsa",8.5,40.3],["wp-supervisor-cert",44.7,40.3],["wp-personnel",8.5,42.7],["wp-risk-checklist",44.7,42.7],["wp-tools-list",8.5,45.1],["wp-sds",44.7,45.1]];
for(const [id,x,y] of docs){const el=document.createElement("input");el.id=id;el.type="checkbox";el.className="fr125-overlay-check";Object.assign(el.style,{left:x+"%",top:y+"%"});overlay.appendChild(el)}
function radio(name){return document.querySelector('input[name="'+name+'"]:checked')?.value||""}
function val(id){return byId(id)?.value?.trim()||""}
function sync(){const pairs=[["wp-work-date","visit-date"],["wp-description","objective"],["wp-area","room"],["wp-requester-name","requester-name"],["wp-requester-phone","requester-phone"],["wp-requester-company","requester-company"],["wp-job-owner","host-name"],["wp-job-owner-phone","host-phone"]];for(const [a,b] of pairs){const A=byId(a),B=byId(b);if(A&&B&&!A.value)A.value=B.value||""}}
["visit-date","objective","room","requester-name","requester-phone","requester-company","host-name","host-phone"].forEach(id=>byId(id)?.addEventListener("change",sync));document.querySelector("#work-area-picker")?.addEventListener("change",()=>setTimeout(sync,0));sync();
function collect(){sync();return {startDate:val("wp-work-date"),endDate:byId("visit-end-date")?.value||"",startTime:val("wp-start-time"),endTime:val("wp-end-time"),permitType:radio("wp-permit-type"),workType:radio("wp-work-type"),description:val("wp-description"),equipment:val("wp-equipment"),area:val("wp-area"),carLicense:val("wp-car-license"),requester:val("wp-requester-name"),requesterPhone:val("wp-requester-phone"),requesterCompany:val("wp-requester-company"),jobOwner:val("wp-job-owner"),jobOwnerPhone:val("wp-job-owner-phone"),jobOwnerCompany:val("wp-job-owner-company"),contractor:val("wp-contractor-controller"),contractorPhone:val("wp-contractor-phone"),contractorCompany:val("wp-contractor-company"),docs:[["wp-jsa","JSA"],["wp-supervisor-cert","Cer. จป."],["wp-personnel","รายชื่อผู้ปฏิบัติงาน"],["wp-risk-checklist","แบบตรวจความปลอดภัยตามประเภทงานเสี่ยง"],["wp-tools-list","รายการเครื่องมือ/อุปกรณ์"],["wp-sds","SDS"]].filter(x=>byId(x[0])?.checked).map(x=>x[1]),ppe:[],tools:""}}
function valid(){for(const id of ["wp-work-date","wp-start-time","wp-end-time","wp-description","wp-requester-name","wp-requester-company","wp-contractor-controller","wp-contractor-phone","wp-contractor-company"]){const x=byId(id);if(x&&!x.value){x.focus();alert("กรุณากรอกข้อมูล FR-125 ให้ครบ");return false}}if(!radio("wp-permit-type")||!radio("wp-work-type")){alert("กรุณาเลือก Permit Type และประเภทของงาน");return false}return true}
function preview(printNow=false){if(!valid())return;const w=window.open("./assets/FR-125-v03 Work Permit-1.pdf","_blank");if(printNow&&w)setTimeout(()=>w.print?.(),800)}
window.WorkPermitForm={collect,validate:valid,preview:()=>preview(false),print:()=>preview(true)};
byId("wp-preview")?.addEventListener("click",()=>preview(false));byId("wp-print")?.addEventListener("click",()=>preview(true));
const st=document.createElement("style");st.textContent=`
.fr125-pdf-workspace{display:flex;flex-direction:column;align-items:center;gap:28px;padding:24px;background:#eef1f5;border-radius:12px;overflow:auto}.fr125-pdf-page{position:relative;width:min(100%,1040px);aspect-ratio:210/297;background:#fff;box-shadow:0 4px 18px #0002;margin:0 auto}.fr125-pdf-object{position:absolute;inset:0;width:100%;height:100%;border:0}.fr125-pdf-overlay{position:absolute;inset:0;pointer-events:none}.fr125-overlay-input,.fr125-overlay-check{position:absolute;z-index:3;pointer-events:auto}.fr125-overlay-input{border:0;border-bottom:1px solid #1d4ed8;background:rgba(255,255,210,.55);font-size:clamp(8px,1vw,12px);padding:0 2px;outline:none}.fr125-overlay-input:focus{background:#fff7b2;box-shadow:0 0 0 1px #1d4ed8}.fr125-overlay-check{width:1.45%;height:1.45%;margin:0;accent-color:#111}.fr125-pdf-overlay--locked{pointer-events:none}@media(max-width:700px){.fr125-pdf-workspace{align-items:flex-start;padding:10px}.fr125-pdf-page{width:900px;max-width:none}}@media print{.site-header,.hero,.panel:not(#work-permit-section),.wp-actions{display:none!important}.fr125-pdf-workspace{padding:0;background:#fff}.fr125-pdf-page{box-shadow:none;page-break-after:always;width:210mm;height:297mm}}`;document.head.appendChild(st);
})();