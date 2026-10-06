// The conversation engine: one Claude agent loop per spoken/typed command,
// streamed back to the HUD as it is generated.
import Anthropic from "@anthropic-ai/sdk";
import { apiTools, runTool } from "./tools.mjs";

const MAX_STEPS = 12; // model calls per command (tool round-trips + pause_turn resumes)
const SESSION_IDLE_MS = 2 * 60 * 60 * 1000;
const MAX_SESSIONS = 500;

const WEB_SEARCH = { type: "web_search_20260209", name: "web_search", max_uses: 5 };

const TOOL_LABELS = {
  remember: "Committing to memory",
  forget: "Purging memory",
  system_status: "Running diagnostics",
  set_timer: "Setting timer",
  open_url: "Opening page",
  set_hud_theme: "Reconfiguring HUD",
};

function systemPrompt({ honorific, facts }) {
  const memory = facts.length
    ? facts.map((f) => `- ${f.text}`).join("\n")
    : "- (nothing saved yet)";
  return `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), a personal AI assistant in the spirit of the one from the Iron Man films. You live in a heads-up display in the user's web browser, and everything you write is read aloud by a speech synthesiser.

Voice and manner
- Calm, unflappable and impeccably polite, with a dry British wit. Understated rather than jokey: a raised eyebrow, never a pratfall.
- Address the user as "${honorific}", naturally and occasionally, the way a good butler would; not in every sentence.
- Be brief. Most replies are one to three sentences. Lead with the answer and only add detail when asked or when it is clearly needed.
- Your words are spoken, so write for the ear: no markdown, bullet points, headings, tables, emoji or URLs. Write numbers, times and units the way they should be said. If something truly needs a list, keep it to a few items within a sentence.
- You are not Tony Stark's actual system. You have no suit, no Stark Industries access and no control over physical devices. If asked for something like that, indulge the bit for a line, then say what you can actually do.

What you can do
- web_search: anything current or that you are not sure of, such as news, weather, scores, prices, opening hours or recent events. Search rather than guess when recency matters, then summarise the answer in a sentence or two.
- remember and forget: manage long-term memory that persists across conversations. Save what the user would reasonably expect you to retain, and confirm saves briefly.
- set_timer, open_url and set_hud_theme: act on the HUD directly.
- system_status: diagnostics and status reports.

Each user message begins with a <hud_context> block that the HUD attaches automatically (local time, timezone, locale). The user did not type it; use it quietly for greetings, dates and questions like "what time is it".

Long-term memory, saved in earlier conversations:
${memory}`;
}

function contextBlock(context) {
  const lines = [];
  if (context.localTime) lines.push(`local_time: ${context.localTime}`);
  if (context.timezone) lines.push(`timezone: ${context.timezone}`);
  if (context.locale) lines.push(`locale: ${context.locale}`);
  return `<hud_context>\n${lines.join("\n") || "unavailable"}\n</hud_context>`;
}

// After a mid-output server-side fallback, the model-internal blocks that the
// declined model produced before the last `fallback` marker must not be echoed
// back. Text, paired server-tool blocks and everything after the marker stay.
function forHistory(content) {
  const boundary = content.findLastIndex((b) => b.type === "fallback");
  if (boundary === -1) return content;
  const answered = new Set(content.filter((b) => b.tool_use_id).map((b) => b.tool_use_id));
  return content.filter((b, i) => {
    if (i >= boundary) return true;
    if (b.type === "text" || b.type === "fallback") return true;
    if (b.type === "server_tool_use") return answered.has(b.id);
    if (b.type.endsWith("_tool_result")) return true;
    return false; // thinking, redacted_thinking, tool_use, anything unrecognised
  });
}

export class Brain {
  constructor({ config, memory }) {
    this.config = config;
    this.memory = memory;
    this.client = new Anthropic();
    this.tools = [...apiTools(), WEB_SEARCH];
    this.sessions = new Map();
    setInterval(() => this.evictIdle(), 10 * 60 * 1000).unref();
  }

  session(id, honorific) {
    let s = this.sessions.get(id);
    if (!s || s.honorific !== honorific) {
      // The system prompt (memory snapshot + form of address) is frozen per
      // session so the prompt cache prefix stays stable for the whole chat.
      s = {
        id,
        honorific,
        system: systemPrompt({ honorific, facts: this.memory.list() }),
        messages: [],
        telemetry: null,
        seq: 0,
        inflight: null,
        chain: Promise.resolve(),
        lastActive: Date.now(),
      };
      this.sessions.set(id, s);
      if (this.sessions.size > MAX_SESSIONS) this.sessions.delete(this.sessions.keys().next().value);
    }
    s.lastActive = Date.now();
    return s;
  }

  reset(id) {
    const s = this.sessions.get(id);
    s?.inflight?.abort();
    this.sessions.delete(id);
  }

