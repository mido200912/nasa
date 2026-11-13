import type { Metadata } from "next";
import { MaterialsModule } from "@/components/dashboard/MaterialsModule";

export const metadata: Metadata = { title: "Material matrix" };
export default function MaterialsPage() { return <MaterialsModule />; }
