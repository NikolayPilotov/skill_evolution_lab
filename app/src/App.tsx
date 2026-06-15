import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Dna,
  FileDiff,
  FlaskConical,
  GitBranch,
  Play,
  RefreshCw,
  Save,
  ShieldCheck,
  TerminalSquare,
  Upload,
  XCircle
} from "lucide-react";
import {
  createMutation,
  fetchLiveSkills,
  fetchRun,
  fetchRuns,
  fetchSkills,
  importSkill,
  promoteRun,
  runEvals
} from "./api";
import type { LiveSkillSummary, RunRecord, SkillSummary } from "./types";

const busyStatuses = new Set(["created", "mutating", "evaluating"]);

function statusTone(status: string) {
  if (["passed", "promoted"].includes(status)) return "good";
  if (["failed", "eval_failed", "mutation_failed", "promotion_failed"].includes(status)) return "bad";
  if (["candidate_ready"].includes(status)) return "ready";
  return "working";
}

export default function App() {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [liveSkills, setLiveSkills] = useState<LiveSkillSummary[]>([]);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedLiveSkillId, setSelectedLiveSkillId] = useState("");
  const [activeRunId, setActiveRunId] = useState("");
  const [prompt, setPrompt] = useState("Strengthen this skill with clearer workflow steps and a compact validation checklist.");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedSkill = skills.find((skill) => skill.id === selectedSkillId);
  const activeRun = runs.find((run) => run.id === activeRunId);
  const canMutate = Boolean(selectedSkill && prompt.trim()) && !loading;
  const canEval = Boolean(activeRun && ["candidate_ready", "mutation_failed", "failed", "eval_failed"].includes(activeRun.status));
  const canPromote = Boolean(activeRun?.status === "passed" && activeRun.safety?.allowed);

  const statusCounts = useMemo(() => {
    return runs.reduce(
      (acc, run) => {
        acc[run.status] = (acc[run.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [runs]);

  const activityLevel = runs.some((run) => busyStatuses.has(run.status)) ? 78 : Math.min(100, runs.length * 18 + 8);
  const severityLevel = Math.min(100, (statusCounts.failed || 0) * 22 + (statusCounts.eval_failed || 0) * 22 + 6);
  const stabilityLevel = Math.min(100, (statusCounts.passed || 0) * 26 + (statusCounts.promoted || 0) * 34 + 10);

  async function refresh(nextSkillId = selectedSkillId) {
    const [nextSkills, nextLiveSkills, nextRuns] = await Promise.all([
      fetchSkills(),
      fetchLiveSkills(),
      fetchRuns(nextSkillId || undefined)
    ]);

    setSkills(nextSkills);
    setLiveSkills(nextLiveSkills);
    setRuns(nextRuns);

    if (!selectedSkillId && nextSkills[0]) {
      setSelectedSkillId(nextSkills[0].id);
    }
    if (!selectedLiveSkillId && nextLiveSkills[0]) {
      setSelectedLiveSkillId(nextLiveSkills[0].id);
    }
    if (!activeRunId && nextRuns[0]) {
      setActiveRunId(nextRuns[0].id);
    }
  }

  useEffect(() => {
    refresh().catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    if (!selectedSkillId) return;
    fetchRuns(selectedSkillId)
      .then((nextRuns) => {
        setRuns(nextRuns);
        setActiveRunId(nextRuns[0]?.id || "");
      })
      .catch((error) => setMessage(error.message));
  }, [selectedSkillId]);

  useEffect(() => {
    if (!activeRunId) return;
    const interval = window.setInterval(async () => {
      try {
        const nextRun = await fetchRun(activeRunId);
        setRuns((current) => current.map((run) => (run.id === nextRun.id ? nextRun : run)));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      }
    }, 1800);
    return () => window.clearInterval(interval);
  }, [activeRunId]);

  async function handleImport(overwrite = false) {
    if (!selectedLiveSkillId) return;
    setLoading(true);
    setMessage("");
    try {
      const imported = await importSkill(selectedLiveSkillId, overwrite);
      setSelectedSkillId(imported.id);
      await refresh(imported.id);
      setMessage(`Imported ${imported.id}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleMutation() {
    if (!selectedSkill) return;
    setLoading(true);
    setMessage("");
    try {
      const run = await createMutation(selectedSkill.id, prompt);
      setRuns((current) => [run, ...current]);
      setActiveRunId(run.id);
      setMessage(`Created ${run.branch}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleEval() {
    if (!activeRun) return;
    setLoading(true);
    setMessage("");
    try {
      const run = await runEvals(activeRun.id);
      setRuns((current) => current.map((candidate) => (candidate.id === run.id ? run : candidate)));
      setMessage(`Evaluating ${run.id}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handlePromote() {
    if (!activeRun) return;
    setLoading(true);
    setMessage("");
    try {
      const run = await promoteRun(activeRun.id);
      setRuns((current) => current.map((candidate) => (candidate.id === run.id ? run : candidate)));
      setMessage(`Promoted ${run.skillId}.`);
      await refresh(run.skillId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="lab-shell">
      <section className="topbar">
        <div className="brand-mark">
          <Dna aria-hidden="true" />
        </div>
        <div>
          <h1>Skill Evolution Lab</h1>
          <p>Single-lineage Codex skill mutation, eval, and promotion.</p>
        </div>
        <nav className="mode-tabs" aria-label="Lab sections">
          <span>Overview</span>
          <span>Genome</span>
          <span>Evaluations</span>
          <span>Promotion</span>
        </nav>
        <button className="icon-button" type="button" onClick={() => refresh()} title="Refresh lab state">
          <RefreshCw size={18} />
        </button>
      </section>

      {message && <div className="notice">{message}</div>}

      <section className="lab-grid">
        <section className="core-deck">
          <section className="panel gene-stage">
            <div className="stage-glass" aria-hidden="true">
              <div className="gene-strand" />
              <div className="scanner-ring ring-a" />
              <div className="scanner-ring ring-b" />
            </div>

            <div className="stage-overlay">
              <section className="import-strip">
                <div className="panel-title">
                  <Upload size={18} />
                  <h2>Import</h2>
                </div>
                <select value={selectedLiveSkillId} onChange={(event) => setSelectedLiveSkillId(event.target.value)}>
                  <option value="">Choose live skill</option>
                  {liveSkills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.id}
                    </option>
                  ))}
                </select>
                <div className="button-row compact">
                  <button type="button" onClick={() => handleImport(false)} disabled={!selectedLiveSkillId || loading}>
                    <Upload size={16} />
                    Import
                  </button>
                  <button type="button" className="secondary" onClick={() => handleImport(true)} disabled={!selectedLiveSkillId || loading}>
                    <RefreshCw size={16} />
                    Refresh
                  </button>
                </div>
              </section>

              <section className="skill-list">
                <div className="panel-title">
                  <GitBranch size={18} />
                  <h2>Skill Genome</h2>
                </div>
                {skills.length === 0 && <p className="muted">No repo skills yet.</p>}
                <div className="hex-skill-grid">
                  {skills.map((skill, index) => (
                    <button
                      className={`skill-row hex-tile tile-${index % 8} ${skill.id === selectedSkillId ? "selected" : ""}`}
                      key={skill.id}
                      type="button"
                      onClick={() => setSelectedSkillId(skill.id)}
                    >
                      <span>{skill.name}</span>
                      <small>{skill.id}</small>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </section>

          <section className="lower-deck">
            <section className="panel mutation-panel">
              <div className="panel-title">
                <FlaskConical size={18} />
                <h2>Mutation Prompt</h2>
              </div>
              <div className="selected-skill">
                <span>{selectedSkill?.name || "No skill selected"}</span>
                {selectedSkill?.liveInstalled && (
                  <span className="pill good">
                    <ShieldCheck size={14} />
                    live
                  </span>
                )}
              </div>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
              <div className="button-row">
                <button type="button" onClick={handleMutation} disabled={!canMutate}>
                  <Play size={16} />
                  Mutate
                </button>
                <button type="button" className="secondary" onClick={handleEval} disabled={!canEval || loading}>
                  <Activity size={16} />
                  Run evals
                </button>
                <button type="button" className="promote" onClick={handlePromote} disabled={!canPromote || loading}>
                  <Save size={16} />
                  Promote
                </button>
              </div>
            </section>

            <section className="panel telemetry-panel">
              <div className="panel-title">
                <Activity size={18} />
                <h2>Stats</h2>
              </div>
              <section className="metrics-band">
                <Metric label="runs" value={runs.length} />
                <Metric label="ready" value={statusCounts.candidate_ready || 0} />
                <Metric label="passed" value={statusCounts.passed || 0} />
                <Metric label="promoted" value={statusCounts.promoted || 0} />
              </section>
              <section className="timeline">
                {runs.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    className={`run-chip ${activeRunId === run.id ? "selected" : ""} ${statusTone(run.status)}`}
                    onClick={() => setActiveRunId(run.id)}
                  >
                    <span>{run.id}</span>
                    <small>{run.status}</small>
                  </button>
                ))}
              </section>
              {runs.length === 0 && <p className="muted">No candidate lineage yet.</p>}
            </section>
          </section>
        </section>

        <section className="right-rail">
          <section className="panel specimen-panel">
            <div className="microbe-preview" aria-hidden="true">
              <div className="gene-strand mini" />
              <div className="scanner-ring ring-a" />
            </div>
            <div className="specimen-meta">
              <span>Active Skill</span>
              <strong>{selectedSkill?.id || "none"}</strong>
            </div>
            <div className="mini-human" aria-hidden="true">
              <span />
            </div>
          </section>
          <RunInspector run={activeRun} />
        </section>
      </section>

      <section className="dna-footer" aria-label="Lab meters">
        <div className="dna-counter">
          <Dna size={18} />
          <span>DNA {Math.max(5, skills.length + runs.length)}</span>
        </div>
        <Meter label="Activity" value={activityLevel} tone="magenta" />
        <Meter label="Instability" value={severityLevel} tone="yellow" />
        <Meter label="Stability" value={stabilityLevel} tone="violet" />
      </section>
    </main>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: "magenta" | "yellow" | "violet" }) {
  return (
    <div className="meter">
      <span>{label}</span>
      <div className={`meter-track ${tone}`}>
        <i style={{ width: `${Math.max(4, Math.min(value, 100))}%` }} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{value}</span>
      <small>{label}</small>
    </div>
  );
}

function RunInspector({ run }: { run?: RunRecord }) {
  const [tab, setTab] = useState<"diff" | "evals" | "logs">("diff");

  useEffect(() => {
    setTab("diff");
  }, [run?.id]);

  if (!run) {
    return (
      <section className="panel inspector empty">
        <FileDiff size={22} />
        <p>Select a run to inspect.</p>
      </section>
    );
  }

  const StatusIcon = ["passed", "promoted", "candidate_ready"].includes(run.status) ? CheckCircle2 : XCircle;

  return (
    <section className="panel inspector">
      <div className="run-heading">
        <div>
          <span className={`pill ${statusTone(run.status)}`}>
            <StatusIcon size={14} />
            {run.status}
          </span>
          <h2>{run.id}</h2>
        </div>
        <small>{run.branch}</small>
      </div>

      {run.error && <div className="error-box">{run.error}</div>}

      <div className="safety-strip">
        <ShieldCheck size={16} />
        <span>{run.safety?.allowed ? "Skill-only diff" : "Awaiting safety report"}</span>
        {run.safety && !run.safety.allowed && <strong>{run.safety.violations.length} violation(s)</strong>}
      </div>

      <div className="tabs">
        <button type="button" className={tab === "diff" ? "active" : ""} onClick={() => setTab("diff")}>
          <FileDiff size={15} />
          Diff
        </button>
        <button type="button" className={tab === "evals" ? "active" : ""} onClick={() => setTab("evals")}>
          <FlaskConical size={15} />
          Evals
        </button>
        <button type="button" className={tab === "logs" ? "active" : ""} onClick={() => setTab("logs")}>
          <TerminalSquare size={15} />
          Logs
        </button>
      </div>

      {tab === "diff" && (
        <pre className="code-pane">{run.diff?.patch || run.diff?.nameStatus || "No diff captured yet."}</pre>
      )}

      {tab === "evals" && (
        <div className="eval-list">
          {run.evalResults?.length ? (
            run.evalResults.map((result) => (
              <div className="eval-row" key={result.id}>
                <span className={`dot ${result.passed ? "good" : "bad"}`} />
                <div>
                  <strong>{result.name}</strong>
                  <small>
                    exit {result.exitCode ?? "none"} / {Math.round(result.durationMs / 1000)}s
                  </small>
                  <ul>
                    {result.assertions.map((assertion, index) => (
                      <li key={`${result.id}-${index}`} className={assertion.passed ? "good-text" : "bad-text"}>
                        {assertion.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No eval results yet.</p>
          )}
        </div>
      )}

      {tab === "logs" && (
        <div className="log-stack">
          <pre className="code-pane">{run.mutationStdout || "stdout empty"}</pre>
          <pre className="code-pane warn">{run.mutationStderr || "stderr empty"}</pre>
        </div>
      )}
    </section>
  );
}
