import type { Metadata } from "next";
import { PlaybookModule } from "@/components/dashboard/PlaybookModule";

export const metadata: Metadata = { title: "Safety playbook" };
export default function PlaybookPage() { return <PlaybookModule />; }
