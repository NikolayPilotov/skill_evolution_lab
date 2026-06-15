export type SkillSummary = {
  id: string;
  name: string;
  description: string;
  path: string;
  liveInstalled: boolean;
};

export type LiveSkillSummary = {
  id: string;
  name: string;
  description: string;
  path: string;
  imported: boolean;
};

export type RunStatus =
  | "created"
  | "mutating"
  | "mutation_failed"
  | "candidate_ready"
  | "evaluating"
  | "eval_failed"
  | "failed"
  | "passed"
  | "promoted"
  | "promotion_failed";

export type DiffSummary = {
  files: string[];
  nameStatus: string;
  patch: string;
};

export type SafetyReport = {
  allowed: boolean;
  violations: string[];
};

export type EvalAssertion =
  | { type: "stdout_contains"; value: string }
  | { type: "stdout_not_contains"; value: string }
  | { type: "stderr_not_contains"; value: string }
  | { type: "exit_code"; value: number }
  | { type: "file_exists"; path: string }
  | { type: "file_contains"; path: string; value: string };

export type EvalDefinition = {
  id: string;
  name: string;
  prompt: string;
  timeoutMs: number;
  assertions: EvalAssertion[];
  fixturePath?: string;
};

export type AssertionResult = {
  assertion: EvalAssertion;
  passed: boolean;
  message: string;
};

export type EvalResult = {
  id: string;
  name: string;
  passed: boolean;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
  assertions: AssertionResult[];
};

export type RunRecord = {
  id: string;
  skillId: string;
  prompt: string;
  branch: string;
  worktreePath: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  commitSha?: string;
  mutationStdout?: string;
  mutationStderr?: string;
  mutationExitCode?: number | null;
  diff?: DiffSummary;
  safety?: SafetyReport;
  evalResults?: EvalResult[];
  promotedAt?: string;
  backupPaths?: string[];
  error?: string;
};

export type CommandResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
};

