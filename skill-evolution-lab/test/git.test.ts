import { describe, expect, it } from "vitest";
import { checkSkillOnlyDiff, extractDiffFiles } from "../server/lib/git";

describe("git diff safety", () => {
  it("extracts files from git name-status output", () => {
    expect(extractDiffFiles("M\tskills/demo/SKILL.md\nR100\tskills/demo/a.md\tskills/demo/b.md")).toEqual([
      "skills/demo/SKILL.md",
      "skills/demo/a.md",
      "skills/demo/b.md"
    ]);
  });

  it("blocks promotion when a candidate changed files outside its skill", () => {
    const report = checkSkillOnlyDiff("demo", {
      files: ["skills/demo/SKILL.md", "skill-evolution-lab/src/App.tsx"],
      nameStatus: "",
      patch: ""
    });

    expect(report.allowed).toBe(false);
    expect(report.violations).toEqual(["skill-evolution-lab/src/App.tsx"]);
  });
});
