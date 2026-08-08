import { currentUser } from "@clerk/nextjs/server";

export type AppRole = "admin" | "reviewer" | "viewer";

function allowlist() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireUser() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress.toLowerCase();
  if (!user || !email) throw new Error("UNAUTHENTICATED");
  const assignedRole = user.publicMetadata.role;
  let role: AppRole;
  if (allowlist().includes(email)) role = "admin";
  else if (assignedRole === "reviewer" || assignedRole === "viewer") role = assignedRole;
  else throw new Error("FORBIDDEN");
  return { userId: user.id, email, role };
}

export async function requireApprover() {
  const actor = await requireUser();
  if (actor.role !== "admin" && actor.role !== "reviewer") throw new Error("FORBIDDEN");
  return actor;
}
