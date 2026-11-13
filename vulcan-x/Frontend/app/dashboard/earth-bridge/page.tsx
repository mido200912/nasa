import type { Metadata } from "next";
import { EarthBridgeModule } from "@/components/dashboard/EarthBridgeModule";

export const metadata: Metadata = { title: "Earth bridge" };
export default function EarthBridgePage() { return <EarthBridgeModule />; }
