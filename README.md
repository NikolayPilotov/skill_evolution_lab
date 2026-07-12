# Skill Evolution Lab

A local web app for evolving Codex skills through isolated Git worktrees, prompt-based evals, and explicit manual promotion into your live Codex skills folder.

## V1 Workflow

1. Keep canonical skills in `skills/<skillId>/`.
2. Describe a desired mutation in the app.
3. The backend creates an `evolve/<skill>/<runId>` branch and worktree under `.skill-lab/`.
4. `codex exec` applies the change inside that candidate worktree.
5. Prompt evals from `evals/<skillId>/<evalId>/eval.yaml` run against isolated fixtures.
6. Passing, skill-only candidates can be promoted into `C:\Users\nikol\.codex\skills`.

## Run Locally

```powershell
cd C:\Users\nikol\Desktop\Optimization\skill-evolution-lab
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Tests

```powershell
cd C:\Users\nikol\Desktop\Optimization\skill-evolution-lab
npm test
```

Runtime state, logs, candidate worktrees, eval workspaces, and backups are written to `.skill-lab/`, which is ignored by Git.
