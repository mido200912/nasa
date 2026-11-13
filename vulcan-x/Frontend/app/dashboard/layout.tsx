import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import "./dashboard.css";

export const metadata: Metadata = { title: { default: "Command center — VULCAN-X", template: "%s — VULCAN-X" }, description: "Explore illustrative habitat scenarios, material comparisons, research references, and review-only playbooks." };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
