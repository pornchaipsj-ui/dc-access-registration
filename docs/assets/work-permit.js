(() => {
"use strict";
const byId=id=>document.getElementById(id), val=id=>byId(id)?.value?.trim()||"";
if(!byId("work-permit-section")) return;
let workPermitNo="", attendees=[];
function setText(id,v){const e=byId(id);if(e)e.textContent=v||"-"}
function sync(){
  setText("wp-auto-date",val("visit-date"));
  setText("wp-auto-area",val("room"));
  setText("wp-auto-requester",[val("requester-name"),val("requester-company")].filter(Boolean).join(" / "));
}
["visit-date","room","requester-name","requester-company","objective","host-name","host-phone"].forEach(id=>byId(id)?.addEventListener("input",sync));
document.querySelector("#work-area-picker")?.addEventListener("change",()=>setTimeout(sync,0)); sync();
function syncAttendees(list=[]){attendees=list}
async function runNumber(){
  if(workPermitNo)return workPermitNo;
  const btn=byId("wp-run-number"); btn.disabled=true; btn.textContent="กำลังรันเลข…";
  try{
    if(window.AccessApp?.demoMode) workPermitNo="WP-DEMO-"+Date.now().toString().slice(-6);
    else{
      const client=await window.AccessApp.getClient();
      const {data,error}=await client.rpc("reserve_work_permit_no");
      if(error)throw error; workPermitNo=String(data||"");
    }
    setText("wp-number-display",workPermitNo); btn.textContent=workPermitNo; return workPermitNo;
  }catch(e){btn.textContent="Run Work Permit No. / รันเลข Work Permit";alert(e.message||"ไม่สามารถรันเลข Work Permit ได้");throw e}
  finally{btn.disabled=false}
}
function collect(){
  sync();
  const cars=[...new Set(attendees.map(x=>String(x.car_license||"").trim()).filter(Boolean))].slice(0,4);
  return {
    workPermitNo,
    startDate:val("visit-date"), endDate:val("visit-end-date"),
    startTime:val("wp-start-time"), endTime:val("wp-end-time"),
    permitType:val("wp-permit-type"), workType:val("wp-work-type"),
    description:val("objective"), equipment:val("wp-equipment"), area:val("room"),
    carLicense:cars.join(" / "),
    requester:val("requester-name"), requesterPhone:val("requester-phone"), requesterCompany:val("requester-company"),
    jobOwner:val("host-name"), jobOwnerPhone:val("host-phone"),
    contractor:val("wp-contractor-controller"), contractorPhone:val("wp-contractor-phone"),
    contractorCompany:val("wp-contractor-company"), contractorDepartment:val("wp-contractor-department"),
    docs:[["wp-jsa","JSA"],["wp-supervisor-cert","Cer. จป."],["wp-personnel","รายชื่อผู้ปฏิบัติงาน"],["wp-risk-checklist","แบบตรวจความปลอดภัยตามประเภทงานเสี่ยง"],["wp-tools-list","รายการเครื่องมือ/อุปกรณ์"],["wp-sds","SDS"]].filter(x=>byId(x[0])?.checked).map(x=>x[1])
  };
}
function validate(){
  if(!workPermitNo){alert("กรุณากด Run Work Permit No. ก่อน Submit");byId("wp-run-number")?.focus();return false}
  for(const id of ["wp-permit-type","wp-work-type","wp-start-time","wp-end-time","wp-contractor-controller","wp-contractor-phone","wp-contractor-company"]){
    if(!val(id)){byId(id)?.focus();alert("กรุณากรอกข้อมูล Work Permit ให้ครบ");return false}
  }
  return true;
}
byId("wp-run-number")?.addEventListener("click",runNumber);
async function previewFilledPdf(){
  const popup=window.open("","_blank");
  try{
    if(!window.PDFLib) throw new Error("PDF library not loaded");
    const data=collect();
    const url=new URL("./assets/FR-125-v03%20Work%20Permit-1.pdf",window.location.href).href;
    const bytes=await fetch(url).then(r=>{if(!r.ok)throw new Error("โหลด FR-125 ไม่สำเร็จ");return r.arrayBuffer()});
    const pdf=await PDFLib.PDFDocument.load(bytes), page=pdf.getPages()[0];

    // Coordinates below are PDF points measured from the original A4 FR-125 (595 x 842 pt).
    // They are independent of browser zoom, screen size and PDF viewer scaling.
    const F={
      workPermitNo:[405,778,115], writtenDate:[405,765,115],
      workDate:[88,686,105], startTime:[257,686,75], endTime:[389,686,75],
      description:[96,672,390], equipment:[84,658,235], area:[327,658,145],
      carLicense:[103,609,290],
      requester:[102,594,105], requesterPhone:[230,594,70], requesterCompany:[304,594,90],
      jobOwner:[102,579,105], jobOwnerPhone:[230,579,70],
      contractor:[102,564,105], contractorPhone:[230,564,70], contractorCompany:[304,564,90]
    };
    const CHECK={
      permit:{
        "งานทั่วไป":[64,730],"งานในพื้นที่อับอากาศ":[170,730],"งานบนที่สูง > 1.8 m.":[278,730],
        "งานขุด":[384,730],"งานที่เกี่ยวข้องกับรังสี":[491,730],
        "Hot Work":[64,714],"งานยก (Mobile Crane)":[170,714],"งานไฟฟ้า":[278,714],"อื่นๆ":[384,714]
      },
      work:{
        "งานก่อสร้าง":[96,640],"ระบบภายในอาคาร":[258,640],"งานจัดการอาคาร":[420,640],
        "งานซ่อมบำรุง":[96,624],"Security":[258,624],"อื่นๆ":[420,624]
      },
      docs:{
        "JSA":[43,529],"Cer. จป.":[258,529],"รายชื่อผู้ปฏิบัติงาน":[43,513],
        "แบบตรวจความปลอดภัยตามประเภทงานเสี่ยง":[258,513],"รายการเครื่องมือ/อุปกรณ์":[43,497],"SDS":[258,497]
      }
    };
    const raster=async(value,maxWidth,fontPx=24)=>{
      value=String(value||"").trim(); if(!value)return null;
      const c=document.createElement("canvas"),ctx=c.getContext("2d");
      const dpr=2; ctx.font=`${fontPx}px "Noto Sans Thai","Tahoma","Arial",sans-serif`;
      const natural=Math.ceil(ctx.measureText(value).width)+12;
      c.width=Math.max(20,natural*dpr); c.height=(fontPx+12)*dpr;
      ctx.scale(dpr,dpr); ctx.font=`${fontPx}px "Noto Sans Thai","Tahoma","Arial",sans-serif`;
      ctx.fillStyle="#000";ctx.textBaseline="top";ctx.fillText(value,3,2);
      const img=await pdf.embedPng(c.toDataURL("image/png"));
      const targetH=8.5, naturalW=(c.width/dpr)*(targetH/(fontPx+12));
      return {img,w:Math.min(maxWidth,naturalW),h:targetH};
    };
    const put=async(value,key)=>{
      const [x,y,mw]=F[key],r=await raster(value,mw); if(!r)return;
      page.drawImage(r.img,{x,y:y-r.h+2,width:r.w,height:r.h});
    };
    const cross=([x,y])=>{
      page.drawLine({start:{x:x+1,y:y+1},end:{x:x+7,y:y+7},thickness:0.9});
      page.drawLine({start:{x:x+7,y:y+1},end:{x:x+1,y:y+7},thickness:0.9});
    };
    const today=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Bangkok",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date());
    await put(data.workPermitNo,"workPermitNo"); await put(today,"writtenDate");
    await put(data.startDate,"workDate"); await put(data.startTime,"startTime"); await put(data.endTime,"endTime");
    await put(data.description,"description"); await put(data.equipment,"equipment"); await put(data.area,"area");
    await put(data.carLicense,"carLicense");
    await put(data.requester,"requester"); await put(data.requesterPhone,"requesterPhone"); await put(data.requesterCompany,"requesterCompany");
    await put(data.jobOwner,"jobOwner"); await put(data.jobOwnerPhone,"jobOwnerPhone");
    await put(data.contractor,"contractor"); await put(data.contractorPhone,"contractorPhone"); await put(data.contractorCompany,"contractorCompany");
    if(CHECK.permit[data.permitType])cross(CHECK.permit[data.permitType]);
    if(CHECK.work[data.workType])cross(CHECK.work[data.workType]);
    data.docs.forEach(d=>{if(CHECK.docs[d])cross(CHECK.docs[d])});

    const out=await pdf.save(),blob=new Blob([out],{type:"application/pdf"}),blobUrl=URL.createObjectURL(blob);
    if(popup)popup.location.href=blobUrl; else window.location.href=blobUrl;
    setTimeout(()=>URL.revokeObjectURL(blobUrl),120000);
  }catch(e){if(popup)popup.close();alert(e.message||"สร้าง Preview FR-125 ไม่สำเร็จ")}
}
byId("wp-preview")?.addEventListener("click",previewFilledPdf);
const st=document.createElement("style");st.textContent=`
.wp-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0 0 18px}.wp-summary>div{padding:12px;border:1px solid #dbe3ec;border-radius:10px;background:#f8fafc}.wp-summary small{display:block;color:#64748b;margin-bottom:4px}.wp-summary strong{word-break:break-word}.wp-subsection{border-top:1px solid #e5e7eb;padding-top:12px}.wp-subsection h3{margin:0 0 10px}.wp-checks{display:flex;flex-wrap:wrap;gap:10px 22px;border:1px solid #dbe3ec;border-radius:10px;padding:14px}.wp-checks label{display:flex;align-items:center;gap:7px}.form-hint{color:#64748b;font-size:.9rem;margin-top:10px}@media(max-width:760px){.wp-summary{grid-template-columns:1fr 1fr}}`;document.head.appendChild(st);
window.WorkPermitForm={collect,validate,runNumber,syncAttendees};
})();