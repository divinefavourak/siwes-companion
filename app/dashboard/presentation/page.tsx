import { PresentationPreview } from "@/src/components/compile-preview";

export default function PresentationPage() {
  return <div className="space-y-8"><div><p className="text-sm font-semibold text-brand">Defend phase</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">A presentation you can explain.</h1><p className="mt-3 max-w-2xl leading-7 text-muted">Every slide starts with your documented record. Review the gaps and make the language yours.</p></div><PresentationPreview /></div>;
}
