import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { MigrationPrompt } from "@/components/migration-prompt";

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
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <>
            <MigrationPrompt />
            {children}
          </>
        </ThemeProvider>
      </body>
    </html>
  );
}
