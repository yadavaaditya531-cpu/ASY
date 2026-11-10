import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Brand } from "./db";

const MODEL = process.env.ASY_AI_MODEL ?? "claude-opus-5-5";

const Drafts = z.object({
  posts: z.array(z.object({ text: z.string() })),
});

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export type DraftRequest = {
  brand: Brand;
  brief: string;
  count: number;
  /** Tightest character limit of the networks the posts are going to, if any. */
  maxChars: number | null;
  networks: string[];
};

/** Writes `count` distinct social posts for the brand. Throws an Error with a user-readable message. */
export async function draftPosts(req: DraftRequest): Promise<string[]> {
  const client = new Anthropic();
  const brand = [
    req.brand.name && `Business: ${req.brand.name}`,
    req.brand.description && `What it does: ${req.brand.description}`,
    req.brand.audience && `Audience: ${req.brand.audience}`,
    req.brand.tone && `Voice: ${req.brand.tone}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: zodOutputFormat(Drafts) },
      // If the model declines a request, the API re-runs it on a fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system:
        "You write social media posts for a business's own accounts. Each post you return is published " +
        "as-is, so write the final text only: no surrounding quotes, labels, or placeholders like [link]. " +
        "Stay strictly within the facts given in the brand profile and the brief; never invent prices, " +
        "statistics, testimonials, offers or dates. Match the brand's voice. Use hashtags and emoji only " +
        "where they fit the network and the voice, and sparingly.",
      messages: [
        {
          role: "user",
          content:
            `${brand || "No brand profile has been set up yet."}\n\n` +
            `Brief: ${req.brief}\n\n` +
            `Write ${req.count} ${req.count === 1 ? "post" : "posts, each taking a different angle so they can run on different days without repeating"}.\n` +
            `Networks: ${req.networks.join(", ") || "general social media"}.\n` +
            (req.maxChars ? `Hard limit: ${req.maxChars} characters per post, including links and hashtags.` : ""),
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      throw new Error("The AI declined to write posts for this brief. Try rewording it.");
    }
    const posts = response.parsed_output?.posts.map((p) => p.text.trim()).filter(Boolean) ?? [];
    if (!posts.length) throw new Error("The AI returned no posts. Try again.");
    return posts.slice(0, req.count);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error("AI drafting needs a valid ANTHROPIC_API_KEY in the server environment.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new Error("The AI service is rate limited right now. Try again in a minute.");
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new Error("Could not reach the AI service.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`AI request failed (${err.status ?? "error"}): ${err.message}`);
    }
    if (err instanceof Error && /api[_ ]?key|auth/i.test(err.message) && !aiConfigured()) {
      throw new Error("AI drafting needs ANTHROPIC_API_KEY set in the server environment.");
    }
    throw err;
  }
}
