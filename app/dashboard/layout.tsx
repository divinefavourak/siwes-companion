import { redirect } from "next/navigation";
import { DashboardShell } from "@/src/components/dashboard-shell";
import { getViewer } from "@/src/lib/viewer";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  return (
    <DashboardShell studentName={viewer.name} isAdmin={viewer.role === "ADMIN"}>
      {children}
    </DashboardShell>
  );
}
