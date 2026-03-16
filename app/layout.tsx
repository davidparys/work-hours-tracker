import type { Metadata } from 'next'
import Script from "next/script";
import { GeistSans } from 'geist/font/sans'
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { MigrationPrompt } from "@/components/migration-prompt";
import { CurrencyProvider } from "@/lib/context/currency-context";

export const metadata: Metadata = {
  title: "Work Hours Tracker",
  description: "Track your work hours efficiently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/@react-grab/mcp/dist/client.global.js"
            strategy="lazyOnload"
          />
        )}
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CurrencyProvider>
            <MigrationPrompt />
            {children}
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
