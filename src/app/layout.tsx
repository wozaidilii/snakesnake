import "~/styles/globals.css";

import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "咕咕归巢 Henyard · 一起回家",
  description: "温暖的像素农场解谜。带小鸡收集浆果、推木桶、送鸡蛋，在 24 个手工关卡里慢慢发现，一起回家。",
  icons: [{ rel: "icon", url: "/icon.svg", type: "image/svg+xml" }],
};


export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
