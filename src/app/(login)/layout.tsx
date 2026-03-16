import "@/styles/globals.scss";

import { LanguageProvider } from "@/components/language-provider";
import { Skeleton } from "@/components/skeleton";
import { ThemeProvider } from "@/components/theme-provider";
import * as Tooltip from "@radix-ui/react-tooltip";
import { GeistSans } from "geist/font/sans";
import { ReactNode, Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return { title: t("title") };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head />
      <body className={`${GeistSans.variable} font-sans bg-white dark:bg-gray-950`}>
        <ThemeProvider>
          <Tooltip.Provider>
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center">
                  <Skeleton>
                    <div className="h-40 w-[340px]"></div>
                  </Skeleton>
                </div>
              }
            >
              <LanguageProvider>
                {children}
              </LanguageProvider>
            </Suspense>
          </Tooltip.Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
