import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { listLiveSkills, parseSkillMarkdown } from "../server/lib/skillParser";
import { createTempRepo } from "./testUtils";

describe("parseSkillMarkdown", () => {
  const previousRepoRoot = process.env.SKILL_LAB_REPO_ROOT;
  const previousCodexHome = process.env.SKILL_LAB_CODEX_HOME;

  afterEach(() => {
    process.env.SKILL_LAB_REPO_ROOT = previousRepoRoot;
    process.env.SKILL_LAB_CODEX_HOME = previousCodexHome;
  });

  it("reads Codex skill frontmatter", () => {
    const parsed = parseSkillMarkdown(
      [
        "---",
        "name: careful-reviewer",
        "description: Use when reviewing delicate changes.",
        "---",
        "",
        "# Body"
      ].join("\n"),
      "fallback"
    );

    expect(parsed).toEqual({
      name: "careful-reviewer",
      description: "Use when reviewing delicate changes."
    });
  });

  it("falls back when frontmatter is missing", () => {
    expect(parseSkillMarkdown("# Body", "fallback").name).toBe("fallback");
  });

  it("skips internal live skill folders with invalid import ids", async () => {
    const { repoRoot, codexHome } = await createTempRepo();
    process.env.SKILL_LAB_REPO_ROOT = repoRoot;
    process.env.SKILL_LAB_CODEX_HOME = codexHome;

    await fs.mkdir(path.join(codexHome, "skills", ".system"), { recursive: true });
    await fs.writeFile(path.join(codexHome, "skills", ".system", "SKILL.md"), "---\nname: internal\n---\n", "utf8");

    const skills = await listLiveSkills();
    expect(skills.map((skill) => skill.id)).not.toContain(".system");
  });
});
