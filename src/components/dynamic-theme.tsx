"use client";

import { HeroCarousel } from "@/components/hero-carousel";
import { ZitadelLogo } from "@/components/zitadel-logo";
import { BrandingSettings } from "@zitadel/proto/zitadel/settings/v2/branding_settings_pb";
import React, { ReactNode, Children } from "react";
import { ThemeWrapper } from "./theme-wrapper";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function DynamicTheme({
  branding,
  children,
}: {
  children: ReactNode | ((isSideBySide: boolean) => ReactNode);
  branding?: BrandingSettings;
}) {
  const actualChildren: ReactNode = React.useMemo(() => {
    if (typeof children === "function") {
      return (children as (isSideBySide: boolean) => ReactNode)(false);
    }
    return children;
  }, [children]);

  const childArray = Children.toArray(actualChildren);
  const titleContent = childArray[0] || null;
  const formContent = childArray[1] || null;
  const hasMultipleChildren = childArray.length > 1;

  return (
    <ThemeWrapper branding={branding}>
      <div className="flex min-h-screen flex-col">
        {/* Top bar: logo */}
        <header className="px-8 py-6">
          <a href="https://www.fion-energy.com">
            <ZitadelLogo height={26} width={90} />
          </a>
        </header>

        {/* Main: hero image + form side by side */}
        <main className="flex flex-1 items-center justify-center px-8 pb-8">
          <div className="flex w-full max-w-[960px] overflow-hidden rounded-xl">
            {/* Left: battery hero */}
            <div
              className="hidden w-[45%] min-h-[520px] flex-shrink-0 overflow-hidden rounded-l-xl md:block"
              style={{ backgroundColor: "#f2f2f2" }}
            >
              <HeroCarousel
                images={[{ src: `${basePath}/login-hero.jpg`, fit: "cover" }]}
              />
            </div>

            {/* Right: form */}
            <div className="flex flex-1 flex-col justify-center px-6 py-10 md:px-12">
              <div className="w-full max-w-[340px] mx-auto">
                {hasMultipleChildren ? (
                  <>
                    <div className="mb-6 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-gray-900 [&_h1]:dark:text-white [&_p]:text-sm [&_p]:text-gray-500 [&_p]:dark:text-gray-400 [&_p]:mt-1">
                      {titleContent}
                    </div>
                    <div className="space-y-4">{formContent}</div>
                  </>
                ) : (
                  <div className="space-y-4">{actualChildren}</div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Footer: legal links */}
        <footer className="flex justify-center gap-6 px-4 py-6 text-sm text-gray-400">
          <a
            href="https://www.fion-energy.com/impressum"
            className="transition-colors hover:text-gray-600"
          >
            Impressum
          </a>
          <a
            href="https://www.fion-energy.com/datenschutz"
            className="transition-colors hover:text-gray-600"
          >
            Datenschutz
          </a>
        </footer>
      </div>
    </ThemeWrapper>
  );
}
