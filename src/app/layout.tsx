import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

const name = process.env.NEXT_PUBLIC_APP_NAME || "Car Wash Management";
export const metadata: Metadata = { title: { default: name, template: `%s · ${name}` }, description: "Car wash operations, queue and bay management." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0887ae" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased"><Providers>{children}</Providers></body>
    </html>
  );
}
