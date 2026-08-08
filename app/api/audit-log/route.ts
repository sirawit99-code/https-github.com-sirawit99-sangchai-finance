import { env } from "cloudflare:workers";

export async function GET(){
  try{
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY,action TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,summary TEXT NOT NULL,before_json TEXT,after_json TEXT,actor TEXT NOT NULL DEFAULT 'Dashboard user',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
    const result=await env.DB.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100").all();
    return Response.json({logs:result.results});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"อ่าน Audit Log ไม่สำเร็จ"},{status:500})}
}
