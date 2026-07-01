import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCommand } from "../server/lib/command";

export async function createTempRepo() {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "skill-lab-"));
  await runCommand("git", ["init", "-b", "main"], { cwd: repoRoot });
  await runCommand("git", ["config", "user.name", "Test User"], { cwd: repoRoot });
  await runCommand("git", ["config", "user.email", "test@example.com"], { cwd: repoRoot });
  await fs.writeFile(path.join(repoRoot, "README.md"), "# Test Repo\n", "utf8");
  await fs.mkdir(path.join(repoRoot, "skills", "tiny-skill"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "skills", "tiny-skill", "SKILL.md"),
    [
      "---",
      "name: tiny-skill",
      "description: Use for tiny test tasks.",
      "---",
      "",
      "# Tiny Skill",
      "",
      "Reply carefully."
    ].join("\n"),
    "utf8"
  );
  await fs.mkdir(path.join(repoRoot, "skills", "tiny-skill", "references"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "skills", "tiny-skill", "references", "workflow.md"),
    [
      "# Workflow",
      "",
      "Use this reference to explain the tiny skill workflow and validation model.",
      "",
      "## Inputs",
      "",
      "The skill accepts concise task descriptions.",
      "",
      "## Validation",
      "",
      "The skill checks output for directness and completion.",
      "",
      "```text",
      "PASS",
      "```"
    ].join("\n"),
    "utf8"
  );
  await fs.mkdir(path.join(repoRoot, "evals", "tiny-skill", "smoke", "fixture"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "evals", "tiny-skill", "smoke", "eval.yaml"),
    [
      "name: Smoke",
      "prompt: |",
      "  Reply with PASS for the tiny skill smoke test.",
      "timeoutMs: 30000",
      "assertions:",
      "  - type: stdout_contains",
      "    value: PASS",
      "  - type: exit_code",
      "    value: 0"
    ].join("\n"),
    "utf8"
  );
  await runCommand("git", ["add", "README.md", "skills", "evals"], { cwd: repoRoot });
  await runCommand("git", ["commit", "-m", "initial"], { cwd: repoRoot });

  const codexHome = path.join(repoRoot, ".codex-home");
  await fs.mkdir(path.join(codexHome, "skills"), { recursive: true });
  await fs.writeFile(path.join(codexHome, "auth.json"), "{}", "utf8");
  await fs.writeFile(path.join(codexHome, "config.toml"), "", "utf8");

  return { repoRoot, codexHome };
}

