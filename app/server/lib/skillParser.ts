import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import type { LiveSkillSummary, SkillSummary } from "../types";
import { getPaths, assertSafeSkillId, isSafeSkillId } from "./paths";
import { pathExists } from "./fsx";

type Frontmatter = {
  name?: string;
  description?: string;
};

export function parseSkillMarkdown(markdown: string, fallbackId: string) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const parsed = match ? (yaml.load(match[1]) as Frontmatter | undefined) : undefined;

  return {
    name: parsed?.name?.trim() || fallbackId,
    description: parsed?.description?.trim() || "No description provided."
  };
}

export async function parseSkillDir(skillDir: string, liveInstalled = false): Promise<SkillSummary> {
  const id = path.basename(skillDir);
  assertSafeSkillId(id);
  const skillMdPath = path.join(skillDir, "SKILL.md");
  const markdown = await fs.readFile(skillMdPath, "utf8");
  const metadata = parseSkillMarkdown(markdown, id);

  return {
    id,
    ...metadata,
    path: skillDir,
    liveInstalled
  };
}

export async function listRepoSkills() {
  const paths = getPaths();
  await fs.mkdir(paths.skillsDir, { recursive: true });
  const entries = await fs.readdir(paths.skillsDir, { withFileTypes: true });
  const skills: SkillSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!isSafeSkillId(entry.name)) continue;
    const skillDir = path.join(paths.skillsDir, entry.name);
    const skillMdPath = path.join(skillDir, "SKILL.md");
    if (!(await pathExists(skillMdPath))) continue;
    const liveInstalled = await pathExists(path.join(paths.liveSkillsDir, entry.name, "SKILL.md"));
    skills.push(await parseSkillDir(skillDir, liveInstalled));
  }

  return skills.sort((a, b) => a.id.localeCompare(b.id));
}

export async function listLiveSkills() {
  const paths = getPaths();
  if (!(await pathExists(paths.liveSkillsDir))) return [];

  const entries = await fs.readdir(paths.liveSkillsDir, { withFileTypes: true });
  const liveSkills: LiveSkillSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!isSafeSkillId(entry.name)) continue;
    const skillDir = path.join(paths.liveSkillsDir, entry.name);
    const skillMdPath = path.join(skillDir, "SKILL.md");
    if (!(await pathExists(skillMdPath))) continue;

    const skill = await parseSkillDir(skillDir, true);
    liveSkills.push({
      ...skill,
      imported: await pathExists(path.join(paths.skillsDir, entry.name, "SKILL.md"))
    });
  }

  return liveSkills.sort((a, b) => a.id.localeCompare(b.id));
}
