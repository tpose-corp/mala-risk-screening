// Root layout: wraps every page. Fonts: Noto Sans Thai (as on the network's NPCU site) for all
// text, IBM Plex Mono for numbers like HN.
import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "MALA Risk Screening",
  description: "ระบบคัดกรองความเสี่ยง MALA สำหรับหน่วยบริการปฐมภูมิ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${notoThai.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
