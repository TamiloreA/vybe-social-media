"use client";
import { useRouter } from "next/navigation";

import GetStartedPage from "@/components/onboarding/GetStartedPage";

export default function Page() {
  const router = useRouter();
  return <GetStartedPage onComplete={() => router.replace("/")} />
}