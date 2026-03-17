import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Clara - Conciliacao",
  description: "Gestao e conciliacao de cartao corporativo Clara — Welcome Group",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={cn("font-sans antialiased", inter.variable)}>
      <body className="min-h-screen bg-background">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
