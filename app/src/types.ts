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
  diff?: {
    files: string[];
    nameStatus: string;
    patch: string;
  };
  safety?: {
    allowed: boolean;
    violations: string[];
  };
  evalResults?: Array<{
    id: string;
    name: string;
    passed: boolean;
    exitCode: number | null;
    durationMs: number;
    stdout: string;
    stderr: string;
    assertions: Array<{
      passed: boolean;
      message: string;
      assertion: Record<string, unknown>;
    }>;
  }>;
  promotedAt?: string;
  backupPaths?: string[];
  error?: string;
};

