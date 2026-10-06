// Long-term memory: a small JSON file of facts J.A.R.V.I.S. has been asked to keep.
import fs from "node:fs/promises";
import path from "node:path";

const MAX_FACTS = 200;

export class Memory {
  constructor(dataDir) {
    this.file = path.join(dataDir, "memory.json");
    this.facts = [];
    this.writing = Promise.resolve();
  }

  async load() {
    try {
      const raw = JSON.parse(await fs.readFile(this.file, "utf8"));
      this.facts = Array.isArray(raw.facts) ? raw.facts : [];
    } catch (err) {
      if (err.code !== "ENOENT") console.warn(`[memory] could not read ${this.file}: ${err.message}`);
      this.facts = [];
    }
  }

  list() {
    return this.facts.map((f) => ({ ...f }));
  }

  async add(text) {
    const fact = { text: text.trim(), savedAt: new Date().toISOString() };
    const existing = this.facts.findIndex((f) => f.text.toLowerCase() === fact.text.toLowerCase());
    if (existing !== -1) this.facts.splice(existing, 1);
    this.facts.push(fact);
    if (this.facts.length > MAX_FACTS) this.facts.splice(0, this.facts.length - MAX_FACTS);
    await this.save();
    return fact;
  }

  async forget(match) {
    const needle = match.trim().toLowerCase();
    const removed = this.facts.filter((f) => f.text.toLowerCase().includes(needle));
    if (removed.length) {
      this.facts = this.facts.filter((f) => !removed.includes(f));
      await this.save();
    }
    return removed;
  }

  async clear() {
    this.facts = [];
    await this.save();
  }

  // Writes are serialised so two quick "remember" calls can't interleave.
  save() {
    const snapshot = JSON.stringify({ facts: this.facts }, null, 2);
    this.writing = this.writing.catch(() => {}).then(async () => {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      await fs.writeFile(tmp, snapshot);
      await fs.rename(tmp, this.file);
    });
    return this.writing;
  }
}
