const LOCAL_SITE_URL = "http://localhost:3000";

export const siteConfig = {
  name: "Sleepy",
  description: "写下技术，也写下生活。",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? LOCAL_SITE_URL,
} as const;

export function getSiteUrl() {
  try {
    return new URL(siteConfig.url);
  } catch {
    return new URL(LOCAL_SITE_URL);
  }
}
