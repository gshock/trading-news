import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Loads AI prompt templates from the local `prompts/` folder (not committed to git).
 *
 * Folder layout:
 *   backend/prompts/prod/   — production prompts
 *   backend/prompts/dev/    — dev / experimentation prompts
 *
 * Set `PROMPT_ENV=dev` in your `.env` to load from the dev folder.
 * Defaults to `prod` when the variable is absent.
 *
 * Prompt files are plain Markdown. Use `{{VARIABLE}}` placeholders for
 * dynamic values; pass them via the `vars` argument of `load()`.
 */
export class PromptLoader {
  private readonly dir: string;

  constructor() {
    const env = process.env.PROMPT_ENV ?? "dev";
    const base = process.env.PROMPT_DIR ?? join(process.cwd(), "prompts");
    this.dir = join(base, env);
  }

  /**
   * Reads a prompt file and substitutes `{{KEY}}` placeholders.
   *
   * @param filename  Filename inside the active prompts folder, e.g. `"orb-system.md"`
   * @param vars      Optional map of placeholder name → value
   */
  load(filename: string, vars?: Record<string, string>): string {
    const filePath = join(this.dir, filename);
    let content: string;

    try {
      content = readFileSync(filePath, "utf-8");
    } catch (err) {
      throw new Error(
        `PromptLoader: cannot read "${filePath}" — ` +
          (err instanceof Error ? err.message : String(err)) +
          `. Make sure the prompts/ folder exists (see backend/prompts/README.md).`,
      );
    }

    if (!vars) return content;

    for (const [key, value] of Object.entries(vars)) {
      // replaceAll is available in Node 15+ / ES2021
      content = content.split(`{{${key}}}`).join(value);
    }

    return content;
  }
}
