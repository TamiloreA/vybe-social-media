"use client";
import MainApp from "@/app/components/main-app";

export default function MessagesPage() {
  return <MainApp onSignOut={() => (window.location.href = "/auth/signin")} />;
}