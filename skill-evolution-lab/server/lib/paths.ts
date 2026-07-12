import os from "node:os";
import path from "node:path";

const APP_DIRECTORY_NAME = "skill-evolution-lab";

export function getRepoRoot() {
  if (process.env.SKILL_LAB_REPO_ROOT) {
    return path.resolve(process.env.SKILL_LAB_REPO_ROOT);
  }

  const cwd = process.cwd();
  return path.basename(cwd).toLowerCase() === APP_DIRECTORY_NAME
    ? path.resolve(cwd, "..")
    : cwd;
}

export function getCodexHome() {
  return path.resolve(
    process.env.SKILL_LAB_CODEX_HOME ??
      process.env.CODEX_HOME ??
      path.join(os.homedir(), ".codex")
  );
}

export function getPaths() {
  const repoRoot = getRepoRoot();
  const codexHome = getCodexHome();

  return {
    repoRoot,
    appRoot: path.join(repoRoot, APP_DIRECTORY_NAME),
    skillsDir: path.join(repoRoot, "skills"),
    evalsDir: path.join(repoRoot, "evals"),
    labDir: path.join(repoRoot, ".skill-lab"),
    runsDir: path.join(repoRoot, ".skill-lab", "runs"),
    worktreesDir: path.join(repoRoot, ".skill-lab", "worktrees"),
    evalRunsDir: path.join(repoRoot, ".skill-lab", "eval-runs"),
    backupsDir: path.join(repoRoot, ".skill-lab", "backups"),
    codexHome,
    liveSkillsDir: path.join(codexHome, "skills")
  };
}

export function assertSafeSkillId(skillId: string) {
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(skillId)) {
    throw new Error(
      "Skill id must start with a letter or number and contain only letters, numbers, dashes, or underscores."
    );
  }
}

export function isSafeSkillId(skillId: string) {
  return /^[a-z0-9][a-z0-9_-]*$/i.test(skillId);
}

export function assertInside(parent: string, child: string) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes expected directory: ${child}`);
  }
}

export function toGitPath(filePath: string) {
  return filePath.split(path.sep).join("/");
}
