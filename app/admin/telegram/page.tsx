import { Suspense } from "react";
import { MessageCircle } from "lucide-react";
import { requireAdmin } from "@/src/lib/admin-auth";
import { TelegramTable } from "@/src/components/admin/telegram-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Telegram — Admin" };

export default async function AdminTelegramPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-blue-50 border border-blue-100">
          <MessageCircle className="size-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Telegram Integration</h1>
          <p className="text-sm text-slate-500">Monitor linked identities and bot conversation states.</p>
        </div>
      </div>
      <Suspense fallback={<div className="text-sm text-slate-400">Loading…</div>}>
        <TelegramTable />
      </Suspense>
    </div>
  );
}

