import { requireAdmin } from "@/src/lib/admin-auth";
import { AdminShell } from "@/src/components/admin/admin-shell";

export const metadata = { title: "Admin — SIWES Companion" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  return <AdminShell adminName={admin.name}>{children}</AdminShell>;
}
