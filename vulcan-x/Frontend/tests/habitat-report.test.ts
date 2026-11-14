import { describe, expect, it } from "vitest";
import { prepareHabitatReport } from "@/lib/habitat-report";

describe("Habitat report presentation", () => {
  it("repairs the flattened headings and inline bullets shown in saved AI responses", () => {
    const stored = "Habitat Fire and Combustion Assessment: Lunar Habitat **Qualitative Assessment** - **Oxygen:** At 34% volume, evidence is incomplete. - **Pressure:** Pressure is 2 kPa. **Evidence Gaps and Research Needed** - Missing temperature. **Sources** – NASA research.";
    const report = prepareHabitatReport(stored);
    expect(report.markdown).toContain("## Qualitative Assessment\n\n- **Oxygen:**");
    expect(report.markdown).toContain("\n\n- **Pressure:** Pressure is 2 kPa.");
    expect(report.markdown).toContain("## Evidence Gaps and Research Needed");
    expect(report.preview).toContain("Oxygen: At 34% volume, evidence is incomplete.");
    expect(report.preview).not.toContain("**");
    expect(stored).toContain(" **Qualitative Assessment** - **Oxygen:**");
  });

  it("does not rewrite numeric values, units, negative values or ordinary hyphenated text", () => {
    const text = "Pressure is 101.325 kPa; temperature is -22 °C. Grade-specific, source-backed evidence at 1-g is missing.";
    expect(prepareHabitatReport(text)).toMatchObject({ markdown: text, preview: text, hasMore: false });
  });

  it("keeps the complete report and makes an explicitly bounded excerpt for long responses", () => {
    const text = "## Assessment\n\n" + "More material-specific evidence is needed. ".repeat(90);
    const report = prepareHabitatReport(text);
    expect(report.markdown).toBe(text.trim());
    expect(report.preview.length).toBeLessThanOrEqual(641);
    expect(report.preview.endsWith("…")).toBe(true);
    expect(report.hasMore).toBe(true);
  });

  it("handles empty and heading-only historical responses without inventing an assessment", () => {
    expect(prepareHabitatReport("")).toEqual({ markdown: "", preview: "", hasMore: false });
    expect(prepareHabitatReport("## Assessment").preview).toBe("");
  });
});
