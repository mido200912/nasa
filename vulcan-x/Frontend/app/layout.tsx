import type { Metadata, Viewport } from "next";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow/700.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "VULCAN-X — Beyond Earth. Beyond fire as we know it.",
  description: "An interactive habitat fire-science demonstrator. Explore procedural worlds, atmospheric what-if scenarios, NASA combustion research, and Earth-side applications.",
  applicationName: "VULCAN-X",
};
export const viewport: Viewport = { themeColor: "#050508", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body></html>;
}
