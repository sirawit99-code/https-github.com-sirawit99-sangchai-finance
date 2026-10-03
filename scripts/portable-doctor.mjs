import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const failures = [];
const warnings = [];
const checks = [];
const pass = (message) => checks.push(`✓ ${message}`);
const fail = (message) => failures.push(`✗ ${message}`);

const major = Number(process.versions.node.split(".")[0]);
if (major >= 22) pass(`Node.js ${process.versions.node}`);
else fail(`ต้องใช้ Node.js 22.13 ขึ้นไป (พบ ${process.versions.node})`);

const required = ["package.json", "package-lock.json", ".openai/hosting.json", "public/dashboard-data.json", "app/page.tsx", "PROJECT_CONTEXT.md"];
for (const file of required) {
  if (existsSync(file)) pass(`พบ ${file}`);
  else fail(`ไม่พบ ${file}`);
}

if (existsSync(".openai/hosting.json")) {
  const hosting = JSON.parse(readFileSync(".openai/hosting.json", "utf8"));
  if (hosting.project_id) pass("มี Sites project ID");
  else fail("hosting.json ไม่มี project_id");
  if (hosting.d1 === "DB") pass("D1 binding = DB");
  else fail("D1 binding ต้องชื่อ DB");
  if (hosting.r2 === "FILES") pass("R2 binding = FILES");
  else fail("R2 binding ต้องชื่อ FILES");
}

if (existsSync("public/dashboard-data.json")) {
  const data = JSON.parse(readFileSync("public/dashboard-data.json", "utf8"));
  if (data.banks?.length === 3) pass("Snapshot มีข้อมูล 3 ธนาคาร");
  else fail("Snapshot ต้องมีข้อมูล 3 ธนาคาร");
  if (data.transactions?.length) pass(`Snapshot มี ${data.transactions.length.toLocaleString("en-US")} รายการ`);
  else fail("Snapshot ไม่มีรายการเดินบัญชี");
  if (data.meta?.period?.includes("30 ก.ย.")) pass(`รอบข้อมูล ${data.meta.period}`);
  else warnings.push(`! ตรวจรอบข้อมูลอีกครั้ง: ${data.meta?.period ?? "ไม่ระบุ"}`);
}

try {
  const remotes = execFileSync("git", ["remote", "-v"], { encoding: "utf8" });
  if (remotes.includes("github.com")) pass("ตั้งค่า GitHub remote แล้ว");
  else warnings.push("! ยังไม่มี GitHub remote");
  if (remotes.includes("git.chatgpt-team.site")) pass("ตั้งค่า Sites remote แล้ว");
  else warnings.push("! ไม่มี Sites remote (ใช้ได้เฉพาะ local/GitHub)");
} catch {
  warnings.push("! อ่าน Git remotes ไม่สำเร็จ");
}

console.log("\nPortable project check\n");
for (const item of checks) console.log(item);
for (const item of warnings) console.log(item);
for (const item of failures) console.error(item);
console.log(`\nผลตรวจ: ${failures.length ? `ไม่ผ่าน ${failures.length} จุด` : "พร้อมใช้งาน"}\n`);
process.exitCode = failures.length ? 1 : 0;
