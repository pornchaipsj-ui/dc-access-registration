(() => {
  "use strict";
  const button=document.querySelector("#export-all-button"); if(!button)return;
  const {getClient,demoMode,loadScript,attendeeTypeLabel}=window.AccessApp;
  async function excel(){if(window.ExcelJS)return;await loadScript("https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js");if(!window.ExcelJS)throw new Error("โหลด ExcelJS ไม่สำเร็จ");}
  const tm=v=>v?String(v).slice(0,5):"";
  function dl(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
  async function run(){
    if(demoMode)throw new Error("Export All ใช้ได้เมื่อเชื่อม Supabase");
    button.disabled=true;const old=button.textContent;button.textContent="กำลังดึงข้อมูลทั้งหมด…";
    try{
      const client=await getClient();
      const [rq,dr]=await Promise.all([
        client.from("access_requests").select("*, attendees(*)").order("created_at",{ascending:true}),
        client.from("attendee_daily_records").select("*").order("record_date",{ascending:true})
      ]);
      if(rq.error)throw rq.error;if(dr.error)throw dr.error;
      const requests=rq.data||[],records=dr.data||[],am=new Map();
      requests.forEach(r=>(r.attendees||[]).forEach(a=>am.set(String(a.id),{a,r})));
      const rows=records.map(x=>{const z=am.get(String(x.attendee_id))||{},r=z.r||{},a=z.a||{};return {
        record_date:x.record_date,request_code:r.request_code,status:r.status,location:r.location,project_name:r.project_name,room:r.room,objective:r.objective,
        visit_date:r.visit_date,visit_end_date:r.visit_end_date,name:a.name,company:a.company,attendee_type:attendeeTypeLabel(a.attendee_type),mobile:a.mobile,email:a.email,
        card_type:a.card_type,identity_last4:a.identity_last4,car_license:a.car_license,tidc_card_no:x.tidc_card_no,entry_time:tm(x.entry_time),exit_time:tm(x.exit_time),
        card_exchange_time:tm(x.card_exchange_time),card_return_time:tm(x.card_return_time),requester_name:r.requester_name,requester_company:r.requester_company,
        requester_email:r.requester_email,requester_phone:r.requester_phone
      };});
      await excel();const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet("All Entry Exit Records",{views:[{state:"frozen",ySplit:1}]});
      const cols=[["Record Date","record_date"],["Request No.","request_code"],["Status","status"],["Location","location"],["Project","project_name"],["Room","room"],["Objective","objective"],["Work Start","visit_date"],["Work End","visit_end_date"],["Name","name"],["Company","company"],["Attendee Type","attendee_type"],["Mobile","mobile"],["Email","email"],["Card Type","card_type"],["ID Last 4","identity_last4"],["Car License","car_license"],["TIDC Card No.","tidc_card_no"],["Entry Time","entry_time"],["Exit Time","exit_time"],["Card Exchange","card_exchange_time"],["Card Return","card_return_time"],["Request By","requester_name"],["Requester Company","requester_company"],["Requester Email","requester_email"],["Requester Tel.","requester_phone"]];
      ws.columns=cols.map(([header,key])=>({header,key,width:20}));rows.forEach(x=>ws.addRow(x));ws.autoFilter={from:"A1",to:ws.getRow(1).getCell(cols.length).address};ws.getRow(1).font={bold:true};ws.eachRow(row=>row.alignment={vertical:"top",wrapText:true});
      const s=wb.addWorksheet("Summary");s.addRows([["Export","All Security Entry / Exit Records"],["From",rows[0]?.record_date||""],["To",rows.at(-1)?.record_date||""],["Total daily records",rows.length],["Total requests",requests.length]]);s.getColumn(1).width=24;s.getColumn(2).width=32;s.getColumn(1).font={bold:true};
      const b=await wb.xlsx.writeBuffer(),today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
      dl(new Blob([b],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),`Security_All_Records_${today}.xlsx`);
      if(!rows.length)alert("ไม่พบประวัติการเข้า-ออกในระบบ");
    }finally{button.disabled=false;button.textContent=old;}
  }
  button.addEventListener("click",()=>run().catch(e=>alert(e.message||"ไม่สามารถ Export ข้อมูลทั้งหมดได้")));
})();