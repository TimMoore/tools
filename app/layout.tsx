import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import "./globals.css";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { ToolCase } from "lucide-react";

export const metadata: Metadata = {
  title: "Tools",
  description: "Miscellaneous utilities by Tim Marcus Moore",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="antialiased flex flex-col h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="flex-none flex items-center border-b p-2">
            <ToolCase className="m-2" />
            <h1 className="text-2xl font-bold tracking-tight">Tools</h1>
            <ModeToggle className="ml-auto" />
          </header>
          <main className="grow flex flex-col items-center justify-center overflow-hidden p-4">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
