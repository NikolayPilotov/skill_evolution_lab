import express from "express";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getPaths } from "./lib/paths";
import { importLiveSkill } from "./lib/importSkill";
import { listLiveSkills, listRepoSkills } from "./lib/skillParser";
import { createMutationRun, loadRun, listRuns, promoteRun, startEvalRun } from "./lib/runs";
import { pathExists } from "./lib/fsx";

type AsyncHandler = (req: express.Request, res: express.Response) => Promise<void>;

function asyncHandler(handler: AsyncHandler): express.RequestHandler {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, paths: getPaths() });
  });

  app.get(
    "/api/skills",
    asyncHandler(async (_req, res) => {
      res.json(await listRepoSkills());
    })
  );

  app.get(
    "/api/live-skills",
    asyncHandler(async (_req, res) => {
      res.json(await listLiveSkills());
    })
  );

  app.post(
    "/api/skills/import",
    asyncHandler(async (req, res) => {
      const { skillId, overwrite } = req.body as { skillId?: string; overwrite?: boolean };
      if (!skillId) throw new Error("skillId is required.");
      res.status(201).json(await importLiveSkill(skillId, Boolean(overwrite)));
    })
  );

  app.get(
    "/api/runs",
    asyncHandler(async (req, res) => {
      const skillId = typeof req.query.skillId === "string" ? req.query.skillId : undefined;
      res.json(await listRuns(skillId));
    })
  );

  app.post(
    "/api/skills/:id/mutations",
    asyncHandler(async (req, res) => {
      const { prompt } = req.body as { prompt?: string };
      const run = await createMutationRun(req.params.id, prompt || "");
      res.status(202).json(run);
    })
  );

  app.get(
    "/api/runs/:id",
    asyncHandler(async (req, res) => {
      res.json(await loadRun(req.params.id));
    })
  );

  app.post(
    "/api/runs/:id/evals",
    asyncHandler(async (req, res) => {
      res.status(202).json(await startEvalRun(req.params.id));
    })
  );

  app.post(
    "/api/runs/:id/promote",
    asyncHandler(async (req, res) => {
      res.json(await promoteRun(req.params.id));
    })
  );

  const distDir = path.join(getPaths().appRoot, "dist");
  app.use(express.static(distDir));
  app.get("*", async (_req, res, next) => {
    if (await pathExists(path.join(distDir, "index.html"))) {
      res.sendFile(path.join(distDir, "index.html"));
      return;
    }
    next();
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: message });
  });

  return app;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = Number(process.env.PORT || 4317);
  createApp().listen(port, "127.0.0.1", () => {
    console.log(`Skill Evolution Lab API listening on http://127.0.0.1:${port}`);
  });
}

