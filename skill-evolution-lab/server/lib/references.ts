import fs from "node:fs/promises";
import path from "node:path";
import type { ReferenceGraph, ReferenceHeading, ReferenceModule, SkillReferenceOverview } from "../types";
import { parseSkillDir } from "./skillParser";
import { assertInside, assertSafeSkillId, getPaths, toGitPath } from "./paths";
import { pathExists } from "./fsx";

const stopWords = new Set([
  "about",
  "after",
  "again",
  "against",
  "agent",
  "allow",
  "always",
  "ascii",
  "before",
  "being",
  "build",
  "codex",
  "could",
  "every",
  "files",
  "from",
  "have",
  "into",
  "make",
  "must",
  "only",
  "other",
  "reference",
  "should",
  "skill",
  "skills",
  "that",
  "their",
  "there",
  "these",
  "this",
  "through",
  "using",
  "when",
  "where",
  "with",
  "without",
  "your"
]);

export async function loadSkillReferences(skillId: string): Promise<SkillReferenceOverview> {
  assertSafeSkillId(skillId);

  const paths = getPaths();
  const skillDir = path.join(paths.skillsDir, skillId);
  const referenceDir = path.join(skillDir, "references");
  const skill = await parseSkillDir(skillDir);

  if (!(await pathExists(referenceDir))) {
    return buildOverview(skill.id, skill.name, skill.description, referenceDir, []);
  }

  assertInside(skillDir, referenceDir);
  const files = await listMarkdownFiles(referenceDir);
  const modules = await Promise.all(files.map((filePath) => analyzeReferenceFile(referenceDir, filePath)));

  return buildOverview(skill.id, skill.name, skill.description, referenceDir, modules);
}

async function listMarkdownFiles(root: string) {
  const files: string[] = [];

  async function walk(currentDir: string) {
    assertInside(root, currentDir);
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      assertInside(root, entryPath);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        files.push(entryPath);
      }
    }
  }

  await walk(root);
  return files.sort((a, b) => a.localeCompare(b));
}

async function analyzeReferenceFile(referenceDir: string, filePath: string): Promise<ReferenceModule> {
  assertInside(referenceDir, filePath);
  const markdown = await fs.readFile(filePath, "utf8");
  const relativePath = toGitPath(path.relative(referenceDir, filePath));
  const headings = extractHeadings(markdown);
  const title = headings.find((heading) => heading.level === 1)?.title || titleFromPath(filePath);
  const wordCount = countWords(markdown);
  const headingCount = headings.length;
  const codeBlockCount = Math.floor((markdown.match(/```/g) || []).length / 2);
  const linkCount = (markdown.match(/\[[^\]]+\]\([^)]+\)/g) || []).length;

  return {
    id: relativePath.replace(/\.md$/i, "").replace(/[^a-zA-Z0-9_-]+/g, "-"),
    title,
    path: filePath,
    relativePath,
    summary: summarize(markdown, headings, title),
    keywords: extractKeywords(markdown, headings),
    headings,
    lineCount: markdown.split(/\r?\n/).length,
    wordCount,
    headingCount,
    codeBlockCount,
    linkCount,
    complexity: classifyComplexity(wordCount, headingCount)
  };
}

function extractHeadings(markdown: string): ReferenceHeading[] {
  const headings: ReferenceHeading[] = [];
  const lines = markdown.split(/\r?\n/);

  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!match) return;
    const title = match[2].replace(/[`*_]/g, "").trim();
    if (!title) return;
    headings.push({
      level: match[1].length,
      title,
      slug: slugify(title),
      line: index + 1
    });
  });

  return headings;
}

function summarize(markdown: string, headings: ReferenceHeading[], fallbackTitle: string) {
  const cleaned = markdown
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+.*$/gm, " ")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const sentences = cleaned.match(/[^.!?]+[.!?]/g) || [];
  const summary = sentences.slice(0, 2).join(" ").trim() || cleaned.slice(0, 260).trim();
  if (summary) return summary.length > 360 ? `${summary.slice(0, 357).trim()}...` : summary;

  const sectionNames = headings.slice(0, 4).map((heading) => heading.title).join(", ");
  return sectionNames ? `${fallbackTitle} is organized around ${sectionNames}.` : `${fallbackTitle} has no prose summary yet.`;
}

