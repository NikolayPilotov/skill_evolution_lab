import type { LiveSkillSummary, RunRecord, SkillReferenceOverview, SkillSummary } from "./types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }
  return payload as T;
}

export function fetchSkills() {
  return request<SkillSummary[]>("/api/skills");
}

export function fetchLiveSkills() {
  return request<LiveSkillSummary[]>("/api/live-skills");
}

export function fetchSkillReferences(skillId: string) {
  return request<SkillReferenceOverview>(`/api/skills/${encodeURIComponent(skillId)}/references`);
}

export function importSkill(skillId: string, overwrite = false) {
  return request<SkillSummary>("/api/skills/import", {
    method: "POST",
    body: JSON.stringify({ skillId, overwrite })
  });
}

export function fetchRuns(skillId?: string) {
  const suffix = skillId ? `?skillId=${encodeURIComponent(skillId)}` : "";
  return request<RunRecord[]>(`/api/runs${suffix}`);
}

export function fetchRun(runId: string) {
  return request<RunRecord>(`/api/runs/${runId}`);
}

export function createMutation(skillId: string, prompt: string) {
  return request<RunRecord>(`/api/skills/${encodeURIComponent(skillId)}/mutations`, {
    method: "POST",
    body: JSON.stringify({ prompt })
  });
}

export function runEvals(runId: string) {
  return request<RunRecord>(`/api/runs/${runId}/evals`, { method: "POST" });
}

export function promoteRun(runId: string) {
  return request<RunRecord>(`/api/runs/${runId}/promote`, { method: "POST" });
}

