"use client";

import { useEffect, useMemo, useState } from "react";
import "./main-v2.css";
import "./dashboard-overrides.css";

type Bank = { bank:string; account:string; opening:number; incoming:number; outgoing:number; ending:number; tax:number; transactions:number; months:{label:string;incoming:number;outgoing:number;ending:number}[] };
type Txn = { bank:string; date:string; time:string; direction:"in"|"out"; amount:number; description:string };
type Data = { meta:{entity:string;period:string;generated:string}; banks:Bank[]; combined:{label:string;incoming:number;outgoing:number;net:number;ending:number}[]; totals:{opening:number;incoming:number;outgoing:number;ending:number;tax:number;internal:number;cash:number}; internalTransfers:{date:string;time:string;from:string;to:string;amount:number}[]; cashWithdrawals:{date:string;day:string;time:string;reference:string;amount:number}[]; personTransfers:{date:string;bank:string;direction:"in"|"out";amount:number;counterparty:string;detail:string}[]; alerts:{level:string;title:string;detail:string;action:string}[]; quality:{label:string;status:string;detail:string}[]; transactions:Txn[] };
type OutgoingGroup = { bank:string; name:string; category:string; amount:number; count:number; months:Record<string,{amount:number;count:number}>; identified:boolean };

const fmt=(n:number)=>new Intl.NumberFormat("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const short=(n:number)=>`${(Math.abs(n)/1e6).toFixed(2)} ลบ.`;
const bankColor:Record<string,string>={KBANK:"#239a60",BBL:"#254aa5",KTB:"#0aa8d6"};
const monthNames:Record<string,string>={"01":"ม.ค.","02":"ก.พ.","03":"มี.ค.","04":"เม.ย.","05":"พ.ค.","06":"มิ.ย.","07":"ก.ค."};

function outgoingIdentity(t:Txn){
  const d=t.description.replace(/\+\+$/g,"").trim();
  if(t.bank==="KBANK"){
    if(d.includes("สาขาถนนท่าแพ"))return {name:"ถอนเงินสดผ่านสาขา",category:"ถอนเงินสด",identified:false};
    let name=d.replace(/^K BIZ (?:โอนไป|เพื่อชำระ)\s*/i,"").replace(/^(?:KBANK|BBL|KTB|SCB|SCBT|UOBT|BAY|TTB)\s+/i,"").replace(/^(?:Ref\s+)?X\d+\s*/i,"").trim();
    if(name&&name!==d){
      const internal=/แสงชัยพาณิช/i.test(name);
      const person=/^(?:นาย|นาง|น\.ส\.|นางสาว)|Pongsak|Somchai/i.test(name);
      return {name,category:internal?"โอนภายใน":person?"บุคคล":"คู่ค้า/บริษัท",identified:true};
    }
  }
  if(t.bank==="BBL"){
    const rules:[RegExp,string,string][]=[[/^Payroll/i,"เงินเดือน (ไม่ระบุรายชื่อ)","เงินเดือน"],[/^PAYMENT ON GOODS/i,"ชำระค่าสินค้า (ไม่ระบุคู่ค้า)","คู่ค้า/สินค้า"],[/^BAHTNET/i,"โอน BAHTNET (ไม่ระบุผู้รับ)","โอนเงิน"],[/^AMOUNT/i,"โอนบัญชี (ไม่ระบุผู้รับ)","โอนเงิน"],[/^ELECTRIC/i,"ค่าไฟฟ้า","สาธารณูปโภค"],[/^COM\.|^Fees|^Service Fee|^STAMP/i,"ค่าธรรมเนียมธนาคาร","ค่าธรรมเนียม"],[/^TAXES/i,"ภาษี","ภาษี"],[/^SMART/i,"ถอน/โอน SMART ผ่านสาขา","ถอน/โอนผ่านสาขา"]];
    const found=rules.find(([re])=>re.test(d)); if(found)return {name:found[1],category:found[2],identified:false};
  }
  if(t.bank==="KTB"){
    let name="";
    const transfer=d.match(/(?:TR to)\s+\d+\s+(.+?)(?=\s+(?:20\d{12,}|[\d,]+\.\d{2}\s+0\.00|Krungthai|KTB netbank|-$))/i);
    if(transfer)name=transfer[1].trim();
    if(!name){
      const cleaned=d.replace(/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s+/,"").replace(/^(?:PORPSW|PMOPSW|PMOWSW|PBSWP|PBSWT|PBPSWP|NMPSWP)\s+/i,"").replace(/^\S+\s+\S+\s+/,"");
      name=cleaned.split(/\s+(?:20\d{12,}|[\d,]+\.\d{2}\s+0\.00|Krungthai|KTB netbank|-)\b/i)[0].trim();
    }
    if(name&&name.length>2){
      const internal=/Sangchai Phanich/i.test(name), person=!/(?:CO\.|LTD|PCL|บริษัท|บจก|บมจ|หจก|Marketing|Rubber|Motul|GASKET|AIA|WUERTH|Municipality|DEPARTMENT)/i.test(name);
      return {name,category:internal?"โอนภายใน":person?"บุคคล":"คู่ค้า/บริษัท",identified:true};
    }
  }
  return {name:"ไม่ระบุชื่อผู้รับใน Statement",category:"รอตรวจเอกสาร",identified:false};
}

function incomingIdentity(t:Txn){
  const d=t.description.replace(/\+\+$/g,"").trim();
  if(t.bank==="KBANK"){
    if(/EDC\/K SHOP\/MYQR|401014604133001 SANGCHAI/i.test(d))return {name:"ยอดขาย EDC / QR แสงชัยพาณิชย์",category:"EDC / QR",identified:false};
    if(d.includes("สาขาถนนท่าแพ"))return {name:"ฝากเงินผ่านสาขาถนนท่าแพ",category:"ฝากเงินสด/เช็ค",identified:false};
    let name=d.split(/\sจาก\s/i).slice(1).join(" จาก ").replace(/^(?:KBANK|BBL|KTB|SCB|SCBT|UOBT|BAY|TTB|SMART BBL)\s+/i,"").replace(/^X\d+\s*/i,"").trim();
    if(name){const internal=/SANGCHAI|แสงชัยพาณิช/i.test(name),person=/^(?:นาย|นาง|น\.ส\.|นางสาว|MR\.|MS\.|MRS\.)/i.test(name);return {name,category:internal?"โอนภายใน":person?"บุคคล":"ลูกค้า/บริษัท",identified:true}}
  }
  if(t.bank==="BBL"){
    if(/^TRF FR OTH BK/i.test(d))return {name:"โอนจากต่างธนาคาร (ไม่ระบุชื่อ)",category:"โอนเข้า",identified:false};
    if(/^Bill Deposit/i.test(d))return {name:"Bill Deposit (ไม่ระบุชื่อ)",category:"รับชำระบิล",identified:false};
    if(/^AMOUNT/i.test(d))return {name:"โอนเข้าบัญชี (ไม่ระบุชื่อ)",category:"โอนเข้า",identified:false};
    if(/Cash Deposit|CASH DEP/i.test(d))return {name:"ฝากเงินสด (ไม่ระบุผู้นำฝาก)",category:"ฝากเงินสด",identified:false};
    return {name:"เงินเข้า BBL ไม่ระบุผู้ส่ง",category:"รอตรวจเอกสาร",identified:false};
  }
  if(t.bank==="KTB"){
    const mobile=d.match(/MORPSD\s+([\d-]+)/i); if(mobile)return {name:`บัญชีต่างธนาคาร ${mobile[1]}`,category:"Mobile Banking",identified:true};
    if(/NMPSDP/i.test(d))return {name:"รับชำระผ่าน KTB Netbank",category:"รับชำระ/ฝาก",identified:false};
    if(/SDCK/i.test(d))return {name:"เช็ครับฝาก SDCK",category:"ฝากเช็ค",identified:false};
    if(/SDCH/i.test(d))return {name:"เช็ครับฝาก SDCH",category:"ฝากเช็ค",identified:false};
  }
  return {name:"ไม่ระบุชื่อผู้ส่งใน Statement",category:"รอตรวจเอกสาร",identified:false};
}

export default function Home(){
  const [data,setData]=useState<Data|null>(null);
  const [view,setView]=useState<"overview"|"incoming"|"outgoing"|"transactions"|"audit">("overview");
  const [bank,setBank]=useState("all");
  const [month,setMonth]=useState("all");
  const [direction,setDirection]=useState("all");
  const [query,setQuery]=useState("");
  const [page,setPage]=useState(1);
  const [selectedBank,setSelectedBank]=useState("all");
  const [outgoingBank,setOutgoingBank]=useState("all");
  const [outgoingRecipientPage,setOutgoingRecipientPage]=useState(1);
  const [incomingBank,setIncomingBank]=useState("all");
  const [refreshState,setRefreshState]=useState<"idle"|"loading"|"done"|"error">("idle");
  const [updatedAt,setUpdatedAt]=useState("");
  const [notice,setNotice]=useState("");
  async function refreshDashboard(manual=false){
    setRefreshState("loading");
    try{
      const response=await fetch(`/dashboard-data.json?v=${Date.now()}`,{cache:"no-store"});
      if(!response.ok)throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const next=await response.json() as Data;
      setData(next);
      setUpdatedAt(new Date().toLocaleString("th-TH",{dateStyle:"short",timeStyle:"short"}));
      setRefreshState("done");
      if(manual){setNotice("อัปเดตข้อมูล Dashboard เรียบร้อยแล้ว");window.setTimeout(()=>setNotice(""),3500)}
    }catch{
      setRefreshState("error");
      if(manual){setNotice("อัปเดตไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");window.setTimeout(()=>setNotice(""),4500)}
    }
  }
  // Load the latest published dashboard snapshot on first render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{void refreshDashboard(false)},[]);
  // Reset pagination whenever the active transaction query changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>setPage(1),[bank,month,direction,query]);
  const rows=useMemo(()=>data?.transactions.filter(t=>(bank==="all"||t.bank===bank)&&(direction==="all"||t.direction===direction)&&(month==="all"||t.date.slice(5,7)===month)&&(!query||`${t.date} ${t.time} ${t.description} ${t.amount}`.toLowerCase().includes(query.toLowerCase())))??[],[data,bank,month,direction,query]);
  const outgoingAnalysis=useMemo(()=>{
    if(!data)return {groups:[] as OutgoingGroup[],total:0,count:0,identified:0,unidentifiedCount:0,monthly:[] as {month:string;amount:number;count:number;people:number}[]};
    const txns=data.transactions.filter(t=>t.direction==="out"&&(outgoingBank==="all"||t.bank===outgoingBank));
    const map=new Map<string,OutgoingGroup>();
    for(const t of txns){const identity=outgoingIdentity(t),key=`${t.bank}|${identity.name}`,month=t.date.slice(5,7);const g=map.get(key)||{bank:t.bank,name:identity.name,category:identity.category,amount:0,count:0,months:{},identified:identity.identified};g.amount+=t.amount;g.count++;g.months[month]??={amount:0,count:0};g.months[month].amount+=t.amount;g.months[month].count++;map.set(key,g)}
    const groups=[...map.values()].sort((a,b)=>b.amount-a.amount), monthly=Object.keys(monthNames).map(month=>{const monthRows=txns.filter(t=>t.date.slice(5,7)===month);return {month,amount:monthRows.reduce((s,t)=>s+t.amount,0),count:monthRows.length,people:new Set(monthRows.map(t=>{const x=outgoingIdentity(t);return x.identified?`${t.bank}|${x.name}`:""}).filter(Boolean)).size}});
    return {groups,total:txns.reduce((s,t)=>s+t.amount,0),count:txns.length,identified:new Set(groups.filter(g=>g.identified).map(g=>`${g.bank}|${g.name}`)).size,unidentifiedCount:groups.filter(g=>!g.identified).reduce((s,g)=>s+g.count,0),monthly};
  },[data,outgoingBank]);
  const incomingAnalysis=useMemo(()=>{
    if(!data)return {groups:[] as OutgoingGroup[],total:0,count:0,identified:0,unidentifiedCount:0,monthly:[] as {month:string;amount:number;count:number;people:number}[]};
    const txns=data.transactions.filter(t=>t.direction==="in"&&(incomingBank==="all"||t.bank===incomingBank));
    const map=new Map<string,OutgoingGroup>();
    for(const t of txns){const identity=incomingIdentity(t),key=`${t.bank}|${identity.name}`,month=t.date.slice(5,7);const g=map.get(key)||{bank:t.bank,name:identity.name,category:identity.category,amount:0,count:0,months:{},identified:identity.identified};g.amount+=t.amount;g.count++;g.months[month]??={amount:0,count:0};g.months[month].amount+=t.amount;g.months[month].count++;map.set(key,g)}
    const groups=[...map.values()].sort((a,b)=>b.amount-a.amount),monthly=Object.keys(monthNames).map(month=>{const monthRows=txns.filter(t=>t.date.slice(5,7)===month);return {month,amount:monthRows.reduce((s,t)=>s+t.amount,0),count:monthRows.length,people:new Set(monthRows.map(t=>{const x=incomingIdentity(t);return x.identified?`${t.bank}|${x.name}`:""}).filter(Boolean)).size}});
    return {groups,total:txns.reduce((s,t)=>s+t.amount,0),count:txns.length,identified:new Set(groups.filter(g=>g.identified).map(g=>`${g.bank}|${g.name}`)).size,unidentifiedCount:groups.filter(g=>!g.identified).reduce((s,g)=>s+g.count,0),monthly};
  },[data,incomingBank]);
  if(!data)return <main className="appLoading"><div className="loader"/><b>กำลังจัดเตรียม Dashboard…</b></main>;
  const t=data.totals, change=t.ending-t.opening, maxMonth=Math.max(...data.combined.flatMap(m=>[m.incoming,m.outgoing]));
  const comparedBanks=selectedBank==="all"?data.banks:data.banks.filter(b=>b.bank===selectedBank);
  const maxBankFlow=Math.max(...data.banks.flatMap(b=>[b.incoming,b.outgoing]));
  const pageSize=40,pages=Math.max(1,Math.ceil(rows.length/pageSize)),shown=rows.slice((page-1)*pageSize,page*pageSize);
  const recipientPageSize=50;
  const outgoingRecipientPages=Math.max(1,Math.ceil(outgoingAnalysis.groups.length/recipientPageSize));
  const outgoingRecipientStart=(outgoingRecipientPage-1)*recipientPageSize;
  const outgoingRecipientGroups=outgoingAnalysis.groups.slice(outgoingRecipientStart,outgoingRecipientStart+recipientPageSize);
  const selectOutgoingBank=(value:string)=>{setOutgoingBank(value);setOutgoingRecipientPage(1)};
  const nav=(key:typeof view,label:string,icon:string)=><button className={view===key?"active":""} onClick={()=>setView(key)}><i>{icon}</i><span>{label}</span></button>;
  return <main className="dashboardApp">
    <aside className="sideNav"><div className="sideBrand"><img src="/sangchai-logo.jpeg" alt="แสงชัยพาณิชย์"/><div><b>FINANCE</b><small>CONTROL CENTER</small></div></div><nav>{nav("overview","ภาพรวมผู้บริหาร","◫")}{nav("incoming","วิเคราะห์เงินขาเข้า","↙")}{nav("outgoing","วิเคราะห์เงินขาออก","↗")}{nav("transactions","ค้นหารายการ","⌕")}{nav("audit","ศูนย์ตรวจสอบ","✓")}<a href="/files"><i>⇧</i><span>คลังไฟล์</span></a></nav><div className="sideInfo"><span>รอบข้อมูล</span><b>ม.ค.–ก.ค. 2569</b><small>3 ธนาคาร · {data.transactions.length.toLocaleString("th-TH")} รายการ</small></div></aside>
    <section className="workspace"><header className="appHeader"><div><p>{data.meta.entity}</p><h1>{view==="overview"?"ภาพรวมการเงิน 3 ธนาคาร":view==="incoming"?"วิเคราะห์เงินขาเข้าและแหล่งที่มา":view==="outgoing"?"วิเคราะห์เงินขาออกและคู่ค้า":view==="transactions"?"ค้นหาและตรวจสอบรายการ":"ศูนย์ควบคุมและตรวจสอบข้อมูล"}</h1></div><div className="headerTools"><span className="health"><i/>ข้อมูลหลักกระทบยอดแล้ว</span><span className={`refreshStatus ${refreshState}`}>{refreshState==="loading"?"กำลังอัปเดต…":refreshState==="error"?"อัปเดตไม่สำเร็จ":updatedAt?`ล่าสุด ${updatedAt}`:"พร้อมอัปเดต"}</span><button className="refreshButton" disabled={refreshState==="loading"} onClick={()=>void refreshDashboard(true)}>↻ อัปเดตข้อมูล</button><a className="pdfDownload" href="/sangchai-finance-dashboard.pdf" download="รายงานสรุปการเงิน-3-ธนาคาร.pdf">↓ ดาวน์โหลด PDF</a></div></header>{notice&&<div className={`dashboardNotice ${refreshState==="error"?"error":""}`} role="status">{refreshState==="error"?"!":"✓"} {notice}</div>}

    {view==="overview"&&<><section className="summaryStrip"><article className="primaryKpi"><span>เงินคงเหลือรวม 31 ก.ค.</span><strong>฿{fmt(t.ending)}</strong><small>ต้นงวด ฿{fmt(t.opening)}</small></article><article><span>เงินเข้ารวม</span><strong className="blue">฿{short(t.incoming)}</strong><small>ยอดจริง {fmt(t.incoming)} บาท</small></article><article><span>เงินออกรวม</span><strong className="red">฿{short(t.outgoing)}</strong><small>ยอดจริง {fmt(t.outgoing)} บาท</small></article><article><span>ยอดคงเหลือเปลี่ยนแปลง</span><strong className="red">−฿{short(Math.abs(change))}</strong><small>ลดลง {Math.abs(change/t.opening*100).toFixed(2)}%</small></article></section>
    <section className="overviewGrid"><article className="surface chartSurface"><div className="sectionHead"><div><p>MONTHLY CASH MOVEMENT</p><h2>เงินเข้า–ออก และยอดคงเหลือรายเดือน</h2></div><div className="chartKey"><span><i className="in"/>เงินเข้า</span><span><i className="out"/>เงินออก</span></div></div><div className="monthBars">{data.combined.map(m=><div className="monthGroup" key={m.label}><div className="bars"><i className="incoming" style={{height:`${m.incoming/maxMonth*100}%`}} title={`เงินเข้า ${fmt(m.incoming)}`}/><i className="outgoing" style={{height:`${m.outgoing/maxMonth*100}%`}} title={`เงินออก ${fmt(m.outgoing)}`}/></div><b>{m.label}</b><span className={m.net>=0?"up":"down"}>{m.net>=0?"+":"−"}{short(Math.abs(m.net))}</span><small>เหลือ {short(m.ending)}</small></div>)}</div></article>
    <article className="surface attentionSurface"><div className="sectionHead"><div><p>MANAGEMENT ATTENTION</p><h2>รายการที่ควรดำเนินการ</h2></div><span className="alertCount">{data.alerts.length} เรื่อง</span></div><div className="alertList">{data.alerts.map((a,i)=><article key={a.title} className={a.level}><span>{i+1}</span><div><b>{a.title}</b><p>{a.detail}</p><small>ควรทำ: {a.action}</small></div></article>)}</div></article></section>
    <section className="surface bankSurface"><div className="sectionHead"><div><p>BANK POSITION</p><h2>กดเลือกธนาคารเพื่อดูเงินเข้า–ออก</h2></div><button className="compareAll" onClick={()=>setSelectedBank("all")}>เปรียบเทียบทั้ง 3 ธนาคาร</button></div><div className="bankCards">{data.banks.map(b=>{const delta=b.ending-b.opening;return <article className={selectedBank===b.bank?"selected":""} key={b.bank} style={{"--bank":bankColor[b.bank]} as React.CSSProperties} onClick={()=>setSelectedBank(b.bank)}><button className="bankSelect" aria-pressed={selectedBank===b.bank} onClick={()=>setSelectedBank(b.bank)}><div className="bankTitle"><i/><div><b>{b.bank}</b><small>{b.account}</small></div><em>{selectedBank===b.bank?"กำลังแสดง":"กดดูรายละเอียด"}</em></div><div className="bankBalance"><span>ปลายงวด</span><strong>฿{fmt(b.ending)}</strong></div><div className="bankStats"><span>ต้นงวด<b>{fmt(b.opening)}</b></span><span>เงินเข้า<b>{fmt(b.incoming)}</b></span><span>เงินออก<b>{fmt(b.outgoing)}</b></span></div><div className="bankDelta"><span>เปลี่ยนแปลง</span><b className="red">−฿{fmt(Math.abs(delta))}</b><small>ลดลง {Math.abs(delta/b.opening*100).toFixed(2)}%</small></div></button></article>})}</div>
    <div className="bankComparison"><div className="comparisonHead"><div><p>IN / OUT COMPARISON</p><h3>{selectedBank==="all"?"เปรียบเทียบเงินเข้า–ออกทั้ง 3 ธนาคาร":`รายละเอียดเงินเข้า–ออก ${selectedBank}`}</h3></div><div className="comparisonTabs"><button className={selectedBank==="all"?"active":""} onClick={()=>setSelectedBank("all")}>ทั้งหมด</button>{data.banks.map(b=><button className={selectedBank===b.bank?"active":""} key={b.bank} onClick={()=>setSelectedBank(b.bank)}>{b.bank}</button>)}</div></div><div className={`comparisonRows ${selectedBank!=="all"?"single":""}`}>{comparedBanks.map(b=>{const net=b.incoming-b.outgoing;return <article key={b.bank} style={{"--bank":bankColor[b.bank]} as React.CSSProperties}><header><span><i/>{b.bank}<small>{b.account}</small></span><strong className={net>=0?"up":"red"}>{net>=0?"+":"−"}฿{fmt(Math.abs(net))}</strong></header><div className="flowCompare"><div><span>เงินเข้า</span><b className="blue">฿{fmt(b.incoming)}</b><i><em style={{width:`${b.incoming/maxBankFlow*100}%`}}/></i></div><div><span>เงินออก</span><b className="red">฿{fmt(b.outgoing)}</b><i><em style={{width:`${b.outgoing/maxBankFlow*100}%`}}/></i></div></div><footer><span>ยอดปลายงวด <b>฿{fmt(b.ending)}</b></span><span>{b.transactions.toLocaleString("th-TH")} รายการ</span></footer></article>})}</div></div></section>
    <section className="controlGrid"><article className="surface internalCard"><div className="sectionHead"><div><p>INTERNAL TRANSFER</p><h2>การโยกเงินระหว่าง 3 บัญชี</h2></div><b>฿{fmt(t.internal)}</b></div><div className="route"><span>KTB</span><i>5 รายการ →</i><span>KBANK</span></div><p>จับคู่วันที่ เวลา จำนวนเงิน และชื่อบัญชีตรงกันครบ ควรตัดออกทั้งฝั่งเงินเข้าและเงินออกเมื่อต้องการวิเคราะห์กระแสเงินภายนอก</p></article><article className="surface controlCard"><div className="sectionHead"><div><p>CONTROL STATUS</p><h2>สถานะคุณภาพข้อมูล</h2></div></div>{data.quality.map(q=><div className="qualityRow" key={q.label}><i className={q.status}>{q.status==="pass"?"✓":"!"}</i><span><b>{q.label}</b><small>{q.detail}</small></span></div>)}</article></section></>}

    {view==="outgoing"&&<section className="outgoingPage"><div className="outgoingHero"><div><p>OUTGOING ANALYSIS · 3 BANKS</p><h2>เงินขาออกไปที่ใคร มากน้อยเพียงใด</h2><span>สรุปจากรายการเงินออกใน Statement ระหว่าง ม.ค.–ก.ค. 2569</span></div><div className="outgoingTabs"><button className={outgoingBank==="all"?"active":""} onClick={()=>selectOutgoingBank("all")}>รวม 3 ธนาคาร</button>{data.banks.map(b=><button key={b.bank} className={outgoingBank===b.bank?"active":""} onClick={()=>selectOutgoingBank(b.bank)}>{b.bank}</button>)}</div></div><div className="analysisCompleteness" role="status"><b>ข้อมูลครบ {outgoingAnalysis.count.toLocaleString("th-TH")} รายการ</b><span>{outgoingAnalysis.groups.length.toLocaleString("th-TH")} กลุ่มผู้รับ · {outgoingBank==="all"?"รวม KBANK, BBL และ KTB":`เฉพาะ ${outgoingBank}`}</span></div>
    <div className="outgoingKpis"><article><span>ยอดเงินขาออก</span><strong className="red">฿{short(outgoingAnalysis.total)}</strong><small>{fmt(outgoingAnalysis.total)} บาท</small></article><article><span>จำนวนรายการ</span><strong>{outgoingAnalysis.count.toLocaleString("th-TH")}</strong><small>เฉลี่ย ฿{fmt(outgoingAnalysis.total/Math.max(outgoingAnalysis.count,1))} ต่อครั้ง</small></article><article><span>ผู้รับที่ระบุชื่อได้</span><strong>{outgoingAnalysis.identified.toLocaleString("th-TH")}</strong><small>ราย/นิติบุคคล แยกตามชื่อและธนาคาร</small></article><article><span>รายการไม่ระบุชื่อ</span><strong className="warnText">{outgoingAnalysis.unidentifiedCount.toLocaleString("th-TH")}</strong><small>ต้องใช้เอกสารเพิ่มเพื่อยืนยันผู้รับ</small></article></div>
    <article className="surface monthlyOutgoing"><div className="sectionHead"><div><p>MONTHLY OUTGOING</p><h2>แต่ละเดือนออกกี่ครั้ง กี่คน</h2></div><b>เลือก: {outgoingBank==="all"?"รวม 3 ธนาคาร":outgoingBank}</b></div><div className="outMonthGrid">{outgoingAnalysis.monthly.map(m=><div key={m.month}><span>{monthNames[m.month]}</span><strong>฿{short(m.amount)}</strong><small>{m.count.toLocaleString("th-TH")} ครั้ง · ระบุผู้รับได้ {m.people.toLocaleString("th-TH")} ราย</small></div>)}</div></article>
    <article className="surface recipientSurface"><div className="sectionHead"><div><p>RECIPIENT & VENDOR CONCENTRATION</p><h2>ผู้รับเงิน คู่ค้า และสัดส่วนเงินออก</h2><span className="muted">เปอร์เซ็นต์คำนวณจากยอดเงินออกของตัวเลือกปัจจุบัน</span></div><b>{outgoingAnalysis.groups.length.toLocaleString("th-TH")} กลุ่มผู้รับ</b></div><div className="recipientPageStatus">แสดงกลุ่มที่ {(outgoingRecipientStart+1).toLocaleString("th-TH")}–{Math.min(outgoingRecipientStart+recipientPageSize,outgoingAnalysis.groups.length).toLocaleString("th-TH")} จากทั้งหมด {outgoingAnalysis.groups.length.toLocaleString("th-TH")} กลุ่ม</div><div className="recipientTable"><table><thead><tr><th>ธนาคาร</th><th>ชื่อผู้รับ / กลุ่มรายการ</th><th>ประเภท</th><th className="number">จำนวนครั้ง</th><th className="number">ยอดรวม</th><th className="number">สัดส่วน</th></tr></thead><tbody>{outgoingRecipientGroups.map(g=><tr key={`${g.bank}-${g.name}`}><td><span className="bankPill" style={{borderColor:bankColor[g.bank]}}>{g.bank}</span></td><td><b>{g.name}</b><small>{Object.entries(g.months).map(([m,v])=>`${monthNames[m]} ${v.count} ครั้ง`).join(" · ")}</small></td><td><span className={`categoryPill ${g.identified?"":"unverified"}`}>{g.category}</span></td><td className="number">{g.count.toLocaleString("th-TH")}</td><td className="number red">฿{fmt(g.amount)}</td><td className="number"><b>{(g.amount/Math.max(outgoingAnalysis.total,1)*100).toFixed(2)}%</b><i className="shareBar"><em style={{width:`${Math.min(100,g.amount/Math.max(outgoingAnalysis.total,1)*100)}%`}}/></i></td></tr>)}</tbody></table></div><div className="recipientPagination"><button disabled={outgoingRecipientPage===1} onClick={()=>setOutgoingRecipientPage(p=>p-1)}>← ก่อนหน้า</button><span>หน้า {outgoingRecipientPage.toLocaleString("th-TH")} / {outgoingRecipientPages.toLocaleString("th-TH")}</span><button disabled={outgoingRecipientPage===outgoingRecipientPages} onClick={()=>setOutgoingRecipientPage(p=>p+1)}>ถัดไป →</button></div><div className="evidenceNote"><b>วิธีอ่านและข้อจำกัด</b><p>จำนวน “ผู้รับที่ระบุชื่อได้” นับชื่อแยกตามธนาคาร ไม่ได้สรุปว่าเป็นบุคคลเดียวกันข้ามบัญชี รายการ BBL หลายรายการไม่มีชื่อคู่ค้าใน Statement จึงรวมตามประเภทรายการและแสดงสถานะรอตรวจเอกสาร โดยไม่มีการเดาชื่อผู้รับ</p></div></article></section>}

    {view==="incoming"&&<section className="outgoingPage incomingPage"><div className="outgoingHero incomingHero"><div><p>INCOMING ANALYSIS · 3 BANKS</p><h2>เงินขาเข้ามาจากใคร และช่องทางใด</h2><span>สรุปจากรายการเงินเข้าใน Statement ระหว่าง ม.ค.–ก.ค. 2569</span></div><div className="outgoingTabs"><button className={incomingBank==="all"?"active":""} onClick={()=>setIncomingBank("all")}>รวม 3 ธนาคาร</button>{data.banks.map(b=><button key={b.bank} className={incomingBank===b.bank?"active":""} onClick={()=>setIncomingBank(b.bank)}>{b.bank}</button>)}</div></div>
    <div className="outgoingKpis incomingKpis"><article><span>ยอดเงินขาเข้า</span><strong className="blue">฿{short(incomingAnalysis.total)}</strong><small>{fmt(incomingAnalysis.total)} บาท</small></article><article><span>จำนวนรายการ</span><strong>{incomingAnalysis.count.toLocaleString("th-TH")}</strong><small>เฉลี่ย ฿{fmt(incomingAnalysis.total/Math.max(incomingAnalysis.count,1))} ต่อครั้ง</small></article><article><span>แหล่งที่ระบุชื่อ/บัญชีได้</span><strong>{incomingAnalysis.identified.toLocaleString("th-TH")}</strong><small>รายหรือบัญชี แยกตามธนาคาร</small></article><article><span>รายการไม่ระบุผู้ส่ง</span><strong className="warnText">{incomingAnalysis.unidentifiedCount.toLocaleString("th-TH")}</strong><small>รวม EDC/QR และช่องทางที่ไม่มีชื่อผู้ส่ง</small></article></div>
    <article className="surface monthlyOutgoing"><div className="sectionHead"><div><p>MONTHLY INCOMING</p><h2>แต่ละเดือนเข้ากี่ครั้ง จากกี่แหล่ง</h2></div><b>เลือก: {incomingBank==="all"?"รวม 3 ธนาคาร":incomingBank}</b></div><div className="outMonthGrid incomingMonths">{incomingAnalysis.monthly.map(m=><div key={m.month}><span>{monthNames[m.month]}</span><strong>฿{short(m.amount)}</strong><small>{m.count.toLocaleString("th-TH")} ครั้ง · ระบุแหล่งได้ {m.people.toLocaleString("th-TH")} ราย/บัญชี</small></div>)}</div></article>
    <article className="surface recipientSurface senderSurface"><div className="sectionHead"><div><p>SENDER & INCOME SOURCE CONCENTRATION</p><h2>ผู้ส่งเงิน ช่องทางรับ และสัดส่วนเงินเข้า</h2><span className="muted">เปอร์เซ็นต์คำนวณจากยอดเงินเข้าของตัวเลือกปัจจุบัน</span></div><b>{incomingAnalysis.groups.length.toLocaleString("th-TH")} กลุ่มแหล่งเงิน</b></div><div className="recipientTable"><table><thead><tr><th>ธนาคาร</th><th>ชื่อผู้ส่ง / ช่องทางรับ</th><th>ประเภท</th><th className="number">จำนวนครั้ง</th><th className="number">ยอดรวม</th><th className="number">สัดส่วน</th></tr></thead><tbody>{incomingAnalysis.groups.map(g=><tr key={`${g.bank}-${g.name}`}><td><span className="bankPill" style={{borderColor:bankColor[g.bank]}}>{g.bank}</span></td><td><b>{g.name}</b><small>{Object.entries(g.months).map(([m,v])=>`${monthNames[m]} ${v.count} ครั้ง`).join(" · ")}</small></td><td><span className={`categoryPill ${g.identified?"":"unverified"}`}>{g.category}</span></td><td className="number">{g.count.toLocaleString("th-TH")}</td><td className="number blue">฿{fmt(g.amount)}</td><td className="number"><b>{(g.amount/Math.max(incomingAnalysis.total,1)*100).toFixed(2)}%</b><i className="shareBar incomingShare"><em style={{width:`${Math.min(100,g.amount/Math.max(incomingAnalysis.total,1)*100)}%`}}/></i></td></tr>)}</tbody></table></div><div className="evidenceNote"><b>วิธีอ่านและข้อจำกัด</b><p>จำนวนแหล่งเงินนับชื่อหรือเลขบัญชีแยกตามธนาคาร รายการ EDC/QR เงินฝาก เช็ค และรายการ BBL ที่ไม่มีชื่อผู้ส่ง จะรวมตามช่องทางรับและไม่นับเป็นบุคคล เพื่อป้องกันการสรุปจำนวนคนเกินจริง</p></div></article></section>}

    {view==="transactions"&&<section className="surface txnPage"><div className="sectionHead"><div><p>ALL BANK TRANSACTIONS</p><h2>รายการเดินบัญชีรวม</h2><span className="muted">ค้นหาจาก {data.transactions.length.toLocaleString("th-TH")} รายการของทั้ง 3 ธนาคาร</span></div><b className="resultCount">พบ {rows.length.toLocaleString("th-TH")} รายการ</b></div><div className="filters"><label>ธนาคาร<select value={bank} onChange={e=>setBank(e.target.value)}><option value="all">ทุกธนาคาร</option>{data.banks.map(b=><option key={b.bank}>{b.bank}</option>)}</select></label><label>เดือน<select value={month} onChange={e=>setMonth(e.target.value)}><option value="all">ทุกเดือน</option>{["01","02","03","04","05","06","07"].map((m,i)=><option value={m} key={m}>{["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม"][i]}</option>)}</select></label><label>ทิศทาง<select value={direction} onChange={e=>setDirection(e.target.value)}><option value="all">เงินเข้าและออก</option><option value="in">เงินเข้า</option><option value="out">เงินออก</option></select></label><label className="searchBox">ค้นหาชื่อ เลขบัญชี หรือจำนวนเงิน<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="เช่น Pongsak, 500000, X1654…"/></label><button onClick={()=>{setBank("all");setMonth("all");setDirection("all");setQuery("")}}>ล้าง</button></div><div className="txnTable"><table><thead><tr><th>วันและเวลา</th><th>ธนาคาร</th><th>ทิศทาง</th><th>รายละเอียด</th><th className="number">จำนวนเงิน</th></tr></thead><tbody>{shown.map((r,i)=><tr key={`${r.bank}-${r.date}-${r.time}-${i}`}><td>{r.date}<small>{r.time}</small></td><td><span className="bankPill" style={{borderColor:bankColor[r.bank]}}>{r.bank}</span></td><td><span className={r.direction==="in"?"flowIn":"flowOut"}>{r.direction==="in"?"เงินเข้า":"เงินออก"}</span></td><td>{r.description}</td><td className={`number ${r.direction==="in"?"blue":"red"}`}>{r.direction==="in"?"+":"−"} ฿{fmt(r.amount)}</td></tr>)}</tbody></table></div><div className="pagination"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>← ก่อนหน้า</button><span>หน้า {page} / {pages}</span><button disabled={page===pages} onClick={()=>setPage(p=>p+1)}>ถัดไป →</button></div></section>}

    {view==="audit"&&<><section className="auditHero"><div><p>CONTROL & RECONCILIATION</p><h2>ระบบตรวจสอบได้จากหลักฐานต้นทาง</h2><span>แสดงสิ่งที่ยืนยันแล้ว สิ่งที่ต้องขอเอกสาร และรายการควบคุมสำคัญ</span></div><div className="auditScore"><b>3/5</b><span>การควบคุมผ่านสมบูรณ์</span></div></section><section className="auditGrid"><article className="surface"><div className="sectionHead"><div><p>DATA QUALITY</p><h2>รายการควบคุมคุณภาพ</h2></div></div>{data.quality.map(q=><div className="qualityDetail" key={q.label}><i className={q.status}>{q.status==="pass"?"ผ่าน":"รอตรวจ"}</i><div><b>{q.label}</b><p>{q.detail}</p></div></div>)}</article><article className="surface"><div className="sectionHead"><div><p>INTERNAL TRANSFERS</p><h2>รายการโอนภายในที่ยืนยันแล้ว</h2></div><b>฿{fmt(t.internal)}</b></div>{data.internalTransfers.map(x=><div className="miniRow" key={`${x.date}-${x.time}`}><span>{x.date}<small>{x.time}</small></span><b>{x.from} → {x.to}</b><strong>{fmt(x.amount)}</strong></div>)}</article><article className="surface"><div className="sectionHead"><div><p>CASH CONTROL</p><h2>ถอนเงินสดผ่านสาขา</h2></div><b>฿{fmt(t.cash)}</b></div>{data.cashWithdrawals.map(x=><div className="miniRow" key={`${x.date}-${x.time}`}><span>{x.date}<small>{x.day} · {x.time}</small></span><b>{x.reference}</b><strong>{fmt(x.amount)}</strong></div>)}</article><article className="surface"><div className="sectionHead"><div><p>PERSON REVIEW</p><h2>รายการเฉพาะบุคคล</h2></div></div>{data.personTransfers.map(x=><div className="personRow" key={`${x.date}-${x.direction}`}><span className={x.direction==="in"?"flowIn":"flowOut"}>{x.direction==="in"?"เงินเข้า":"เงินออก"}</span><div><b>{x.counterparty}</b><p>{x.date} · {x.bank} · {x.detail}</p></div><strong className={x.direction==="in"?"blue":"red"}>{fmt(x.amount)}</strong></div>)}<div className="evidenceNote"><b>ข้อจำกัดของหลักฐาน</b><p>ชื่อผู้โอนใน KBANK ถูกตัดเป็น “LAOHAW...” และข้อมูลคู่โอนของ BBL ไม่ครบ จึงต้องเก็บสถานะ “รอตรวจเอกสาร” ไว้จนกว่าจะได้รับเอกสารเพิ่มเติม</p></div></article></section></>}
    <footer><span>แหล่งข้อมูล: Statement KBANK, BBL และ KTB · {data.meta.period}</span><b>ระบบรายงานเพื่อการตรวจสอบภายใน ไม่ใช่งบการเงิน</b></footer></section>
  </main>
}
