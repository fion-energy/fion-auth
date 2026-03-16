"use client";

import { HeroCarousel } from "@/components/hero-carousel";
import { ZitadelLogo } from "@/components/zitadel-logo";
import { BrandingSettings } from "@zitadel/proto/zitadel/settings/v2/branding_settings_pb";
import React, { ReactNode, Children } from "react";
import { ThemeWrapper } from "./theme-wrapper";
import { Card } from "./card";
import { useResponsiveLayout } from "@/lib/theme-hooks";

/**
 * DynamicTheme component handles layout switching between traditional top-to-bottom
 * and modern side-by-side layouts based on NEXT_PUBLIC_THEME_LAYOUT.
 *
 * For side-by-side layout:
 * - First child: Goes to left side (title, description, etc.)
 * - Second child: Goes to right side (forms, buttons, etc.)
 * - Single child: Falls back to right side for backward compatibility
 *
 * For top-to-bottom layout:
 * - All children rendered in traditional centered layout
 */
export function DynamicTheme({
  branding,
  children,
}: {
  children: ReactNode | ((isSideBySide: boolean) => ReactNode);
  branding?: BrandingSettings;
}) {
  const { isSideBySide } = useResponsiveLayout();

  // Resolve children immediately to avoid passing functions through React
  const actualChildren: ReactNode = React.useMemo(() => {
    if (typeof children === "function") {
      return (children as (isSideBySide: boolean) => ReactNode)(isSideBySide);
    }
    return children;
  }, [children, isSideBySide]);

  return (
    <ThemeWrapper branding={branding}>
      {isSideBySide
        ? // Side-by-side layout: first child goes left, second child goes right
          (() => {
            const childArray = Children.toArray(actualChildren);
            const leftContent = childArray[0] || null;
            const rightContent = childArray[1] || null;

            // If there's only one child, it's likely the old format - keep it on the right side
            const hasLeftRightStructure = childArray.length === 2;

            const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

            return (
              <div className="relative mx-auto w-full max-w-[1100px] py-4 px-8">
                <Card padding="p-0">
                  <div className="flex">
                    {/* Left side: Hero image, shown in full */}
                    <div className="w-[45%] min-h-[520px] flex-shrink-0 overflow-hidden rounded-l-lg" style={{ backgroundColor: "#f2f2f2" }}>
                      <HeroCarousel
                        images={[
                          { src: `${basePath}/login-hero.jpg`, fit: "cover" },
                        ]}
                      />
                    </div>

                    {/* Right side: form */}
                    <div className="flex flex-1 flex-col p-6 lg:px-12 lg:py-10">
                      <a
                        href="https://www.fion-energy.com"
                        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-auto"
                      >
                        &larr; Homepage
                      </a>
                      <div className="w-full max-w-[380px] mx-auto mt-auto mb-auto pb-16">
                        {hasLeftRightStructure && (
                          <div className="mb-5">
                            <div className="[&_h1]:text-2xl [&_h1]:font-normal [&_h1]:text-gray-900 [&_h1]:dark:text-white [&_p]:text-sm [&_p]:text-gray-500 [&_p]:dark:text-gray-400 [&_p]:mt-1">
                              {leftContent}
                            </div>
                          </div>
                        )}
                        <div className="space-y-4">{hasLeftRightStructure ? rightContent : leftContent}</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })()
        : // Traditional top-to-bottom layout - center title/description, left-align forms
          (() => {
            const childArray = Children.toArray(actualChildren);
            const titleContent = childArray[0] || null;
            const formContent = childArray[1] || null;
            const hasMultipleChildren = childArray.length > 1;

            return (
              <div className="relative mx-auto w-full max-w-[440px] py-4 px-4">
                <Card>
                  <div className="mx-auto flex flex-col items-center space-y-8">
                    <div className="relative flex flex-row items-center justify-center -mb-4">
                      <ZitadelLogo height={32} width={120} />
                    </div>

                    {hasMultipleChildren ? (
                      <>
                        {/* Title and description - center aligned */}
                        <div className="w-full text-center flex flex-col items-center mb-4">{titleContent}</div>

                        {/* Form content - left aligned */}
                        <div className="w-full">{formContent}</div>
                      </>
                    ) : (
                      // Single child - use original behavior
                      <div className="w-full">{actualChildren}</div>
                    )}

                    <div className="flex flex-row justify-between"></div>
                  </div>
                </Card>
              </div>
            );
          })()}
    </ThemeWrapper>
  );
}
