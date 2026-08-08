"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type EvidenceFile = { id:string; file_name:string; bank:string; period:string; statement_from:string|null; statement_to:string|null; content_type:string; size_bytes:number; status:string; source:string; processing_status?:string; processed_at?:string|null; detected_transactions?:number; page_count?:number; uploaded_at:string };

const size = (n:number) => n ? n < 1024*1024 ? `${(n/1024).toFixed(1)} KB` : `${(n/1024/1024).toFixed(1)} MB` : "ไฟล์ต้นฉบับเดิม";
const defaultPassword:Record<string,string>={KBANK:"/00023",KTB:"0503508000023"};
const thaiDate=(value:string|null)=>value?new Date(`${value}T00:00:00+07:00`).toLocaleDateString("th-TH",{day:"numeric",month:"short",year:"numeric"}):"ไม่ระบุ";
const thaiDateTime=(value:string)=>new Date(value.includes("T")?value:`${value.replace(" ","T")}Z`).toLocaleString("th-TH",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});

export default function FileLibrary() {
  const [files,setFiles]=useState<EvidenceFile[]>([]);
  const [loading,setLoading]=useState(true);
  const [uploading,setUploading]=useState(false);
  const [message,setMessage]=useState("");
  const [query,setQuery]=useState("");
  const [bank,setBank]=useState("KBANK");
  const [pdfPassword,setPdfPassword]=useState("/00023");
  const [passwordState,setPasswordState]=useState<"idle"|"checking"|"ready"|"error">("idle");
  const load=()=>fetch("/api/files").then(r=>r.json()).then(x=>{if(x.error)throw new Error(x.error);setFiles(x.files);setLoading(false)}).catch(e=>{setMessage(e.message);setLoading(false)});
  useEffect(()=>{load()},[]);
  const shown=useMemo(()=>files.filter(f=>`${f.file_name} ${f.bank} ${f.period} ${f.status}`.toLowerCase().includes(query.toLowerCase())),[files,query]);
  async function verifyBankPdf(file:File){
    if(!/\.pdf$/i.test(file.name))return {verified:true,text:"",pageCount:0};
    setPasswordState("checking");
    try{
      const pdfjs=await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc=new URL("pdfjs-dist/build/pdf.worker.min.mjs",import.meta.url).toString();
      const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),password:defaultPassword[bank]?pdfPassword:undefined});
      const pdf=await task.promise;const pages:string[]=[];
      for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){const page=await pdf.getPage(pageNo),content=await page.getTextContent();pages.push(content.items.map(item=>"str" in item?item.str:"").join(" "))}
      await task.destroy();
      setPasswordState("ready");
      return {verified:true,text:pages.join("\n").slice(0,1_000_000),pageCount:pdf.numPages};
    }catch{
      setPasswordState("error");
      setMessage(`เปิด PDF ไม่สำเร็จ กรุณาตรวจรหัสผ่าน ${bank}`);
      return {verified:false,text:"",pageCount:0};
    }
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    const selectedFile=form.get("file");
    if(!(selectedFile instanceof File)||selectedFile.size===0){setMessage("กรุณาเลือกไฟล์");return}
    setUploading(true);
    setMessage("");
    try{
      const parsed=await verifyBankPdf(selectedFile);if(!parsed.verified)return;
      form.set("password_verified",defaultPassword[bank]&&/\.pdf$/i.test(selectedFile.name)?"true":"false");
      form.set("extracted_text",parsed.text);form.set("page_count",String(parsed.pageCount));
      const response=await fetch("/api/files",{method:"POST",body:form});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"อัปโหลดไม่สำเร็จ");
      formElement.reset();
      setMessage(`อัปโหลดสำเร็จ · ${result.processingStatus||"บันทึกในคลังหลักฐานแล้ว"}`);
      await load();
    }catch(error){
      setMessage(error instanceof Error?error.message:"อัปโหลดไม่สำเร็จ กรุณาลองใหม่");
    }finally{
      setUploading(false);
    }
  }
  return <main className="filesApp">
    <header><Link href="/">← กลับ Dashboard</Link><div><p>EVIDENCE DATABASE</p><h1>คลังไฟล์และอัปโหลดหลักฐาน</h1><span>เก็บไฟล์ต้นทางพร้อมสถานะ เพื่อให้ตรวจสอบย้อนหลังได้</span></div><b>{files.length} ไฟล์</b></header>
    <section className="filesGrid"><form className="uploadCard" onSubmit={submit}><div><p>UPLOAD NEW FILE</p><h2>เพิ่มไฟล์รายการเดินบัญชี</h2></div><label className="dropZone"><input name="file" type="file" accept=".pdf,.xls,.xlsx,.csv" required onChange={()=>{setPasswordState("idle");setMessage("")}}/><b>เลือกไฟล์ PDF / Excel / CSV</b><span>ระบบออนไลน์รองรับขนาดไม่เกิน 4 MB ต่อไฟล์</span></label><div className="uploadFields"><label>ธนาคาร<select name="bank" value={bank} onChange={e=>{const next=e.target.value;setBank(next);setPdfPassword(defaultPassword[next]||"");setPasswordState("idle")}}><option>KBANK</option><option>BBL</option><option>KTB</option><option value="OTHER">อื่น ๆ</option></select></label><label>ข้อมูลตั้งแต่วันที่<input name="statement_from" type="date" required/></label><label>ข้อมูลถึงวันที่<input name="statement_to" type="date" required/></label></div>{defaultPassword[bank]&&<label className="passwordField">รหัสเปิด PDF {bank}<input type="password" value={pdfPassword} onChange={e=>{setPdfPassword(e.target.value);setPasswordState("idle")}} autoComplete="off"/><span className={passwordState}>{passwordState==="checking"?"กำลังทดลองเปิดไฟล์…":passwordState==="ready"?`✓ เปิดไฟล์ ${bank} ด้วยรหัสอัตโนมัติสำเร็จ`:passwordState==="error"?"รหัสไม่ถูกต้อง":"ระบบจะทดลองเปิดไฟล์ก่อนอัปโหลด"}</span></label>}<button disabled={uploading||passwordState==="checking"}>{uploading?"กำลังตรวจและอัปโหลด…":"ตรวจรหัสและอัปโหลด"}</button>{message&&<p className="uploadMessage">{message}</p>}<small>รหัสผ่านใช้ตรวจไฟล์ในเครื่องของคุณเท่านั้น และไม่ถูกบันทึกลงฐานข้อมูล</small></form>
    <article className="libraryCard"><div className="libraryHead"><div><p>FILE REGISTER</p><h2>ทะเบียนไฟล์หลักฐาน</h2></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหาชื่อไฟล์หรือธนาคาร"/></div>{loading?<div className="empty">กำลังอ่านฐานข้อมูล…</div>:<div className="fileRows">{shown.map(f=><div className="fileRow" key={f.id}><span className={`fileIcon ${f.content_type.includes("pdf")?"pdf":"xls"}`}>{f.content_type.includes("pdf")?"PDF":"XLS"}</span><div className="fileName"><b>{f.file_name}</b><small>ข้อมูลในไฟล์: {thaiDate(f.statement_from)} ถึง {thaiDate(f.statement_to)}</small><small>{size(f.size_bytes)} · {f.page_count?`${f.page_count} หน้า · `:""}{f.detected_transactions?`ตรวจพบประมาณ ${f.detected_transactions} รายการ`:""}</small><small className="processLine">{f.processing_status||"รอประมวลผล"}</small></div><strong>{f.bank}</strong><span className={f.status==="นำเข้ารายงานแล้ว"||f.status==="อ่านไฟล์แล้ว-รอตรวจยอด"?"done":"pending"}>{f.status}</span><time><b>อัปโหลดเมื่อ</b>{thaiDateTime(f.uploaded_at)}</time></div>)}</div>}</article></section>
    <footer>ฐานข้อมูลเก็บรายละเอียดไฟล์ · พื้นที่จัดเก็บเก็บไฟล์ต้นฉบับ · รองรับการตรวจสอบย้อนหลัง</footer>
  </main>
}
