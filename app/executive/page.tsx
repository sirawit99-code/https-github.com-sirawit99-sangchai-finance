"use client";

import { useEffect, useMemo, useState } from "react";
import "./executive-v2.css";

type Direction = "in"|"out";
type Transaction = { date:string; month:number; time:string; description:string; category:string; direction:Direction; amount:number; balance:number; detail:string };
type Category = { direction:Direction; category:string; count:number; amount:number };
type Month = { month:string; in:number; out:number; ending:number };
type Report = { summary:{ opening:number; totalIn:number; totalOut:number; ending:number; net:number; edc:number; transactions:number }; months:Month[]; categories:Category[]; transactions:Transaction[] };

const money=(n:number)=>new Intl.NumberFormat("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const short=(n:number)=>`${n<0?"−":""}${(Math.abs(n)/1e6).toFixed(2)} ลบ.`;
const palette=["#e60012","#202b86","#f04a56","#5260b6","#f3a53b","#8990ab","#c8ccd8"];
const bankLabel=(detail:string,outgoing=false)=>{
  const d=detail.toUpperCase();
  if(d.includes("SCBT"))return "ธ.ไทยพาณิชย์เพื่อธุรกิจ (SCBT)";
  if(d.includes("SCB"))return "ธ.ไทยพาณิชย์ (SCB)";
  if(d.includes("BBL"))return "ธ.กรุงเทพ (BBL)";
  if(d.includes("KTB"))return "ธ.กรุงไทย (KTB)";
  if(d.includes("GSB"))return "ธ.ออมสิน (GSB)";
  if(d.includes("BAAC"))return "ธ.ก.ส. (BAAC)";
  if(d.includes("BAY"))return "ธ.กรุงศรีฯ (BAY)";
  if(d.includes("K PLUS")||d.includes("K BIZ")||d.includes("MAKE BY KBANK")||(outgoing&&d.includes("โอนไป X")))return "ธ.กสิกรไทย (KBank)";
  return "ธนาคาร/ช่องทางอื่น";
};

export default function ExecutiveSummary(){
  const [data,setData]=useState<Report|null>(null);
  useEffect(()=>{fetch("/sangchai-report-data.json").then(r=>r.json()).then(setData)},[]);
  const analysis=useMemo(()=>{
    if(!data)return null;
    const byDate:Record<string,{in:number;out:number;ending:number,count:number}>={};
    data.transactions.forEach(t=>{byDate[t.date]??={in:0,out:0,ending:t.balance,count:0};byDate[t.date][t.direction]+=t.amount;byDate[t.date].ending=t.balance;byDate[t.date].count++});
    const days=Object.entries(byDate);
    const maxIn=days.reduce((a,b)=>b[1].in>a[1].in?b:a);
    const maxOut=days.reduce((a,b)=>b[1].out>a[1].out?b:a);
    const minBalance=days.reduce((a,b)=>b[1].ending<a[1].ending?b:a);
    const maxBalance=days.reduce((a,b)=>b[1].ending>a[1].ending?b:a);
    const big=data.transactions.filter(t=>t.amount>=500000).sort((a,b)=>b.amount-a.amount);
    return{maxIn,maxOut,minBalance,maxBalance,big,days};
  },[data]);
  if(!data||!analysis)return <main className="loading"><div className="pulse"/><p>กำลังจัดทำสรุปผู้บริหาร…</p></main>;
  const incoming=data.categories.filter(c=>c.direction==="in").sort((a,b)=>b.amount-a.amount);
  const maxMonthly=Math.max(...data.months.flatMap(m=>[m.in,m.out]));
  const cashIn=data.categories.find(c=>c.category==="ฝากเงินสด")?.amount||0;
  const cashOut=data.categories.find(c=>c.category==="ถอนเงินสด")?.amount||0;
  const transferIn=data.categories.find(c=>c.category==="รับโอนเงิน")?.amount||0;
  const transferOut=data.categories.find(c=>c.category==="โอนเงินออก")?.amount||0;
  const bankSummary=(direction:Direction)=>Object.values(data.transactions.filter(t=>direction==="in"?t.category==="รับโอนเงิน":t.category==="โอนเงินออก").reduce<Record<string,{name:string;amount:number;count:number}>>((acc,t)=>{const name=bankLabel(t.detail,direction==="out");acc[name]??={name,amount:0,count:0};acc[name].amount+=t.amount;acc[name].count++;return acc},{})).sort((a,b)=>b.amount-a.amount);
  const bankIn=bankSummary("in"),bankOut=bankSummary("out");
  const goodMonths=data.months.filter(m=>m.in>m.out).length;
  let cursor=0;const donut=`conic-gradient(${incoming.map((c,i)=>{const s=cursor;cursor+=c.amount/data.summary.totalIn*100;return`${palette[i%palette.length]} ${s}% ${cursor}%`}).join(",")})`;
  return <main className="execPage">
    <div className="execActions"><a href="/">← กลับรายงานฉบับเต็ม</a><button onClick={()=>window.print()}>พิมพ์ / บันทึก PDF</button></div>
    <article className="execSheet">
      <header className="execHeader"><div className="execBrand"><img src="/sangchai-logo.jpeg" alt="Sangchai Panich"/><div><p>EXECUTIVE FINANCIAL BRIEF</p><h1>KBANK 1-6/69</h1><span>สรุปรอบบัญชี •••• 3518 · 1 มกราคม – 30 มิถุนายน 2569</span></div></div><div className="execStatus"><b>ภาพรวม</b><strong className={data.summary.net>=0?"positive":"negative"}>{data.summary.net>=0?"เงินเพิ่ม":"เงินลด"} {short(data.summary.net)}</strong><small>จากยอดต้นงวด</small></div></header>

      <section className="execKpis"><div><span>เงินเข้า</span><strong>{short(data.summary.totalIn)}</strong><small>฿{money(data.summary.totalIn)} · 3,625 รายการ</small></div><div><span>เงินออก</span><strong className="negative">{short(data.summary.totalOut)}</strong><small>฿{money(data.summary.totalOut)} · 1,157 รายการ</small></div><div><span>ยอดคงเหลือปลายงวด</span><strong>{short(data.summary.ending)}</strong><small>฿{money(data.summary.ending)} · ต้นงวด {short(data.summary.opening)}</small></div><div><span>EDC / QR / ยอดขายบัตร</span><strong>{short(data.summary.edc)}</strong><small>฿{money(data.summary.edc)} · 42.43% ของเงินเข้า</small></div></section>

      <section className="execMainGrid"><div className="execPanel monthly"><div className="execTitle"><div><p>MONTHLY MOVEMENT</p><h2>แนวโน้มรายเดือน</h2></div><span><i/>เข้า <i/>ออก</span></div><div className="execBars">{data.months.map(m=><div key={m.month}><div className="execBarPair"><i style={{height:`${m.in/maxMonthly*100}%`}}/><i style={{height:`${m.out/maxMonthly*100}%`}}/></div><b>{m.month}</b><small>{short(m.in)} / {short(m.out)}</small><em className={m.in-m.out>=0?"positive":"negative"}>{m.in-m.out>=0?"+":""}{short(m.in-m.out)}</em></div>)}</div><div className="execInsight"><b>{goodMonths} จาก 6 เดือน</b> มีเงินเข้ามากกว่าเงินออก · เดือนมิถุนายนกระแสเงินสดสุทธิสูงสุด <b>+{short(data.months[5].in-data.months[5].out)}</b></div></div>
      <div className="execPanel composition"><div className="execTitle"><div><p>INFLOW MIX</p><h2>องค์ประกอบเงินเข้า</h2></div></div><div className="execDonutRow"><span className="execDonut" style={{background:donut}}><i><b>179.60</b><small>ล้านบาท</small></i></span><div>{incoming.slice(0,5).map((c,i)=><p key={c.category}><i style={{background:palette[i]}}/><span>{c.category}<small>฿{money(c.amount)}</small></span><b>{(c.amount/data.summary.totalIn*100).toFixed(1)}%</b></p>)}</div></div></div></section>

      <section className="bankFlowGrid"><div className="execPanel bankPanel"><div className="execTitle"><div><p>INCOMING BANKS</p><h2>รับโอนเข้าจากธนาคารใด</h2></div><strong>{short(transferIn)}</strong></div><div className="bankRows">{bankIn.slice(0,6).map((b,i)=><div key={b.name}><span className="bankRank">{i+1}</span><span><b>{b.name}</b><small>{b.count.toLocaleString("th-TH")} รายการ</small></span><strong>{short(b.amount)}<small>฿{money(b.amount)}</small></strong><em>{(b.amount/transferIn*100).toFixed(1)}%</em></div>)}</div></div><div className="execPanel bankPanel"><div className="execTitle"><div><p>OUTGOING BANKS</p><h2>โอนออกไปธนาคารใด</h2></div><strong className="negative">{short(transferOut)}</strong></div><div className="bankRows">{bankOut.slice(0,6).map((b,i)=><div key={b.name}><span className="bankRank outRank">{i+1}</span><span><b>{b.name}</b><small>{b.count.toLocaleString("th-TH")} รายการ</small></span><strong className="negative">{short(b.amount)}<small>฿{money(b.amount)}</small></strong><em>{(b.amount/transferOut*100).toFixed(1)}%</em></div>)}</div></div></section>

      <section className="execBottomGrid"><div className="execPanel"><div className="execTitle"><div><p>LIQUIDITY SIGNALS</p><h2>ตัวชี้วัดที่ควรรู้</h2></div></div><div className="signalGrid"><div><span>เงินสดเข้าสุทธิ</span><b>{short(cashIn-cashOut)}</b><small>ฝาก {short(cashIn)} − ถอน {short(cashOut)}</small></div><div><span>เงินโอนสุทธิ</span><b className="negative">{short(transferIn-transferOut)}</b><small>รับ {short(transferIn)} − โอนออก {short(transferOut)}</small></div><div><span>เงินเข้าสูงสุด/วัน</span><b>{short(analysis.maxIn[1].in)}</b><small>{analysis.maxIn[0]} · {analysis.maxIn[1].count} รายการ</small></div><div><span>เงินออกสูงสุด/วัน</span><b className="negative">{short(analysis.maxOut[1].out)}</b><small>{analysis.maxOut[0]} · {analysis.maxOut[1].count} รายการ</small></div></div></div>
      <div className="execPanel"><div className="execTitle"><div><p>MANAGEMENT ATTENTION</p><h2>ประเด็นสำหรับผู้บริหาร</h2></div></div><ol className="attention"><li><b>กระแสเงินสดสุทธิครึ่งปีติดลบ {short(Math.abs(data.summary.net))}</b><span>เงินออกสูงกว่าเงินเข้าเล็กน้อย คิดเป็น 0.28% ของเงินเข้า</span></li><li><b>เงินออกกระจุกที่การโอน {short(transferOut)}</b><span>คิดเป็น {(transferOut/data.summary.totalOut*100).toFixed(1)}% ของเงินออกทั้งหมด ควรตรวจคู่ค้าหลัก</span></li><li><b>ยอดคงเหลือต่ำสุด {short(analysis.minBalance[1].ending)}</b><span>เกิดวันที่ {analysis.minBalance[0]} ขณะที่ยอดสูงสุด {short(analysis.maxBalance[1].ending)}</span></li><li><b>รายการตั้งแต่ 500,000 บาทขึ้นไป {analysis.big.length} รายการ</b><span>ควรมีเอกสารประกอบและผู้อนุมัติตามนโยบาย</span></li></ol></div></section>

      <footer className="execFooter"><span>แหล่งข้อมูล: KBank Statement 118 หน้า · ตัวเลขรวมกระทบยอดตรงกับสรุปธนาคาร</span><b>จัดทำเพื่อการบริหารสภาพคล่อง ไม่ใช่งบกำไรขาดทุน</b></footer>
    </article>
  </main>
}
