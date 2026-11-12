import { CommandHero } from "@/components/CommandHero";
import { FireParadox } from "@/components/FireParadox";
import { EnginePreviews } from "@/components/EnginePreviews";
import { SystemArchitecture } from "@/components/SystemArchitecture";

export default function Home() {
  return <main id="main-content">
    <CommandHero />
    <div className="research-strip"><span className="mono">BUILT AROUND THE QUESTIONS IN</span><span>NASA Physical Sciences Informatics</span><div className="research-datasets mono"><span>BASS-II</span><span>SAFFIRE</span><span>FLEX</span><span>ACME</span></div><span className="mono research-strip-note">RESEARCH CONTEXT, NOT ENDORSEMENT</span></div>
    <FireParadox />
    <EnginePreviews />
    <SystemArchitecture />
  </main>;
}
