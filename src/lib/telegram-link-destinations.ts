/**
 * Pages a Telegram sign-in link may land on. A fixed allow-list rather than an arbitrary
 * `next` URL, so a crafted link can't bounce a freshly signed-in student to another site.
 */
export const TELEGRAM_LINK_DESTINATIONS = ["/dashboard", "/settings/password"] as const;

export type TelegramLinkDestination = (typeof TELEGRAM_LINK_DESTINATIONS)[number];

export function safeTelegramLinkDestination(value: string | null | undefined): TelegramLinkDestination {
  return TELEGRAM_LINK_DESTINATIONS.find((destination) => destination === value) ?? "/dashboard";
}
