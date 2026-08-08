import { getSql } from "@/db";
import { requireUser } from "@/lib/access";

const seeds = [
  ["related-sangchai","หจก. แสงชัยพาณิช","หจก. แสงชัยพาณิช","กิจการเกี่ยวข้อง",["KBANK X1654","KBANK X9397"],47,10394868054,"รอตรวจสอบ"],
  ["aba-fcci","ABA/FCCI GASKET","ABA/FCCI GASKET","คู่ค้านิติบุคคล",["KTB 0431095815","KTB 0033965656"],3,143995800,"ยืนยันแล้ว"],
  ["yss","บมจ. วาย.เอส.เอส. (ประเทศไทย)","บมจ. วาย.เอส.เอส. (ประเทศไทย)","คู่ค้านิติบุคคล",["X0590","X0630"],3,20653440,"รอตรวจสอบ"],
  ["niyom","NIYOM PANICH CO.","NIYOM PANICH CO.","คู่ค้านิติบุคคล",["BBL X0028","BBL X0017"],4,1639951,"รอตรวจสอบ"],
  ["natnaree","น.ส. ณัฐนรี มีช","น.ส. ณัฐนรี มีช","บุคคล",["X6049","BBL X9123"],7,147458100,"รอตรวจสอบ"],
  ["phonlachet","นายพลเชฏฐ์ พัฒนาก…","นายพลเชฏฐ์ พัฒนาก…","บุคคล",["BBL X7723","X6456"],6,120546400,"รอตรวจสอบ"],
  ["worapan","น.ส. วรพรรณ เลาหวั…","น.ส. วรพรรณ เลาหวั…","บุคคล",["X0823","BBL X4948"],10,64543400,"รอตรวจสอบ"],
  ["sudarat","นาง สุดารัตน์ เด่น…","นาง สุดารัตน์ เด่น…","บุคคล",["BBL X5026","SCB X3060"],2,47764800,"รอตรวจสอบ"],
  ["suwanee","นาง สุวณีย์ จ…","นาง สุวณีย์ จ…","บุคคล",["UOB X3669","X9888","SCB X3722"],10,26229750,"รอตรวจสอบ"],
  ["sorasak","นาย สรศักย์ สรัลพั…","นาย สรศักย์ สรัลพั…","บุคคล",["SCB X8634","BBL X2078"],5,22317711,"รอตรวจสอบ"],
  ["khajit","นาย ขจิต ชัยวิวัธ…","นาย ขจิต ชัยวิวัธ…","บุคคล",["SCB X9459","X9443"],2,20300000,"รอตรวจสอบ"],
  ["suradet","นาย สุรเดช ยั่งยืน","นาย สุรเดช ยั่งยืน","บุคคล",["BBL X5519","UOB X1008"],7,16087100,"รอตรวจสอบ"],
  ["montri","นาย มนตรี คุณสารสม…","นาย มนตรี คุณสารสม…","บุคคล",["TTB X5680","X8724"],6,12600000,"รอตรวจสอบ"],
  ["than","นาย ฐาน์ อภัยยานุ","นาย ฐาน์ อภัยยานุ","บุคคล",["X2979","KTB X1379"],4,7867600,"รอตรวจสอบ"],
  ["thipaporn","น.ส. ธิพาพร ดอนโค…","น.ส. ธิพาพร ดอนโค…","บุคคล",["KTB X7998","X9826"],4,4436500,"รอตรวจสอบ"],
] as const;

async function ensure(){
  const sql=getSql();
  await sql.query(`CREATE TABLE IF NOT EXISTS vendor_profiles (id text PRIMARY KEY,source_name text NOT NULL,canonical_name text NOT NULL,category text NOT NULL DEFAULT 'รอตรวจสอบ',accounts_json text NOT NULL DEFAULT '[]',transaction_count integer NOT NULL DEFAULT 0,total_amount_satang bigint NOT NULL DEFAULT 0,review_status text NOT NULL DEFAULT 'รอตรวจสอบ',note text NOT NULL DEFAULT '',updated_at timestamptz NOT NULL DEFAULT now())`);
  await sql.query(`CREATE TABLE IF NOT EXISTS dashboard_audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),action text NOT NULL,entity_type text NOT NULL,entity_id text NOT NULL,summary text NOT NULL,before_json text,after_json text,actor text NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`);
  for(const row of seeds)await sql.query(`INSERT INTO vendor_profiles (id,source_name,canonical_name,category,accounts_json,transaction_count,total_amount_satang,review_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,[row[0],row[1],row[2],row[3],JSON.stringify(row[4]),row[5],row[6],row[7]]);
}

export async function GET(){try{await requireUser();await ensure();const vendors=await getSql().query(`SELECT * FROM vendor_profiles ORDER BY total_amount_satang DESC`);return Response.json({vendors})}catch(e){return Response.json({error:e instanceof Error?e.message:"อ่านฐานข้อมูลไม่สำเร็จ"},{status:500})}}
export async function PATCH(request:Request){try{const actor=await requireUser();await ensure();const b=await request.json(),accounts=[...new Set((Array.isArray(b.accounts)?b.accounts:JSON.parse(String(b.accounts_json||"[]"))).map((x:unknown)=>String(x).trim()).filter(Boolean))];if(!b.id||!String(b.canonical_name||"").trim()||!accounts.length)return Response.json({error:"ข้อมูลคู่ค้าไม่ครบ"},{status:400});const sql=getSql(),beforeRows=await sql.query(`SELECT * FROM vendor_profiles WHERE id=$1`,[b.id]),before=(beforeRows as unknown as Record<string,unknown>[])[0];await sql.query(`UPDATE vendor_profiles SET canonical_name=$1,category=$2,accounts_json=$3,review_status=$4,note=$5,updated_at=now() WHERE id=$6`,[String(b.canonical_name).trim(),String(b.category),JSON.stringify(accounts),String(b.review_status),String(b.note||""),b.id]);const afterRows=await sql.query(`SELECT * FROM vendor_profiles WHERE id=$1`,[b.id]),after=(afterRows as unknown as Record<string,unknown>[])[0];await sql.query(`INSERT INTO dashboard_audit_logs(action,entity_type,entity_id,summary,before_json,after_json,actor) VALUES('UPDATE','vendor',$1,$2,$3,$4,$5)`,[b.id,`แก้ไขคู่ค้า ${b.canonical_name}`,JSON.stringify(before),JSON.stringify(after),actor.email]);return Response.json({ok:true})}catch(e){return Response.json({error:e instanceof Error?e.message:"บันทึกไม่สำเร็จ"},{status:500})}}
