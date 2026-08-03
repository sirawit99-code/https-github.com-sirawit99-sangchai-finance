"use client";

import { useEffect, useMemo, useState } from "react";

type Direction = "in" | "out";
type Transaction = { date:string; month:number; time:string; description:string; category:string; direction:Direction; amount:number; balance:number; detail:string };
type Category = { direction:Direction; category:string; count:number; amount:number };
type Month = { month:string; in:number; out:number; ending:number };
type Report = { summary:{ opening:number; totalIn:number; totalOut:number; ending:number; net:number; edc:number; period:string; transactions:number }; months:Month[]; categories:Category[]; transactions:Transaction[] };

const colors = ["#e60012", "#202b86", "#f04a56", "#5260b6", "#f3a53b", "#6b7280", "#c8ccd8"];
const money = (n:number) => new Intl.NumberFormat("th-TH", { minimumFractionDigits:2, maximumFractionDigits:2 }).format(n);
const compact = (n:number) => Math.abs(n) >= 1e6 ? `${n < 0 ? "−" : ""}${(Math.abs(n)/1e6).toFixed(2)} ล้าน` : money(n);

export default function Home() {
  const [data,setData] = useState<Report|null>(null);
  const [direction,setDirection] = useState<"all"|Direction>("all");
  const [category,setCategory] = useState("all");
  const [month,setMonth] = useState(0);
  const [query,setQuery] = useState("");
  const [page,setPage] = useState(1);
  const [expanded,setExpanded] = useState<null|"income"|"outcome"|"monthly">(null);
  const [selectedDate,setSelectedDate] = useState("30-06-26");

  useEffect(()=>{ fetch("/sangchai-report-data.json").then(r=>r.json()).then(setData); },[]);
  useEffect(()=>setPage(1),[direction,category,month,query]);

  const rows = useMemo(()=>data?.transactions.filter(t =>
    (direction === "all" || t.direction === direction) &&
    (category === "all" || t.category === category) &&
    (!month || t.month === month) &&
    (!query || `${t.date} ${t.time} ${t.description} ${t.detail}`.toLowerCase().includes(query.toLowerCase()))
  ) ?? [],[data,direction,category,month,query]);

  if (!data) return <main className="loading"><div className="pulse"/><p>กำลังจัดเตรียมรายงานบัญชี…</p></main>;
  const income = data.categories.filter(c=>c.direction==="in");
  const outcome = data.categories.filter(c=>c.direction==="out");
  const incomeTotal = income.reduce((s,c)=>s+c.amount,0);
  const maxMonth = Math.max(...data.months.flatMap(m=>[m.in,m.out]));
  const pageSize = 30, pageCount = Math.ceil(rows.length/pageSize), shown = rows.slice((page-1)*pageSize,page*pageSize);
  const catOptions = data.categories.filter(c=>direction==="all" || c.direction===direction);
  const dates = [...new Set(data.transactions.map(t=>t.date))];
  const dailyRows = data.transactions.filter(t=>t.date===selectedDate);
  const dailyIn = dailyRows.filter(t=>t.direction==="in").reduce((s,t)=>s+t.amount,0);
  const dailyOut = dailyRows.filter(t=>t.direction==="out").reduce((s,t)=>s+t.amount,0);
  const dailyBalance = dailyRows.at(-1)?.balance ?? 0;
  const dailyCats = Object.values(dailyRows.reduce<Record<string,Category>>((acc,t)=>{const k=`${t.direction}-${t.category}`;acc[k]??={direction:t.direction,category:t.category,count:0,amount:0};acc[k].count++;acc[k].amount+=t.amount;return acc},{})).sort((a,b)=>b.amount-a.amount);
  const donut = (items:Category[], total:number) => {
    let cursor=0; return `conic-gradient(${items.map((c,i)=>{const start=cursor;cursor+=c.amount/total*100;return `${colors[i%colors.length]} ${start}% ${cursor}%`}).join(",")})`;
  };
  const selectCategory = (c:Category) => { setDirection(c.direction); setCategory(c.category); document.getElementById("transactions")?.scrollIntoView({behavior:"smooth"}); };

  return <main>
    <header className="topbar">
      <div className="brand"><img className="brandLogo" src="/sangchai-logo.jpeg" alt="Sangchai Panich Parts Chiangmai"/><div><strong>แสงชัยพาณิชย์</strong><small>รายงานวิเคราะห์บัญชี</small></div></div>
      <nav><a className="executiveLink" href="/executive">สรุปผู้บริหาร 1 หน้า</a><a href="#overview">ภาพรวม</a><a href="#composition">สัดส่วน</a><a href="#daily">รายวัน</a><a href="#transactions">รายการเดินบัญชี</a></nav>
      <div className="period">1 ม.ค. – 30 มิ.ย. 2569</div>
    </header>

    <section className="hero" id="overview">
      <div><p className="eyebrow">บัญชีออมทรัพย์ •••• 3518</p><h1>ภาพรวมการเงิน<br/>ที่ตรวจสอบต่อได้</h1><p className="lead">สรุปจาก Statement 118 หน้า ครบ {data.summary.transactions.toLocaleString("th-TH")} รายการ กดที่กราฟหรือหมวดเพื่อเจาะดูรายการต้นทาง</p></div>
      <div className="balanceCard"><span>ยอดคงเหลือ ณ 30 มิ.ย. 2569</span><strong>฿{compact(data.summary.ending)}</strong><small className="exactLight">ยอดจริง ฿{money(data.summary.ending)}</small><div className="balanceMeta"><span>ต้นงวด ฿{money(data.summary.opening)}</span><b>เปลี่ยนแปลง {money(data.summary.net)} บาท</b></div></div>
    </section>

    <section className="kpis">
      <button className="kpi" onClick={()=>{setDirection("in");setCategory("all");document.getElementById("transactions")?.scrollIntoView({behavior:"smooth"})}}><span>เงินเข้าทั้งหมด</span><strong className="positive">฿{compact(data.summary.totalIn)}</strong><small className="exact">ยอดจริง ฿{money(data.summary.totalIn)}</small><small>3,625 รายการ · เฉลี่ย ฿{money(data.summary.totalIn/3625)} ต่อรายการ</small></button>
      <button className="kpi" onClick={()=>{setDirection("out");setCategory("all");document.getElementById("transactions")?.scrollIntoView({behavior:"smooth"})}}><span>เงินออกทั้งหมด</span><strong className="negative">฿{compact(data.summary.totalOut)}</strong><small className="exact">ยอดจริง ฿{money(data.summary.totalOut)}</small><small>1,157 รายการ · เฉลี่ย ฿{money(data.summary.totalOut/1157)} ต่อรายการ</small></button>
      <button className="kpi" onClick={()=>{setDirection("in");setCategory("EDC / Thai QR");document.getElementById("transactions")?.scrollIntoView({behavior:"smooth"})}}><span>EDC / QR และยอดขายบัตร</span><strong>฿{compact(data.summary.edc)}</strong><small className="exact">ยอดจริง ฿{money(data.summary.edc)}</small><small>42.43% ของเงินเข้าทั้งหมด</small></button>
    </section>

    <section className="dashboardGrid" id="composition">
      <article className="panel monthlyPanel">
        <div className="panelHead"><div><p className="eyebrow">แนวโน้ม 6 เดือน</p><h2>เงินเข้า–ออก รายเดือน</h2></div><button className="iconButton" onClick={()=>setExpanded("monthly")} aria-label="ขยายกราฟรายเดือน">↗</button></div>
        <button className="monthChart" onClick={()=>setExpanded("monthly")} aria-label="ขยายกราฟเงินเข้าออก">
          {data.months.map((m,i)=><div className="monthCol" key={m.month}><div className="barPair"><i className="bar inBar" style={{height:`${m.in/maxMonth*100}%`}}/><i className="bar outBar" style={{height:`${m.out/maxMonth*100}%`}}/></div><b>{m.month}</b><small>{compact(m.ending)}</small></div>)}
        </button>
        <div className="legend"><span><i className="dot green"/>เงินเข้า</span><span><i className="dot red"/>เงินออก</span><span>ตัวเลขใต้เดือน = ยอดคงเหลือ</span></div>
      </article>

      <article className="panel compositionPanel">
        <div className="panelHead"><div><p className="eyebrow">องค์ประกอบรายรับ</p><h2>เงินเข้ามาจากอะไร</h2></div><button className="iconButton" onClick={()=>setExpanded("income")} aria-label="ขยายกราฟวงกลม">↗</button></div>
        <button className="donutWrap" onClick={()=>setExpanded("income")} aria-label="ขยายกราฟสัดส่วนเงินเข้า"><span className="donut" style={{background:donut(income,incomeTotal)}}><span><b>฿179.60 ล้าน</b><small>฿{money(incomeTotal)}</small></span></span></button>
        <div className="categoryList">{income.slice().sort((a,b)=>b.amount-a.amount).map((c,i)=><button key={c.category} onClick={()=>selectCategory(c)}><i style={{background:colors[i%colors.length]}}/><span>{c.category}<small>{c.count.toLocaleString("th-TH")} รายการ · ฿{money(c.amount)}</small></span><b>{(c.amount/incomeTotal*100).toFixed(1)}%</b></button>)}</div>
      </article>
    </section>

    <section className="panel dailyPanel" id="daily">
      <div className="panelHead"><div><p className="eyebrow">องค์ประกอบรายวัน</p><h2>เงินของแต่ละวันประกอบด้วยอะไร</h2><p className="muted">เลือกวันที่เพื่อดูยอดรวม หมวดที่เกิดขึ้น และรายการทั้งหมดของวันนั้น</p></div><label className="datePicker">เลือกวันที่<select value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}>{dates.map(d=><option value={d} key={d}>{d}</option>)}</select></label></div>
      <div className="dailySummary">
        <div><span>เงินเข้าของวัน</span><strong className="positive">฿{compact(dailyIn)}</strong><small>ยอดจริง ฿{money(dailyIn)} · {dailyRows.filter(t=>t.direction==="in").length} รายการ</small></div>
        <div><span>เงินออกของวัน</span><strong className="negative">฿{compact(dailyOut)}</strong><small>ยอดจริง ฿{money(dailyOut)} · {dailyRows.filter(t=>t.direction==="out").length} รายการ</small></div>
        <div><span>สุทธิของวัน</span><strong className={dailyIn-dailyOut>=0?"positive":"negative"}>฿{compact(dailyIn-dailyOut)}</strong><small>ยอดจริง ฿{money(dailyIn-dailyOut)}</small></div>
        <div><span>ยอดคงเหลือท้ายวัน</span><strong>฿{compact(dailyBalance)}</strong><small>ยอดจริง ฿{money(dailyBalance)}</small></div>
      </div>
      <div className="dailyDetailGrid"><div className="dailyBreakdown"><h3>สัดส่วนตามหมวด</h3>{dailyCats.length?<div className="dailyCatList">{dailyCats.map((c,i)=><button key={`${c.direction}-${c.category}`} onClick={()=>selectCategory(c)}><i style={{background:colors[i%colors.length]}}/><span><b>{c.category}</b><small>{c.direction==="in"?"เงินเข้า":"เงินออก"} · {c.count} รายการ</small></span><strong>฿{money(c.amount)}</strong></button>)}</div>:<p className="muted">ไม่มีรายการในวันนี้</p>}</div><div className="dailyTransactions"><h3>รายการของวันที่ {selectedDate}</h3>{dailyRows.slice(0,12).map((t,i)=><div className="dailyTxn" key={`${t.time}-${i}`}><span>{t.time}<small>{t.category}</small></span><p>{t.description}<small>{t.detail}</small></p><b className={t.direction==="in"?"positive":"negative"}>{t.direction==="in"?"+":"−"} ฿{money(t.amount)}</b></div>)}{dailyRows.length>12&&<button className="textButton" onClick={()=>{setQuery(selectedDate);document.getElementById("transactions")?.scrollIntoView({behavior:"smooth"})}}>ดูครบทั้ง {dailyRows.length} รายการ →</button>}</div></div>
    </section>

    <section className="panel drillPanel">
      <div className="panelHead"><div><p className="eyebrow">หมวดสำคัญ</p><h2>กดเพื่อเจาะดูรายละเอียด</h2></div><button className="textButton" onClick={()=>setExpanded("outcome")}>ดูสัดส่วนเงินออก</button></div>
      <div className="drillGrid">{[...data.categories].sort((a,b)=>b.amount-a.amount).slice(0,8).map(c=><button className="drillCard" key={`${c.direction}-${c.category}`} onClick={()=>selectCategory(c)}><span className={c.direction==="in"?"typeIn":"typeOut"}>{c.direction==="in"?"เงินเข้า":"เงินออก"}</span><h3>{c.category}</h3><strong>฿{compact(c.amount)}</strong><span className="cardExact">ยอดจริง ฿{money(c.amount)}</span><small>{c.count.toLocaleString("th-TH")} รายการ <b>เปิดดู →</b></small></button>)}</div>
    </section>

    <section className="panel transactionPanel" id="transactions">
      <div className="panelHead"><div><p className="eyebrow">ตรวจสอบต้นทาง</p><h2>รายการเดินบัญชี</h2><p className="muted">พบ {rows.length.toLocaleString("th-TH")} รายการ</p></div></div>
      <div className="filters">
        <label>ประเภท<select value={direction} onChange={e=>{setDirection(e.target.value as typeof direction);setCategory("all")}}><option value="all">ทั้งหมด</option><option value="in">เงินเข้า</option><option value="out">เงินออก</option></select></label>
        <label>หมวด<select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">ทุกหมวด</option>{catOptions.map(c=><option key={`${c.direction}-${c.category}`} value={c.category}>{c.category}</option>)}</select></label>
        <label>เดือน<select value={month} onChange={e=>setMonth(Number(e.target.value))}><option value="0">ทุกเดือน</option>{data.months.map((m,i)=><option value={i+1} key={m.month}>{m.month} 2569</option>)}</select></label>
        <label className="search">ค้นหา<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ชื่อ รายละเอียด วันที่…"/></label>
        {(direction!=="all"||category!=="all"||month||query)&&<button className="reset" onClick={()=>{setDirection("all");setCategory("all");setMonth(0);setQuery("")}}>ล้างตัวกรอง</button>}
      </div>
      <div className="tableWrap"><table><thead><tr><th>วันและเวลา</th><th>รายการ / รายละเอียด</th><th>ประเภท</th><th className="number">จำนวนเงิน</th><th className="number">ยอดคงเหลือ</th></tr></thead><tbody>{shown.map((t,i)=><tr key={`${t.date}-${t.time}-${i}`}><td><b>{t.date}</b><small>{t.time} น.</small></td><td><b>{t.description}</b><small>{t.detail || "—"}</small></td><td><span className={t.direction==="in"?"pill inPill":"pill outPill"}>{t.category}</span></td><td className={`number ${t.direction==="in"?"positive":"negative"}`}><b>{t.direction==="in"?"+":"−"} {money(t.amount)}</b></td><td className="number">{money(t.balance)}</td></tr>)}</tbody></table></div>
      {pageCount>1&&<div className="pagination"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>← ก่อนหน้า</button><span>หน้า {page.toLocaleString("th-TH")} จาก {pageCount.toLocaleString("th-TH")}</span><button disabled={page===pageCount} onClick={()=>setPage(p=>p+1)}>ถัดไป →</button></div>}
    </section>

    <footer><img src="/sangchai-logo.jpeg" alt="Sangchai Panich"/>ข้อมูลจาก KBank Statement รอบ 01/01/2026–30/06/2026 · ตัวเลขรวมตรวจสอบตรงกับยอดสรุปของธนาคาร</footer>

    {expanded&&<div className="modal" role="dialog" aria-modal="true" onClick={()=>setExpanded(null)}><div className="modalCard" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setExpanded(null)}>×</button>{expanded==="monthly"?<><p className="eyebrow">มุมมองขนาดใหญ่</p><h2>เงินเข้า–ออก และยอดคงเหลือรายเดือน</h2><div className="largeMonthChart">{data.months.map((m,i)=><div key={m.month}><div className="largeBars"><i style={{height:`${m.in/maxMonth*100}%`}}/><i style={{height:`${m.out/maxMonth*100}%`}}/></div><b>{m.month}</b><small>เข้า ฿{compact(m.in)}<br/>ออก ฿{compact(m.out)}<br/>คงเหลือ ฿{compact(m.ending)}</small></div>)}</div></>:<><p className="eyebrow">มุมมองขนาดใหญ่</p><h2>{expanded==="income"?"สัดส่วนเงินเข้า":"สัดส่วนเงินออก"}</h2>{(()=>{const list=expanded==="income"?income:outcome;const total=list.reduce((s,c)=>s+c.amount,0);return <div className="largeDonutLayout"><span className="donut largeDonut" style={{background:donut(list,total)}}><span><b>฿{compact(total)}</b><small>{list.reduce((s,c)=>s+c.count,0).toLocaleString("th-TH")} รายการ</small></span></span><div className="categoryList largeList">{list.slice().sort((a,b)=>b.amount-a.amount).map((c,i)=><button key={c.category} onClick={()=>{setExpanded(null);selectCategory(c)}}><i style={{background:colors[i%colors.length]}}/><span>{c.category}<small>{c.count.toLocaleString("th-TH")} รายการ</small></span><b>฿{compact(c.amount)} · {(c.amount/total*100).toFixed(1)}%</b></button>)}</div></div>})()}</>}</div></div>}
  </main>;
}
