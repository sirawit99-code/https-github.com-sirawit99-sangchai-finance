import { redirect } from "next/navigation";
import FileLibrary from "@/components/files/file-library-client";
import { requireUser } from "@/lib/access";
import "./files.css";
import "./password.css";
import "./register-dates.css";

export const dynamic = "force-dynamic";

export default async function FilesPage(){
  try{await requireUser()}catch{redirect("/sign-in")}
  return <FileLibrary/>;
}
