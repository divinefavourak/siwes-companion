import { redirect } from "next/navigation";
import type { Route } from "next";

export default function AdminRoot() {
  redirect("/admin/dashboard" as Route);
}
