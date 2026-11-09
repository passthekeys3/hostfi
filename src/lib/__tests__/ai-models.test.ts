import { describe, it, expect } from "vitest";
import { anthropicText, HAIKU_MODEL, SONNET_MODEL } from "../ai-models";

describe("anthropicText", () => {
  it("reads a text block that follows a thinking block", () => {
    const text = anthropicText({
      content: [
        { type: "thinking", text: "" },
        { type: "text", text: '{"amount": 12}' },
      ],
    });
    expect(text).toBe('{"amount": 12}');
  });

  it("returns an empty string when the model sent no text", () => {
    expect(anthropicText({ content: [{ type: "thinking" }] })).toBe("");
    expect(anthropicText({})).toBe("");
  });
});

describe("model ids", () => {
  it("does not point at retired snapshots", () => {
    expect(SONNET_MODEL).not.toContain("20250514");
    expect(HAIKU_MODEL).not.toContain("20241022");
    expect(SONNET_MODEL).toBe("claude-sonnet-4-6");
    expect(HAIKU_MODEL).toBe("claude-haiku-4-5-20251001");
  });
});