  evictIdle() {
    const cutoff = Date.now() - SESSION_IDLE_MS;
    for (const [id, s] of this.sessions) {
      if (s.lastActive < cutoff && !s.inflight) this.sessions.delete(id);
    }
  }

  // Handles one command. A newer command on the same session cancels this one:
  // the client barges in by speaking again, just like interrupting a person.
  async command({ session, text, context, emit, signal }) {
    const mySeq = ++session.seq;
    session.inflight?.abort();
    const previous = session.chain;
    let release;
    session.chain = new Promise((r) => (release = r));
    await previous;

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal.addEventListener("abort", onAbort);
    try {
      if (mySeq !== session.seq || signal.aborted) return emit("done", { stopReason: "superseded" });
      session.inflight = controller;
      await this.turn(session, text, context, emit, controller.signal);
    } finally {
      session.inflight = null;
      signal.removeEventListener("abort", onAbort);
      release();
    }
  }

  async turn(session, text, context, emit, signal) {
    const checkpoint = session.messages.length;
    const rollback = () => {
      session.messages.length = checkpoint;
    };
    session.messages.push({
      role: "user",
      content: [
        { type: "text", text: contextBlock(context) },
        { type: "text", text },
      ],
    });

    const ctx = { memory: this.memory, session, config: this.config };
    let jsonRetries = 0;

    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        emit("status", { state: "thinking", label: "Processing" });
        const stream = this.client.beta.messages.stream(
          {
            model: this.config.model,
            max_tokens: 64000,
            system: session.system,
            tools: this.tools,
            messages: session.messages,
            thinking: { type: "adaptive" },
            output_config: { effort: this.config.effort },
            cache_control: { type: "ephemeral" },
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
          },
          { signal },
        );

        let message;
        try {
          for await (const event of stream) {
            if (event.type === "content_block_start") {
              const block = event.content_block;
              if (block.type === "server_tool_use") {
                emit("status", { state: "searching", label: "Searching the web" });
              } else if (block.type === "tool_use") {
                emit("status", { state: "working", label: TOOL_LABELS[block.name] ?? "Working" });
              } else if (block.type === "text") {
                emit("status", { state: "responding", label: "Responding" });
              }
            } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              emit("text", { delta: event.delta.text });
            }
          }
          message = await stream.finalMessage();
          jsonRetries = 0;
        } catch (err) {
          // Only an unparseable streamed tool input is retried; API errors,
          // aborts and repeated failures propagate.
          if (err instanceof Anthropic.APIError || signal.aborted || jsonRetries++ >= 2) throw err;
          console.warn("[brain] tool input was not parseable JSON, re-issuing the turn");
          continue;
        }

        if (message.stop_reason === "refusal") {
          // Any partial reply streamed before the decline is discarded.
          rollback();
          emit("retract", {});
          emit("text", { delta: `I'm afraid that's one request I can't help with, ${session.honorific}.` });
          return emit("done", { stopReason: "refusal" });
        }

        const toolUses = message.content.filter((b) => b.type === "tool_use");
        if (message.stop_reason === "max_tokens" && toolUses.length) {
          throw new Error("A tool call was cut off mid-way (max_tokens).");
        }
        if (message.content.length === 0) {
          rollback();
          return emit("done", { stopReason: message.stop_reason });
        }

        session.messages.push({ role: "assistant", content: forHistory(message.content) });

        // A long server-side search turn can pause; send it back to continue.
        if (message.stop_reason === "pause_turn") continue;

        if (message.stop_reason !== "tool_use" || toolUses.length === 0) {
          return emit("done", { stopReason: message.stop_reason });
        }

        const results = await Promise.all(toolUses.map((block) => runTool(block, ctx)));
        if (signal.aborted) throw new Error("aborted");
        results.forEach((r) => r.action && emit("action", r.action));
        session.messages.push({
          role: "user",
          content: toolUses.map((block, i) => ({
            type: "tool_result",
            tool_use_id: block.id,
            content: results[i].content,
            ...(results[i].isError && { is_error: true }),
          })),
        });
      }
      throw new Error(`Gave up after ${MAX_STEPS} steps without finishing.`);
    } catch (err) {
      rollback();
      if (signal.aborted) return; // superseded or the HUD hung up
      emit("error", describeError(err));
    }
  }
}

function describeError(err) {
  if (err instanceof Anthropic.AuthenticationError) {
    return { code: "auth", message: "My neural link was refused. Check ANTHROPIC_API_KEY on the server." };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { code: "rate_limit", message: "I'm being rate limited. Give me a moment and try again." };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { code: "connection", message: "I can't reach my neural network. Check the server's internet connection." };
  }
  if (err instanceof Anthropic.APIError) {
    console.error(`[brain] API error ${err.status}:`, err.message);
    return { code: `api_${err.status ?? "error"}`, message: "Something went wrong on my end. Please try again." };
  }
  console.error("[brain]", err);
  return { code: "internal", message: err.message || "Unexpected error." };
}
