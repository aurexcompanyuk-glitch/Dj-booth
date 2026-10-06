// The tools J.A.R.V.I.S. can use. Server tools run here; HUD tools are
// dispatched to the browser as an `action` event and acknowledged immediately.
import os from "node:os";
import { z } from "zod";

export const HUD_THEMES = ["arc", "mark", "gold", "stealth", "emerald"];

const definitions = [
  {
    name: "remember",
    description:
      "Save a durable fact to long-term memory so it is available in future conversations. " +
      "Use when the user shares something worth keeping (their name, preferences, important dates, " +
      "ongoing projects) or explicitly asks you to remember something. Store one self-contained fact per call.",
    schema: z.object({
      fact: z.string().min(1).max(500).describe("The fact, written in third person, e.g. \"The user's sister is called Maya.\""),
    }),
    async run({ fact }, { memory }) {
      const saved = await memory.add(fact);
      return { result: `Stored in long-term memory: ${saved.text}` };
    },
  },
  {
    name: "forget",
    description:
      "Remove facts from long-term memory whose text contains the given phrase. Use when the user asks you to forget something.",
    schema: z.object({
      match: z.string().min(2).max(200).describe("A word or phrase that appears in the fact(s) to delete."),
    }),
    async run({ match }, { memory }) {
      const removed = await memory.forget(match);
      return {
        result: removed.length
          ? `Deleted ${removed.length} fact(s): ${removed.map((f) => f.text).join(" | ")}`
          : `No stored facts matched "${match}".`,
      };
    },
  },
  {
    name: "system_status",
    description:
      "Run diagnostics. Returns the user's device telemetry (battery, charging, network, screen, platform) as " +
      "reported by their browser, plus the J.A.R.V.I.S. server's uptime and memory use. Use for status reports " +
      "or questions like \"how's my battery?\".",
    schema: z.object({}),
    async run(_input, { session, config }) {
      const mem = process.memoryUsage();
      return {
        result: JSON.stringify({
          device: session.telemetry ?? "No telemetry received from the HUD yet.",
          server: {
            uptime_minutes: Math.round(process.uptime() / 60),
            heap_used_mb: Math.round(mem.heapUsed / 1048576),
            host_load_average: os.loadavg().map((n) => n.toFixed(2)),
            model: config.model,
          },
        }),
      };
    },
  },
  {
    name: "set_timer",
    description: "Start a countdown timer on the HUD. The HUD announces aloud when it finishes, so no follow-up is needed.",
    schema: z.object({
      seconds: z.number().int().min(1).max(86400).describe("Duration in seconds."),
      label: z.string().max(80).optional().describe("Short label, e.g. \"tea\" or \"call Pepper\"."),
    }),
    async run({ seconds, label }) {
      return {
        result: `Timer started for ${seconds} seconds${label ? ` (${label})` : ""}. The HUD will announce when it finishes.`,
        action: { type: "set_timer", seconds, label: label ?? null },
      };
    },
  },
  {
    name: "open_url",
    description:
      "Open a web page for the user in a new browser tab, e.g. \"open YouTube\" or \"pull up the BBC weather page\". " +
      "Only http(s) URLs.",
    schema: z.object({
      url: z.url({ protocol: /^https?$/ }).describe("Full http(s) URL."),
      title: z.string().max(80).optional().describe("Short human-readable name for the page."),
    }),
    async run({ url, title }) {
      return {
        result: `Opened ${title ?? url} on the HUD.`,
        action: { type: "open_url", url, title: title ?? null },
      };
    },
  },
  {
    name: "set_hud_theme",
    description:
      "Change the HUD colour scheme. arc = classic arc-reactor blue, mark = hot-rod red and gold armour, " +
      "gold = all gold, stealth = white/silver, emerald = green.",
    schema: z.object({
      theme: z.enum(HUD_THEMES),
    }),
    async run({ theme }) {
      return { result: `HUD theme set to ${theme}.`, action: { type: "set_theme", theme } };
    },
  },
];

const byName = new Map(definitions.map((d) => [d.name, d]));

function toInputSchema(schema) {
  const { $schema, ...json } = z.toJSONSchema(schema);
  return json;
}

// Tool definitions in the shape the Messages API expects.
export function apiTools() {
  return definitions.map((d) => ({
    name: d.name,
    description: d.description,
    input_schema: toInputSchema(d.schema),
    eager_input_streaming: true,
  }));
}

// Runs one tool call. Inputs are validated against the schema first: with
// eager input streaming the API no longer validates them for us.
export async function runTool(block, ctx) {
  const def = byName.get(block.name);
  if (!def) {
    return { content: `Unknown tool: ${block.name}`, isError: true };
  }
  const parsed = def.schema.safeParse(block.input);
  if (!parsed.success) {
    return {
      content: JSON.stringify({ INVALID_JSON: JSON.stringify(block.input), issues: parsed.error.issues.map((i) => i.message) }),
      isError: true,
    };
  }
  try {
    const { result, action } = await def.run(parsed.data, ctx);
    return { content: result, action };
  } catch (err) {
    console.error(`[tools] ${block.name} failed:`, err);
    return { content: `Tool failed: ${err.message}`, isError: true };
  }
}