function extractKeywords(markdown: string, headings: ReferenceHeading[]) {
  const weightedText = `${headings.map((heading) => `${heading.title} ${heading.title}`).join(" ")} ${markdown}`
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ");

  const counts = new Map<string, number>();
  for (const word of weightedText.split(/\s+/)) {
    const normalized = word.replace(/^-+|-+$/g, "");
    if (normalized.length < 5 || stopWords.has(normalized) || /^\d+$/.test(normalized)) continue;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([word]) => word);
}

function buildOverview(
  skillId: string,
  skillName: string,
  description: string,
  referenceDir: string,
  modules: ReferenceModule[]
): SkillReferenceOverview {
  const totalWords = modules.reduce((sum, module) => sum + module.wordCount, 0);
  const totalHeadings = modules.reduce((sum, module) => sum + module.headingCount, 0);
  const totalCodeBlocks = modules.reduce((sum, module) => sum + module.codeBlockCount, 0);
  const graph = buildGraph(skillId, skillName, modules);

  return {
    skillId,
    skillName,
    description,
    referenceDir,
    modules,
    totalWords,
    totalHeadings,
    totalCodeBlocks,
    graph,
    explanation: explainReferenceSystem(skillName, modules, totalWords, totalHeadings, totalCodeBlocks)
  };
}

function buildGraph(skillId: string, skillName: string, modules: ReferenceModule[]): ReferenceGraph {
  const nodes: ReferenceGraph["nodes"] = [{ id: skillId, label: skillName, kind: "skill", weight: 1 }];
  const edges: ReferenceGraph["edges"] = [];

  for (const module of modules) {
    nodes.push({
      id: module.id,
      label: module.title,
      kind: "reference",
      weight: Math.max(1, Math.min(10, Math.ceil(module.wordCount / 220)))
    });
    edges.push({ from: skillId, to: module.id, strength: Math.max(1, Math.min(10, module.headingCount)) });

    for (const heading of module.headings.filter((item) => item.level <= 2).slice(0, 4)) {
      const id = `${module.id}:${heading.slug}`;
      nodes.push({ id, label: heading.title, kind: "section", weight: Math.max(1, 7 - heading.level) });
      edges.push({ from: module.id, to: id, strength: Math.max(1, 7 - heading.level) });
    }
  }

  return { nodes, edges };
}

function explainReferenceSystem(
  skillName: string,
  modules: ReferenceModule[],
  totalWords: number,
  totalHeadings: number,
  totalCodeBlocks: number
) {
  if (modules.length === 0) {
    return `${skillName} does not have a references directory yet. Add Markdown files under references/ to expose deeper decomposition here.`;
  }

  const topModules = [...modules].sort((a, b) => b.wordCount - a.wordCount).slice(0, 3);
  const topKeywords = [...new Set(modules.flatMap((module) => module.keywords))].slice(0, 7);
  const learningPath = modules
    .slice(0, 5)
    .map((module) => module.title)
    .join(" -> ");

  return [
    `${skillName} is decomposed into ${modules.length} reference module(s), ${totalWords} words, and ${totalHeadings} section heading(s).`,
    `The deepest modules are ${topModules.map((module) => `${module.title} (${module.wordCount} words)`).join(", ")}.`,
    topKeywords.length ? `The repeated concepts are ${topKeywords.join(", ")}.` : "",
    totalCodeBlocks ? `It includes ${totalCodeBlocks} code-oriented block(s), so part of the skill is procedural or implementation-focused.` : "",
    learningPath ? `A practical reading path is ${learningPath}.` : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function countWords(markdown: string) {
  return (markdown.match(/[A-Za-z0-9][A-Za-z0-9_-]*/g) || []).length;
}

function classifyComplexity(wordCount: number, headingCount: number): ReferenceModule["complexity"] {
  if (wordCount >= 900 || headingCount >= 12) return "deep";
  if (wordCount >= 320 || headingCount >= 5) return "standard";
  return "compact";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFromPath(filePath: string) {
  return path
    .basename(filePath, path.extname(filePath))
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
