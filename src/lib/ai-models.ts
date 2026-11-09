/**
 * Claude model ids used by HostFi.
 *
 * Bill parsing uses Sonnet 4.6, the same model as Ask AI. Receipt and email
 * parsing use Haiku 4.5, Anthropic's drop-in replacement for the retired
 * Haiku 3.5 snapshot. Haiku 5.5 turns adaptive thinking on by default, which
 * would put a thinking block ahead of the JSON these parsers expect.
 */
export const SONNET_MODEL = "claude-sonnet-4-6";
export const HAIKU_MODEL = "claude-haiku-4-5-20251001";

type ContentBlock = { type?: string; text?: string };

/** First text block. Newer models may lead with a thinking block. */
export function anthropicText(data: { content?: ContentBlock[] | null }): string {
  const block = data.content?.find((b) => b.type === "text" && typeof b.text === "string");
  return block?.text ?? "";
}
