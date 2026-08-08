import { cookies } from "next/headers";
import { readSession } from "@/lib/session";

export type AppRole = "admin" | "reviewer" | "viewer";

function allowlist() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireUser() {
  const token = (await cookies()).get("sangchai_session")?.value;
  const session = await readSession(token);
  if (!session) throw new Error("UNAUTHENTICATED");
  const email = session.email.toLowerCase();
  if (!allowlist().includes(email)) throw new Error("FORBIDDEN");
  return { userId: email, email, role: "admin" as AppRole };
}

export async function requireApprover() {
  const actor = await requireUser();
  if (actor.role !== "admin" && actor.role !== "reviewer") throw new Error("FORBIDDEN");
  return actor;
}
