import { TelegramSignIn } from "./telegram-sign-in";
import { safeTelegramLinkDestination } from "@/src/lib/telegram-link-destinations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Signing in — SIWES Companion" };

export default async function TelegramSignInPage({ searchParams }: { searchParams: Promise<{ token?: string; next?: string }> }) {
  const { token, next } = await searchParams;
  return <TelegramSignIn token={token ?? ""} destination={safeTelegramLinkDestination(next)} />;
}
