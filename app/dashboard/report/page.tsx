import { ReportPreview } from "@/src/components/compile-preview";

export default function ReportPage() {
  return <div className="space-y-8"><div><p className="text-sm font-semibold text-brand">Compile phase</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Your report, section by section.</h1><p className="mt-3 max-w-2xl leading-7 text-muted">These sections are assembled from reviewed entries. Gaps are shown for you to complete, never filled with invented experience.</p></div><ReportPreview /></div>;
}
