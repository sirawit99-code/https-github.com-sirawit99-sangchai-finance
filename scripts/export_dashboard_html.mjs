import fs from "node:fs";
import path from "node:path";

const project = path.resolve(import.meta.dirname, "..");
const output = path.resolve(project, "..", "Dashboard การเงิน 3 ธนาคาร ฉบับ Dashboard.html");
const views = JSON.parse(fs.readFileSync("/private/tmp/sangchai-dashboard-views.json", "utf8"));
const css = ["app/main-v2.css", "app/dashboard-overrides.css"]
  .map((file) => fs.readFileSync(path.join(project, file), "utf8"))
  .join("\n");
const logo = `data:image/jpeg;base64,${fs.readFileSync(path.join(project, "public/sangchai-logo.jpeg")).toString("base64")}`;
const pdf = `data:application/pdf;base64,${fs.readFileSync(path.join(project, "public/sangchai-finance-dashboard.pdf")).toString("base64")}`;
const reportData = JSON.parse(fs.readFileSync(path.join(project, "public/dashboard-data.json"), "utf8"));

function clean(html, key) {
  const cleaned = html
    .replace(/<button class="refreshButton"[\s\S]*?<\/button>/g, "")
    .replace(/<span class="refreshStatus[\s\S]*?<\/span>/g, '<span class="offlineBadge">ไฟล์ออฟไลน์</span>')
    .replace(/href="\/sangchai-finance-dashboard\.pdf"/g, `href="${pdf}"`);
  return `<section class="workspace offlineView" data-view="${key}">${cleaned}</section>`;
}

const panes = Object.entries(views).map(([key, html]) => clean(html, key)).join("\n");
const html = `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dashboard การเงิน 3 ธนาคาร - แสงชัยพาณิชย์</title>
<style>${css}
.offlineView{display:none}.offlineView.active{display:block}.offlineBadge{font-size:12px;color:#305c9b;background:#e9f1fc;border-radius:99px;padding:9px 12px;font-weight:900}
.offlineNote{margin:12px 0;padding:10px 14px;border-left:4px solid #e5a211;border-radius:8px;background:#fff5dd;color:#6e5b33;font-size:12px}.sideNav nav button{width:100%}.offlineActions{display:flex;gap:8px}.offlineActions button{border:0;border-radius:9px;background:#172361;color:#fff;padding:11px 15px;font-weight:900;cursor:pointer}
.offlineCompleteness{margin:14px 0;padding:14px 18px;border:1px solid #bed5f3;border-radius:12px;background:#eef6ff;color:#173b6c;font-size:16px;font-weight:800;line-height:1.55}.offlineCompleteness b{color:#172361;font-size:19px}
@media print{.offlineView{display:none!important}.offlineView.active{display:block!important}.offlineNote{display:none}}
</style></head><body>
<main class="dashboardApp"><aside class="sideNav"><div class="sideBrand"><img src="${logo}" alt="แสงชัยพาณิชย์"><div><b>FINANCE</b><small>OFFLINE DASHBOARD</small></div></div>
<nav>
<button class="active" data-target="overview"><i>◫</i><span>ภาพรวมผู้บริหาร</span></button>
<button data-target="incoming"><i>↙</i><span>วิเคราะห์เงินขาเข้า</span></button>
<button data-target="outgoing"><i>↗</i><span>วิเคราะห์เงินขาออก</span></button>
<button data-target="audit"><i>✓</i><span>ศูนย์ตรวจสอบ</span></button>
</nav><div class="sideInfo"><span>รอบข้อมูล</span><b>ม.ค.-มิ.ย. 2569</b><small>KBANK · BBL · KTB</small></div></aside>
<div class="offlineContainer" style="min-width:0;width:100%"><div class="offlineNote">ไฟล์ Dashboard แบบออฟไลน์ · ข้อมูลถูกฝังในไฟล์นี้และไม่ต้องเชื่อมต่ออินเทอร์เน็ต</div>${panes}</div></main>
<script>
const buttons=[...document.querySelectorAll('.sideNav nav button')];const panes=[...document.querySelectorAll('.offlineView')];
function show(name){buttons.forEach(b=>b.classList.toggle('active',b.dataset.target===name));panes.forEach(p=>p.classList.toggle('active',p.dataset.view===name));window.scrollTo(0,0)}
buttons.forEach(b=>b.addEventListener('click',()=>show(b.dataset.target)));show('overview');
document.querySelectorAll('.headerTools').forEach(h=>{const wrap=document.createElement('span');wrap.className='offlineActions';const print=document.createElement('button');print.textContent='พิมพ์ / บันทึก PDF';print.onclick=()=>window.print();wrap.appendChild(print);h.appendChild(wrap)});
const reportData=${JSON.stringify(reportData)};
const fmt=n=>new Intl.NumberFormat('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const short=n=>(Math.abs(n)/1e6).toFixed(2)+' ลบ.';
const monthKeys=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.'];
function activateBankFilter(viewName,direction){
 const page=document.querySelector('.offlineView[data-view="'+viewName+'"]');if(!page)return;
 const tabs=[...page.querySelectorAll('.outgoingTabs button')], rows=[...page.querySelectorAll('.recipientTable tbody tr')];
 const status=document.createElement('div');status.className='offlineCompleteness';page.querySelector('.outgoingHero')?.after(status);
 const updateStatus=(bank,count,groups)=>{status.innerHTML='<b>แสดงข้อมูลครบ '+count.toLocaleString('th-TH')+' รายการ</b> · '+groups.toLocaleString('th-TH')+' กลุ่ม'+(direction==='outgoing'?'ผู้รับ':'แหล่งเงิน')+' · '+(bank==='all'?'รวม KBANK, BBL และ KTB':'เฉพาะ '+bank)};
 updateStatus('all',rows.reduce((sum,row)=>sum+(Number(row.children[3]?.textContent.replace(/\D/g,''))||0),0),rows.length);
 tabs.forEach(tab=>tab.addEventListener('click',()=>{
  const bank=tab.textContent.includes('รวม 3')?'all':tab.textContent.trim();
  tabs.forEach(x=>x.classList.toggle('active',x===tab));
  const shown=rows.filter(row=>{const ok=bank==='all'||row.querySelector('.bankPill')?.textContent.trim()===bank;row.style.display=ok?'':'none';return ok});
  const bankData=bank==='all'?null:reportData.banks.find(x=>x.bank===bank);
  const total=bankData?bankData[direction]:reportData.totals[direction];
  const count=shown.reduce((sum,row)=>sum+(Number(row.children[3]?.textContent.replace(/\D/g,''))||0),0);
  const identified=shown.filter(row=>!row.querySelector('.categoryPill.unverified')).length;
  const unidentified=shown.filter(row=>row.querySelector('.categoryPill.unverified')).reduce((sum,row)=>sum+(Number(row.children[3]?.textContent.replace(/\D/g,''))||0),0);
  const kpis=[...page.querySelectorAll('.outgoingKpis article')];
  kpis[0].querySelector('strong').textContent='฿'+short(total);kpis[0].querySelector('small').textContent=fmt(total)+' บาท';
  kpis[1].querySelector('strong').textContent=count.toLocaleString('th-TH');kpis[1].querySelector('small').textContent='เฉลี่ย ฿'+fmt(total/Math.max(count,1))+' ต่อครั้ง';
  kpis[2].querySelector('strong').textContent=identified.toLocaleString('th-TH');
  kpis[3].querySelector('strong').textContent=unidentified.toLocaleString('th-TH');
  const monthData=bankData?bankData.months:reportData.combined;
  const monthCards=[...page.querySelectorAll('.outMonthGrid>div')];
  monthCards.forEach((card,i)=>{let mcount=0,people=0;shown.forEach(row=>{const txt=row.children[1]?.querySelector('small')?.textContent||'';const match=txt.match(new RegExp(monthKeys[i]+'\\\\s+(\\\\d+)\\\\s+ครั้ง'));if(match){mcount+=Number(match[1]);if(!row.querySelector('.categoryPill.unverified'))people++}});const amount=monthData[i]?.[direction]||0;card.querySelector('strong').textContent='฿'+short(amount);card.querySelector('small').textContent=mcount.toLocaleString('th-TH')+' ครั้ง · '+(direction==='outgoing'?'ระบุผู้รับได้ ':'ระบุแหล่งได้ ')+people.toLocaleString('th-TH')+(direction==='outgoing'?' ราย':' ราย/บัญชี')});
  shown.forEach(row=>{const amount=Number((row.children[4]?.textContent||'').replace(/[^\d.]/g,''))||0;const pct=amount/Math.max(total,1)*100;const cell=row.children[5];cell.querySelector('b').textContent=pct.toFixed(2)+'%';cell.querySelector('em').style.width=Math.min(100,pct)+'%'});
  const groupLabel=page.querySelector('.recipientSurface .sectionHead>b');if(groupLabel)groupLabel.textContent=shown.length.toLocaleString('th-TH')+(direction==='outgoing'?' กลุ่มผู้รับ':' กลุ่มแหล่งเงิน');
  updateStatus(bank,count,shown.length);
  window.scrollTo({top:page.querySelector('.outgoingHero').offsetTop-20,behavior:'smooth'});
 }));
}
activateBankFilter('outgoing','outgoing');activateBankFilter('incoming','incoming');
</script></body></html>`;

fs.writeFileSync(output, html, "utf8");
console.log(output);
