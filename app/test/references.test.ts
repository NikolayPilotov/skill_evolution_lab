import { afterEach, describe, expect, it } from "vitest";
import { loadSkillReferences } from "../server/lib/references";
import { createTempRepo } from "./testUtils";

describe("loadSkillReferences", () => {
  const previousRepoRoot = process.env.SKILL_LAB_REPO_ROOT;
  const previousCodexHome = process.env.SKILL_LAB_CODEX_HOME;

  afterEach(() => {
    process.env.SKILL_LAB_REPO_ROOT = previousRepoRoot;
    process.env.SKILL_LAB_CODEX_HOME = previousCodexHome;
  });

  it("decomposes reference markdown into modules and graph nodes", async () => {
    const { repoRoot, codexHome } = await createTempRepo();
    process.env.SKILL_LAB_REPO_ROOT = repoRoot;
    process.env.SKILL_LAB_CODEX_HOME = codexHome;

    const overview = await loadSkillReferences("tiny-skill");

    expect(overview.modules).toHaveLength(1);
    expect(overview.modules[0].title).toBe("Workflow");
    expect(overview.modules[0].headings.map((heading) => heading.title)).toContain("Validation");
    expect(overview.modules[0].codeBlockCount).toBe(1);
    expect(overview.graph.nodes.some((node) => node.kind === "section" && node.label === "Inputs")).toBe(true);
    expect(overview.explanation).toContain("tiny-skill is decomposed");
  });
});
