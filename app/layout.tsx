import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Kron Card Game", description: "Protótipo multiplayer: uma sala e dois jogadores." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="pt-BR"><body>{children}</body></html>;
}