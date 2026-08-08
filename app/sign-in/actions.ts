"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/session";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const allowed = (process.env.ADMIN_EMAILS ?? "").split(",").map((item) => item.trim().toLowerCase());
  if (!allowed.includes(email) || !process.env.AUTH_PASSWORD || password !== process.env.AUTH_PASSWORD) {
    redirect("/sign-in?error=1");
  }
  (await cookies()).set("sangchai_session", await createSession(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  redirect("/admin");
}

export async function signOut() {
  (await cookies()).delete("sangchai_session");
  redirect("/sign-in");
}
