import fs from "node:fs/promises";
import path from "node:path";
import type { EvalResult, RunRecord } from "../types";
import { runCodexExec } from "./command";
import { copyDir, emptyDir, ensureDir, pathExists, stamp } from "./fsx";
import { collectDiff, commitAll, createWorktree, currentCommit, safeBranchName, checkSkillOnlyDiff, worktreeName } from "./git";
import { assertInside, assertSafeSkillId, getPaths } from "./paths";
import { evaluateAssertions, loadEvals } from "./evals";

export async function ensureLab() {
  const paths = getPaths();
  await ensureDir(paths.runsDir);
  await ensureDir(paths.worktreesDir);
  await ensureDir(paths.evalRunsDir);
  await ensureDir(paths.backupsDir);
  await ensureDir(paths.skillsDir);
  await ensureDir(paths.evalsDir);
}

export async function saveRun(run: RunRecord) {
  const paths = getPaths();
  await ensureLab();
  const runDir = path.join(paths.runsDir, run.id);
  await ensureDir(runDir);
  run.updatedAt = new Date().toISOString();
  await fs.writeFile(path.join(runDir, "run.json"), `${JSON.stringify(run, null, 2)}\n`, "utf8");
}

export async function loadRun(runId: string) {
  assertSafeSkillId(runId);
  const runPath = path.join(getPaths().runsDir, runId, "run.json");
  return JSON.parse(await fs.readFile(runPath, "utf8")) as RunRecord;
}

