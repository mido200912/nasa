/** Display-only repair for providers that flatten Markdown into one paragraph.
 * The persisted explanation is never rewritten or summarized by another model.
 */
export function prepareHabitatReport(explanation: string) {
  const markdown = explanation.replace(/\r\n?/g, "\n")
    .replace(/[ \t]*[-–][ \t]+(?=\*\*[^*\n]{1,100}\*\*)/g, "\n\n- ")
    .replace(/\*\*(Qualitative Assessment|Evidence Gaps and Research Needed|Evidence Gaps|Research Needed|Sources|Limitations|Recommendations)\*\*[ \t]*[:–-]?[ \t]*/gi, "\n\n## $1\n\n")
    .replace(/(?:^|\n)[ \t]*-[ \t]*\n+(?=## )/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n").trim();
  const blocks = markdown.split(/\n\s*\n/).filter((block) =>
    !/^(?:#{1,6}\s|\*\*[^*]+\*\*$|Habitat Fire (?:and|&) Combustion Assessment)/i.test(block.trim()));
  const first = (blocks[0] ?? "").replace(/^[-*]\s+/, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
  const limit = 640;
  const cut = first.length > limit ? first.lastIndexOf(" ", limit) : first.length;
  const preview = first.length > limit ? `${first.slice(0, cut > 0 ? cut : limit).trimEnd()}…` : first;
  return { markdown, preview, hasMore: blocks.length > 1 || first.length > limit };
}
