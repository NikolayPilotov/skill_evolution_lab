import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import type { AssertionResult, EvalAssertion, EvalDefinition } from "../types";
import { assertInside, assertSafeSkillId, getPaths } from "./paths";
import { pathExists } from "./fsx";

type EvalYaml = {
  name?: string;
  prompt?: string;
  timeoutMs?: number;
  assertions?: EvalAssertion[];
};

export async function loadEvals(skillId: string): Promise<EvalDefinition[]> {
  assertSafeSkillId(skillId);
  const paths = getPaths();
  const skillEvalDir = path.join(paths.evalsDir, skillId);

  if (!(await pathExists(skillEvalDir))) return [];
  const entries = await fs.readdir(skillEvalDir, { withFileTypes: true });
  const evals: EvalDefinition[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const evalId = entry.name;
    assertSafeSkillId(evalId);
    const evalDir = path.join(skillEvalDir, evalId);
    const evalPath = path.join(evalDir, "eval.yaml");
    if (!(await pathExists(evalPath))) continue;

    const raw = yaml.load(await fs.readFile(evalPath, "utf8")) as EvalYaml | undefined;
    if (!raw?.prompt) {
      throw new Error(`Eval ${skillId}/${evalId} is missing prompt.`);
    }

    const fixturePath = path.join(evalDir, "fixture");
    evals.push({
      id: evalId,
      name: raw.name || evalId,
      prompt: raw.prompt,
      timeoutMs: raw.timeoutMs || 180000,
      assertions: normalizeAssertions(raw.assertions || []),
      fixturePath: (await pathExists(fixturePath)) ? fixturePath : undefined
    });
  }

  return evals.sort((a, b) => a.id.localeCompare(b.id));
}

function normalizeAssertions(assertions: EvalAssertion[]) {
  for (const assertion of assertions) {
    if (!assertion.type) throw new Error("Eval assertion is missing type.");
    if (
      ["stdout_contains", "stdout_not_contains", "stderr_not_contains"].includes(assertion.type) &&
      typeof (assertion as { value?: unknown }).value !== "string"
    ) {
      throw new Error(`Assertion ${assertion.type} requires a string value.`);
    }
    if (assertion.type === "exit_code" && typeof assertion.value !== "number") {
      throw new Error("exit_code assertion requires a numeric value.");
    }
    if (
      ["file_exists", "file_contains"].includes(assertion.type) &&
      typeof (assertion as { path?: unknown }).path !== "string"
    ) {
      throw new Error(`Assertion ${assertion.type} requires a path.`);
    }
  }

  return assertions;
}

export async function evaluateAssertions(
  assertions: EvalAssertion[],
  output: { stdout: string; stderr: string; exitCode: number | null },
  workspacePath: string
): Promise<AssertionResult[]> {
  if (assertions.length === 0) {
    return [
      {
        assertion: { type: "exit_code", value: 0 },
        passed: output.exitCode === 0,
        message: output.exitCode === 0 ? "Process exited successfully." : "Process exited with failure."
      }
    ];
  }

  const results: AssertionResult[] = [];
  for (const assertion of assertions) {
    results.push(await evaluateAssertion(assertion, output, workspacePath));
  }

  return results;
}

async function evaluateAssertion(
  assertion: EvalAssertion,
  output: { stdout: string; stderr: string; exitCode: number | null },
  workspacePath: string
): Promise<AssertionResult> {
  if (assertion.type === "stdout_contains") {
    const passed = output.stdout.includes(assertion.value);
    return { assertion, passed, message: passed ? "stdout contained value." : "stdout did not contain value." };
  }

  if (assertion.type === "stdout_not_contains") {
    const passed = !output.stdout.includes(assertion.value);
    return { assertion, passed, message: passed ? "stdout excluded value." : "stdout contained blocked value." };
  }

  if (assertion.type === "stderr_not_contains") {
    const passed = !output.stderr.includes(assertion.value);
    return { assertion, passed, message: passed ? "stderr excluded value." : "stderr contained blocked value." };
  }

  if (assertion.type === "exit_code") {
    const passed = output.exitCode === assertion.value;
    return { assertion, passed, message: passed ? "Exit code matched." : `Expected ${assertion.value}, got ${output.exitCode}.` };
  }

  const target = path.resolve(workspacePath, assertion.path);
  assertInside(workspacePath, target);

  if (assertion.type === "file_exists") {
    const passed = await pathExists(target);
    return { assertion, passed, message: passed ? "File exists." : "File does not exist." };
  }

  const text = (await fs.readFile(target, "utf8").catch(() => "")) || "";
  const passed = text.includes(assertion.value);
  return { assertion, passed, message: passed ? "File contained value." : "File did not contain value." };
}

