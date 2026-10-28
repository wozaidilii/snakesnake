import "~/styles/globals.css";

import { type Metadata } from "next";
import { ZCOOL_KuaiLe } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "老母鸡 Henyard",
  description: "白母鸡带着黄小鸡穿过谷场。啄谷、推木桶、送蛋，必要时把队伍剪成两只。",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const farm = ZCOOL_KuaiLe({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh" className={farm.className}>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
