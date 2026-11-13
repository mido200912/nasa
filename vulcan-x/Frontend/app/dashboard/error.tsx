"use client";
import Link from "next/link";

export default function DashboardError({ reset }: { reset: () => void }) {
  return <section className="cc-panel"><h1>This module could not load.</h1><p>Your saved scenario stays in this browser session. Retry the module or return to the explorer.</p><div className="cc-actions"><button className="button" onClick={reset}>Try again</button><Link className="button button-outline" href="/">Return to explorer</Link></div></section>;
}
