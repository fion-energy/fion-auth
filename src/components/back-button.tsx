"use client";

import { useRouter } from "next/navigation";
import { Translated } from "./translated";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      type="button"
      className="inline-flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-gray-600"
    >
      &larr; <Translated i18nKey="back" namespace="common" />
    </button>
  );
}
