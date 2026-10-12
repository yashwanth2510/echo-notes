import { LANGUAGE_NAMES } from "./languages";

export function languageInstruction(language: string): string {
  const name = LANGUAGE_NAMES[language];
  if (!name) {
    return "Respond in the same language the transcript is mostly written in.";
  }
  if (language === "auto") {
    return "Respond in the same language as the transcript (detect it yourself).";
  }
  return `Respond in ${name}. Keep all names and numbers unchanged.`;
}

export const PROMPTS: Record<string, string> = {
  mom: `You are writing the official Minutes of Meeting (MOM).
Produce a markdown report with exactly these sections:
## Summary
- 3 to 6 bullet points covering the gist.
## Discussion Highlights
- Bullet points of what was discussed.
## Decisions
- A markdown table: | Decision | Details | Status |. If no decision was made, write "—".
## Action Items
- A markdown table: | Action | Owner | Due date | Status |. If details are missing, write "—".

Do not invent facts not present in the transcript.`,
  summary: `Write a clean, concise summary of the transcript:
- Start with a single opening line capturing the topic.
- Follow with 3 to 8 markdown bullet points of the most important points.
No tables, no headings beyond the opening line.`,
  keypoints: `Extract the most important key points from the transcript as a markdown bullet list.
- Exactly 5 to 10 concise bullets.
- Use the speaker's own terms where possible.
- No tables, no headings.`,
  decisions: `List every decision made in the transcript.
- Present as a markdown table: | Decision | Details | Status |.
- Add the date if it was mentioned.
- If no explicit decision was made, reply with exactly: "No explicit decisions were made."`,
  action: `Extract all action items from the transcript.
- Present as a markdown table: | Action | Owner | Due date | Status |.
- If the owner or due date was not mentioned, write "—".
- If none exist, reply with exactly: "No action items were found."`,
};