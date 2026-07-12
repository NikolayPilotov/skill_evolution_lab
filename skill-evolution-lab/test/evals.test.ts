import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { evaluateAssertions, loadEvals } from "../server/lib/evals";
import { createTempRepo } from "./testUtils";

describe("eval loading and assertions", () => {
  const previousRepoRoot = process.env.SKILL_LAB_REPO_ROOT;

  afterEach(() => {
    process.env.SKILL_LAB_REPO_ROOT = previousRepoRoot;
  });

  it("loads eval yaml from the repo evals directory", async () => {
    const { repoRoot } = await createTempRepo();
    process.env.SKILL_LAB_REPO_ROOT = repoRoot;

    const evals = await loadEvals("tiny-skill");
    expect(evals).toHaveLength(1);
    expect(evals[0].name).toBe("Smoke");
    expect(evals[0].assertions).toHaveLength(2);
  });

  it("evaluates deterministic output and file assertions", async () => {
    const { repoRoot } = await createTempRepo();
    const workspace = path.join(repoRoot, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(workspace, "result.txt"), "stable lineage", "utf8");

    const results = await evaluateAssertions(
      [
        { type: "stdout_contains", value: "PASS" },
        { type: "stderr_not_contains", value: "Traceback" },
        { type: "file_contains", path: "result.txt", value: "lineage" }
      ],
      { stdout: "PASS", stderr: "", exitCode: 0 },
      workspace
    );

    expect(results.every((result) => result.passed)).toBe(true);
  });
});

