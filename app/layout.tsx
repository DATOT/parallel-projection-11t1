import "./globals.css";
import "katex/dist/katex.min.css";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Phép chiếu song song",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`w-full h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
