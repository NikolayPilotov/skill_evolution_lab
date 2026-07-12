import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders skills, mutation controls, and run inspector data", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith("/api/skills/skill-gardener/references")) {
        return Response.json({
          skillId: "skill-gardener",
          skillName: "skill-gardener",
          description: "Use when evolving skills.",
          referenceDir: "skills/skill-gardener/references",
          modules: [
            {
              id: "workflow",
              title: "Workflow",
              path: "skills/skill-gardener/references/workflow.md",
              relativePath: "workflow.md",
              summary: "Explains the workflow and validation model.",
              keywords: ["workflow", "validation"],
              headings: [
                { level: 1, title: "Workflow", slug: "workflow", line: 1 },
                { level: 2, title: "Validation", slug: "validation", line: 8 }
              ],
              lineCount: 12,
              wordCount: 80,
              headingCount: 2,
              codeBlockCount: 0,
              linkCount: 0,
              complexity: "compact"
            }
          ],
          totalWords: 80,
          totalHeadings: 2,
          totalCodeBlocks: 0,
          graph: {
            nodes: [{ id: "skill-gardener", label: "skill-gardener", kind: "skill", weight: 1 }],
            edges: []
          },
          explanation: "skill-gardener is decomposed into one reference module."
        });
      }
      if (url.startsWith("/api/skills")) {
        return Response.json([
          {
            id: "skill-gardener",
            name: "skill-gardener",
            description: "Use when evolving skills.",
            path: "skills/skill-gardener",
            liveInstalled: true
          }
        ]);
      }
      if (url.startsWith("/api/live-skills")) {
        return Response.json([]);
      }
      if (url.startsWith("/api/runs")) {
        return Response.json([
          {
            id: "run-1",
            skillId: "skill-gardener",
            prompt: "Improve validation.",
            branch: "evolve/skill-gardener/run-1",
            worktreePath: ".skill-lab/worktrees/run-1",
            status: "passed",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            safety: { allowed: true, violations: [] },
            diff: { files: ["skills/skill-gardener/SKILL.md"], nameStatus: "M", patch: "diff --git" },
            evalResults: []
          }
        ]);
      }
      return Response.json({});
    });

    render(<App />);

    await waitFor(() => expect(screen.getByText("Skill Evolution Lab")).toBeInTheDocument());
    expect((await screen.findAllByText("skill-gardener")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Mutate/i })).toBeInTheDocument();
    expect(await screen.findByText("Reference Atlas")).toBeInTheDocument();
    expect(screen.getAllByText("Workflow").length).toBeGreaterThan(0);
    expect(screen.getByText("Skill-only diff")).toBeInTheDocument();
  });
});
