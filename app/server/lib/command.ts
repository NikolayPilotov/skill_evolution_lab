import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { CommandResult } from "../types";

export type CommandOptions = {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  stdin?: string;
  timeoutMs?: number;
  shell?: boolean;
};

export async function runCommand(
  command: string,
  args: string[],
  options: CommandOptions
): Promise<CommandResult> {
  const started = Date.now();

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: options.shell ?? false
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = options.timeoutMs
      ? setTimeout(() => {
          if (!settled) {
            stderr += `\nCommand timed out after ${options.timeoutMs}ms.`;
            child.kill();
          }
        }, options.timeoutMs)
      : undefined;

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      stderr += `\n${error.message}`;
    });

    child.on("close", (exitCode) => {
      settled = true;
      if (timeout) clearTimeout(timeout);
      resolve({
        exitCode,
        stdout,
        stderr,
        durationMs: Date.now() - started
      });
    });

    if (options.stdin) {
      child.stdin?.write(options.stdin);
    }
    child.stdin?.end();
  });
}

export async function runCodexExec(options: CommandOptions): Promise<CommandResult> {
  if (process.env.SKILL_LAB_MOCK_CODEX === "1") {
    return runMockCodex(options);
  }

  const codexCommand = process.platform === "win32" ? "codex.cmd" : "codex";
  return runCommand(codexCommand, ["exec", "-s", "workspace-write", "-a", "never", "-"], options);
}

async function runMockCodex(options: CommandOptions): Promise<CommandResult> {
  const started = Date.now();
  const skillsDir = path.join(options.cwd, "skills");

  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true }).catch(() => []);
    const skillDir = entries.find((entry) => entry.isDirectory());

    if (skillDir) {
      const skillPath = path.join(skillsDir, skillDir.name, "SKILL.md");
      const promptLine = (options.stdin ?? "mock mutation").split(/\r?\n/).find(Boolean) ?? "";
      await fs.appendFile(
        skillPath,
        `\n\n## Mock Evolution Note\n${promptLine.slice(0, 160)}\n`,
        "utf8"
      );
    }

    return {
      exitCode: 0,
      stdout: "PASS\nMOCK_CODEX_PASS\n",
      stderr: "",
      durationMs: Date.now() - started
    };
  } catch (error) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started
    };
  }
}