export async function listRuns(skillId?: string) {
  const paths = getPaths();
  if (!(await pathExists(paths.runsDir))) return [];
  const entries = await fs.readdir(paths.runsDir, { withFileTypes: true });
  const runs: RunRecord[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const run = await loadRun(entry.name).catch(() => undefined);
    if (!run) continue;
    if (!skillId || run.skillId === skillId) runs.push(run);
  }

  return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createMutationRun(skillId: string, prompt: string) {
  assertSafeSkillId(skillId);
  if (!prompt.trim()) throw new Error("Mutation prompt cannot be empty.");

  await ensureLab();
  const paths = getPaths();
  const canonicalSkillDir = path.join(paths.skillsDir, skillId);
  const skillMdPath = path.join(canonicalSkillDir, "SKILL.md");
  if (!(await pathExists(skillMdPath))) {
    throw new Error(`Repo skill ${skillId} does not exist.`);
  }

  const runId = `${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const branch = safeBranchName(skillId, runId);
  const worktreePath = path.join(paths.worktreesDir, worktreeName(skillId, runId));

  const run: RunRecord = {
    id: runId,
    skillId,
    prompt,
    branch,
    worktreePath,
    status: "created",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await saveRun(run);
  void mutateRun(run).catch(async (error) => {
    run.status = "mutation_failed";
    run.error = error instanceof Error ? error.message : String(error);
    await saveRun(run);
  });

  return run;
}

export async function mutateRun(run: RunRecord) {
  const paths = getPaths();
  const canonicalSkillDir = path.join(paths.skillsDir, run.skillId);
  const candidateSkillDir = path.join(run.worktreePath, "skills", run.skillId);

  run.status = "mutating";
  await saveRun(run);

  await createWorktree(run.branch, run.worktreePath);
  await copyDir(canonicalSkillDir, candidateSkillDir);

  const mutationPrompt = [
    `You are evolving one Codex skill in this repository.`,
    `Only edit files under skills/${run.skillId}/.`,
    `Keep SKILL.md valid, concise, and compatible with Codex skill conventions.`,
    `Do not edit app code, evals, git metadata, or unrelated files.`,
    ``,
    `Mutation request:`,
    run.prompt.trim()
  ].join("\n");

  const result = await runCodexExec({
    cwd: run.worktreePath,
    stdin: mutationPrompt,
    timeoutMs: 600000
  });

  run.mutationStdout = result.stdout;
  run.mutationStderr = result.stderr;
  run.mutationExitCode = result.exitCode;

  await commitAll(run.worktreePath, `Evolve ${run.skillId}: ${run.id}`);
  run.commitSha = await currentCommit(run.worktreePath);
  run.diff = await collectDiff(run.worktreePath);
  run.safety = checkSkillOnlyDiff(run.skillId, run.diff);
  run.status = result.exitCode === 0 ? "candidate_ready" : "mutation_failed";
  await saveRun(run);
}

export async function startEvalRun(runId: string) {
  const run = await loadRun(runId);
  if (!["candidate_ready", "mutation_failed", "failed", "eval_failed"].includes(run.status)) {
    throw new Error(`Run ${run.id} is not ready for evals.`);
  }

  run.status = "evaluating";
  await saveRun(run);
  void evaluateRun(run).catch(async (error) => {
    run.status = "eval_failed";
    run.error = error instanceof Error ? error.message : String(error);
    await saveRun(run);
  });
  return run;
}

export async function evaluateRun(run: RunRecord) {
  const paths = getPaths();
  const evals = await loadEvals(run.skillId);
  if (evals.length === 0) {
    run.status = "eval_failed";
    run.error = `No evals found for ${run.skillId}.`;
    run.evalResults = [];
    await saveRun(run);
    return;
  }

  const candidateSkillDir = path.join(run.worktreePath, "skills", run.skillId);
  if (!(await pathExists(path.join(candidateSkillDir, "SKILL.md")))) {
    throw new Error(`Candidate skill missing at ${candidateSkillDir}.`);
  }

  const results: EvalResult[] = [];
  for (const evalDef of evals) {
    const evalBase = path.join(paths.evalRunsDir, run.id, evalDef.id);
    const workspacePath = path.join(evalBase, "workspace");
    const tempCodexHome = path.join(evalBase, "codex-home");

    await emptyDir(workspacePath);
    if (evalDef.fixturePath) {
      await copyDir(evalDef.fixturePath, workspacePath);
    }

    await prepareEvalCodexHome(tempCodexHome, candidateSkillDir, run.skillId);
    const started = Date.now();
    const result = await runCodexExec({
      cwd: workspacePath,
      stdin: buildEvalPrompt(run.skillId, evalDef.prompt),
      timeoutMs: evalDef.timeoutMs,
      env: { CODEX_HOME: tempCodexHome }
    });

    const assertionResults = await evaluateAssertions(
      evalDef.assertions,
      { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode },
      workspacePath
    );

    results.push({
      id: evalDef.id,
      name: evalDef.name,
      passed: assertionResults.every((assertion) => assertion.passed),
      exitCode: result.exitCode,
      durationMs: Date.now() - started,
      stdout: result.stdout,
      stderr: result.stderr,
      assertions: assertionResults
    });

    run.evalResults = results;
    await saveRun(run);
  }

  run.status = results.every((result) => result.passed) ? "passed" : "failed";
  await saveRun(run);
}

async function prepareEvalCodexHome(tempCodexHome: string, candidateSkillDir: string, skillId: string) {
  const paths = getPaths();
  await emptyDir(tempCodexHome);
  await ensureDir(path.join(tempCodexHome, "skills"));
  await copyDir(candidateSkillDir, path.join(tempCodexHome, "skills", skillId));

  for (const fileName of ["auth.json", "config.toml", "AGENTS.md"]) {
    const source = path.join(paths.codexHome, fileName);
    if (await pathExists(source)) {
      await fs.copyFile(source, path.join(tempCodexHome, fileName));
    }
  }
}

function buildEvalPrompt(skillId: string, prompt: string) {
  return [
    `Run this evaluation for the installed Codex skill "${skillId}".`,
    `Use the skill if the task matches it.`,
    ``,
    prompt.trim()
  ].join("\n");
}

export async function promoteRun(runId: string) {
  const run = await loadRun(runId);
  const paths = getPaths();

  if (run.status !== "passed") {
    throw new Error("Only runs with passing evals can be promoted.");
  }
  if (!run.safety?.allowed) {
    throw new Error("Run has safety violations and cannot be promoted.");
  }

  const candidateSkillDir = path.join(run.worktreePath, "skills", run.skillId);
  const canonicalSkillDir = path.join(paths.skillsDir, run.skillId);
  const liveSkillDir = path.join(paths.liveSkillsDir, run.skillId);
  const backupPaths: string[] = [];

  assertInside(paths.worktreesDir, run.worktreePath);
  assertInside(paths.skillsDir, canonicalSkillDir);
  assertInside(paths.liveSkillsDir, liveSkillDir);

  if (await pathExists(canonicalSkillDir)) {
    const canonicalBackup = path.join(paths.backupsDir, "canonical", `${run.skillId}-${stamp()}`);
    await copyDir(canonicalSkillDir, canonicalBackup);
    backupPaths.push(canonicalBackup);
  }

  await copyDir(candidateSkillDir, canonicalSkillDir);

  if (await pathExists(liveSkillDir)) {
    const liveBackup = path.join(paths.backupsDir, "live", `${run.skillId}-${stamp()}`);
    await copyDir(liveSkillDir, liveBackup);
    backupPaths.push(liveBackup);
  }

  await copyDir(candidateSkillDir, liveSkillDir);

  run.status = "promoted";
  run.promotedAt = new Date().toISOString();
  run.backupPaths = backupPaths;
  await saveRun(run);
  return run;
}
