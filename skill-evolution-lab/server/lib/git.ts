import path from "node:path";
import { runCommand } from "./command";
import { getPaths, toGitPath } from "./paths";
import type { DiffSummary, SafetyReport } from "../types";

export async function git(args: string[], cwd = getPaths().repoRoot) {
  const result = await runCommand("git", args, { cwd, timeoutMs: 120000 });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed.`);
  }
  return result.stdout.trim();
}

export async function createWorktree(branch: string, worktreePath: string) {
  const paths = getPaths();
  await git(["worktree", "add", "-b", branch, worktreePath, "HEAD"], paths.repoRoot);
}

export async function commitAll(cwd: string, message: string) {
  await git(["add", "-A"], cwd);
  await git(
    [
      "-c",
      "user.name=Skill Evolution Lab",
      "-c",
      "user.email=skill-lab@local",
      "commit",
      "--allow-empty",
      "-m",
      message
    ],
    cwd
  );
}

export async function currentCommit(cwd: string) {
  return git(["rev-parse", "HEAD"], cwd);
}

export async function collectDiff(cwd: string): Promise<DiffSummary> {
  const nameStatus = await git(["diff-tree", "--no-commit-id", "--name-status", "-r", "HEAD"], cwd);
  const patch = await git(["show", "--format=", "--find-renames", "--stat", "--patch", "--minimal", "HEAD"], cwd);
  const files = extractDiffFiles(nameStatus);

  return { files, nameStatus, patch };
}

export function extractDiffFiles(nameStatus: string) {
  const files = new Set<string>();
  for (const line of nameStatus.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    const status = parts[0];
    const paths = status.startsWith("R") || status.startsWith("C") ? parts.slice(1) : parts.slice(1, 2);
    for (const filePath of paths) {
      if (filePath) files.add(toGitPath(filePath));
    }
  }
  return [...files].sort();
}

export function checkSkillOnlyDiff(skillId: string, diff: DiffSummary): SafetyReport {
  const allowedPrefix = `skills/${skillId}/`;
  const violations = diff.files.filter((file) => !file.startsWith(allowedPrefix));

  return {
    allowed: violations.length === 0,
    violations
  };
}

export function safeBranchName(skillId: string, runId: string) {
  const cleanSkillId = skillId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const cleanRunId = runId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `evolve/${cleanSkillId}/${cleanRunId}`;
}

export function worktreeName(skillId: string, runId: string) {
  return `${skillId}-${runId}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function gitRelativeSkillPath(skillId: string) {
  return path.posix.join("skills", skillId);
}

