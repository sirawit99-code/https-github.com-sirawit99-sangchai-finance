import { env } from "cloudflare:workers";

const seeds = [
  ["related-sangchai","หจก. แสงชัยพาณิช","หจก. แสงชัยพาณิช","กิจการเกี่ยวข้อง",'["KBANK X1654","KBANK X9397"]',47,10394868054,"รอตรวจสอบ"],
  ["aba-fcci","ABA/FCCI GASKET","ABA/FCCI GASKET","คู่ค้านิติบุคคล",'["KTB 0431095815","KTB 0033965656"]',3,143995800,"ยืนยันแล้ว"],
  ["yss","บมจ. วาย.เอส.เอส. (ประเทศไทย)","บมจ. วาย.เอส.เอส. (ประเทศไทย)","คู่ค้านิติบุคคล",'["X0590","X0630"]',3,20653440,"รอตรวจสอบ"],
  ["niyom","NIYOM PANICH CO.","NIYOM PANICH CO.","คู่ค้านิติบุคคล",'["BBL X0028","BBL X0017"]',4,1639951,"รอตรวจสอบ"],
  ["natnaree","น.ส. ณัฐนรี มีช","น.ส. ณัฐนรี มีช","บุคคล",'["X6049","BBL X9123"]',7,147458100,"รอตรวจสอบ"],
  ["phonlachet","นายพลเชฏฐ์ พัฒนาก…","นายพลเชฏฐ์ พัฒนาก…","บุคคล",'["BBL X7723","X6456"]',6,120546400,"รอตรวจสอบ"],
  ["worapan","น.ส. วรพรรณ เลาหวั…","น.ส. วรพรรณ เลาหวั…","บุคคล",'["X0823","BBL X4948"]',10,64543400,"รอตรวจสอบ"],
  ["sudarat","นาง สุดารัตน์ เด่น…","นาง สุดารัตน์ เด่น…","บุคคล",'["BBL X5026","SCB X3060"]',2,47764800,"รอตรวจสอบ"],
  ["suwanee","นาง สุวณีย์ จ…","นาง สุวณีย์ จ…","บุคคล",'["UOB X3669","X9888","SCB X3722"]',10,26229750,"รอตรวจสอบ"],
  ["sorasak","นาย สรศักย์ สรัลพั…","นาย สรศักย์ สรัลพั…","บุคคล",'["SCB X8634","BBL X2078"]',5,22317711,"รอตรวจสอบ"],
  ["khajit","นาย ขจิต ชัยวิวัธ…","นาย ขจิต ชัยวิวัธ…","บุคคล",'["SCB X9459","X9443"]',2,20300000,"รอตรวจสอบ"],
  ["suradet","นาย สุรเดช ยั่งยืน","นาย สุรเดช ยั่งยืน","บุคคล",'["BBL X5519","UOB X1008"]',7,16087100,"รอตรวจสอบ"],
  ["montri","นาย มนตรี คุณสารสม…","นาย มนตรี คุณสารสม…","บุคคล",'["TTB X5680","X8724"]',6,12600000,"รอตรวจสอบ"],
  ["than","นาย ฐาน์ อภัยยานุ","นาย ฐาน์ อภัยยานุ","บุคคล",'["X2979","KTB X1379"]',4,7867600,"รอตรวจสอบ"],
  ["thipaporn","น.ส. ธิพาพร ดอนโค…","น.ส. ธิพาพร ดอนโค…","บุคคล",'["KTB X7998","X9826"]',4,4436500,"รอตรวจสอบ"],
] as const;

async function ensureDatabase(){
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS vendor_profiles (
      id TEXT PRIMARY KEY, source_name TEXT NOT NULL, canonical_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'รอตรวจสอบ', accounts_json TEXT NOT NULL DEFAULT '[]',
      transaction_count INTEGER NOT NULL DEFAULT 0, total_amount_satang INTEGER NOT NULL DEFAULT 0,
      review_status TEXT NOT NULL DEFAULT 'รอตรวจสอบ', note TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_vendor_profiles_status ON vendor_profiles(review_status)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_vendor_profiles_name ON vendor_profiles(canonical_name)"),
  ]);
  await env.DB.batch(seeds.map(row=>env.DB.prepare("INSERT OR IGNORE INTO vendor_profiles (id,source_name,canonical_name,category,accounts_json,transaction_count,total_amount_satang,review_status) VALUES (?,?,?,?,?,?,?,?)").bind(...row)));
}

export async function GET(){
  try{await ensureDatabase();const result=await env.DB.prepare("SELECT * FROM vendor_profiles ORDER BY total_amount_satang DESC").all();return Response.json({vendors:result.results})}
  catch(error){return Response.json({error:error instanceof Error?error.message:"อ่านฐานข้อมูลคู่ค้าไม่สำเร็จ"},{status:500})}
}

export async function PATCH(request:Request){
  try{
    await ensureDatabase();const body=await request.json() as Record<string,unknown>;const id=String(body.id||"");
    const name=String(body.canonical_name||"").trim(),category=String(body.category||"").trim(),status=String(body.review_status||"").trim(),note=String(body.note||"").trim();
    if(!id||!name)return Response.json({error:"กรุณาระบุชื่อมาตรฐาน"},{status:400});
    if(!["กิจการเกี่ยวข้อง","คู่ค้านิติบุคคล","บุคคล","พนักงาน","หน่วยงานรัฐ","อื่นๆ","รอตรวจสอบ"].includes(category))return Response.json({error:"ประเภทไม่ถูกต้อง"},{status:400});
    if(!["รอตรวจสอบ","ยืนยันแล้ว","ต้องแก้ไข","ไม่ใช่รายเดียวกัน"].includes(status))return Response.json({error:"สถานะไม่ถูกต้อง"},{status:400});
    await env.DB.prepare("UPDATE vendor_profiles SET canonical_name=?,category=?,review_status=?,note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(name,category,status,note,id).run();
    return Response.json({ok:true});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"บันทึกไม่สำเร็จ"},{status:500})}
}
