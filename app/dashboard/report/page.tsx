import { FileCheck } from "lucide-react";
import { ReportPreview } from "@/src/components/compile-preview";

export default function ReportPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-brand">
          <FileCheck className="size-3.5" /> Technical Report Assembly
        </div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Institutional Technical Report
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 max-w-2xl">
          Assembled chapter by chapter from your verified daily entries. Any identified documentation gaps are highlighted for you to substantiate before supervisor sign-off.
        </p>
      </div>

      <ReportPreview />
    </div>
  );
}
