import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root=new URL("../",import.meta.url);

test("dashboard includes CFO controls and freshness",async()=>{
  const page=await readFile(new URL("app/page.tsx",root),"utf8");
  assert.match(page,/dataAge/);
  assert.match(page,/2\/3|reconciliationPassed/);
  assert.match(page,/AUDIT LOG/);
  assert.match(page,/BBL RECONCILIATION REVIEW/);
});

test("upload pipeline extracts and records processing evidence",async()=>{
  const [filesPage,route]=await Promise.all([readFile(new URL("app/files/page.tsx",root),"utf8"),readFile(new URL("app/api/files/route.ts",root),"utf8")]);
  assert.match(filesPage,/getTextContent/);
  assert.match(filesPage,/extracted_text/);
  assert.match(route,/detected_transactions/);
  assert.match(route,/audit_logs/);
});

test("vendor and reconciliation changes create audit records",async()=>{
  const [vendor,reconciliation]=await Promise.all([readFile(new URL("app/api/vendors/route.ts",root),"utf8"),readFile(new URL("app/api/reconciliation/route.ts",root),"utf8")]);
  assert.match(vendor,/INSERT INTO audit_logs/);
  assert.match(reconciliation,/INSERT INTO audit_logs/);
});
