import path from "node:path";
import { assertInside, assertSafeSkillId, getPaths } from "./paths";
import { copyDir, pathExists, stamp } from "./fsx";
import { parseSkillDir } from "./skillParser";

export async function importLiveSkill(skillId: string, overwrite = false) {
  assertSafeSkillId(skillId);
  const paths = getPaths();
  const source = path.join(paths.liveSkillsDir, skillId);
  const target = path.join(paths.skillsDir, skillId);

  assertInside(paths.liveSkillsDir, source);
  assertInside(paths.skillsDir, target);

  if (!(await pathExists(path.join(source, "SKILL.md")))) {
    throw new Error(`Live skill ${skillId} does not exist.`);
  }

  if ((await pathExists(target)) && !overwrite) {
    throw new Error(`Repo skill ${skillId} already exists. Use overwrite to refresh it from live skills.`);
  }

  if (await pathExists(target)) {
    const backup = path.join(paths.backupsDir, "imports", `${skillId}-${stamp()}`);
    await copyDir(target, backup);
  }

  await copyDir(source, target);
  return parseSkillDir(target, true);
}

