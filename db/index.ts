import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("ยังไม่ได้ตั้งค่า DATABASE_URL");
  return drizzle(neon(url), { schema });
}

let instance: ReturnType<typeof createDb> | null = null;
let sqlInstance: ReturnType<typeof neon> | null = null;

export function getDb() {
  if (!instance) instance = createDb();
  return instance;
}

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("ยังไม่ได้ตั้งค่า DATABASE_URL");
  if (!sqlInstance) sqlInstance = neon(url);
  return sqlInstance;
}
