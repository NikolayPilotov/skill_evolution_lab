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

export type ReferenceHeading = {
  level: number;
  title: string;
  slug: string;
  line: number;
};

export type ReferenceModule = {
  id: string;
  title: string;
  path: string;
  relativePath: string;
  summary: string;
  keywords: string[];
  headings: ReferenceHeading[];
  lineCount: number;
  wordCount: number;
  headingCount: number;
  codeBlockCount: number;
  linkCount: number;
  complexity: "compact" | "standard" | "deep";
};

export type SkillReferenceOverview = {
  skillId: string;
  skillName: string;
  description: string;
  referenceDir: string;
  modules: ReferenceModule[];
  totalWords: number;
  totalHeadings: number;
  totalCodeBlocks: number;
  graph: {
    nodes: Array<{
      id: string;
      label: string;
      kind: "skill" | "reference" | "section";
      weight: number;
    }>;
    edges: Array<{
      from: string;
      to: string;
      strength: number;
    }>;
  };
  explanation: string;
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

