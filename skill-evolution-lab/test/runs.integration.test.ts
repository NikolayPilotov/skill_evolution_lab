import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../server";
import { createTempRepo } from "./testUtils";

async function waitForRun(runId: string, expected: string[]) {
  for (let i = 0; i < 40; i += 1) {
    const response = await request(createApp()).get(`/api/runs/${runId}`).expect(200);
    if (expected.includes(response.body.status)) return response.body;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Run ${runId} did not reach ${expected.join(", ")}`);
}

describe("mutation and eval flow", () => {
  const previousRepoRoot = process.env.SKILL_LAB_REPO_ROOT;
  const previousCodexHome = process.env.SKILL_LAB_CODEX_HOME;
  const previousMockCodex = process.env.SKILL_LAB_MOCK_CODEX;

  afterEach(() => {
    process.env.SKILL_LAB_REPO_ROOT = previousRepoRoot;
    process.env.SKILL_LAB_CODEX_HOME = previousCodexHome;
    process.env.SKILL_LAB_MOCK_CODEX = previousMockCodex;
  });

  it("creates a worktree mutation run with mocked codex exec", async () => {
    const { repoRoot, codexHome } = await createTempRepo();
    process.env.SKILL_LAB_REPO_ROOT = repoRoot;
    process.env.SKILL_LAB_CODEX_HOME = codexHome;
    process.env.SKILL_LAB_MOCK_CODEX = "1";

    const createResponse = await request(createApp())
      .post("/api/skills/tiny-skill/mutations")
      .send({ prompt: "Add a better validation checklist." })
      .expect(202);

    const run = await waitForRun(createResponse.body.id, ["candidate_ready"]);
    expect(run.commitSha).toBeTruthy();
    expect(run.safety.allowed).toBe(true);
    expect(run.diff.files).toContain("skills/tiny-skill/SKILL.md");
  });

  it("runs prompt evals and promotes a passing candidate", async () => {
    const { repoRoot, codexHome } = await createTempRepo();
    process.env.SKILL_LAB_REPO_ROOT = repoRoot;
    process.env.SKILL_LAB_CODEX_HOME = codexHome;
    process.env.SKILL_LAB_MOCK_CODEX = "1";

    const createResponse = await request(createApp())
      .post("/api/skills/tiny-skill/mutations")
      .send({ prompt: "Add a careful test note." })
      .expect(202);
    const candidate = await waitForRun(createResponse.body.id, ["candidate_ready"]);

    await request(createApp()).post(`/api/runs/${candidate.id}/evals`).expect(202);
    const evaluated = await waitForRun(candidate.id, ["passed"]);
    expect(evaluated.evalResults[0].passed).toBe(true);

    const promoted = await request(createApp()).post(`/api/runs/${candidate.id}/promote`).expect(200);
    expect(promoted.body.status).toBe("promoted");
    expect(promoted.body.backupPaths).toHaveLength(1);
    expect(promoted.body.backupPaths[0]).toContain("backups");
  });
});
