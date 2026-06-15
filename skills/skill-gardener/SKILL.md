---
name: skill-gardener
description: Use when creating, reviewing, or evolving Codex skills. Helps keep SKILL.md concise, trigger descriptions accurate, resources organized, and validation steps practical.
---

# Skill Gardener

Use this skill when the user wants to create, revise, or evaluate a Codex skill.

## Workflow

1. Identify the skill's job, trigger conditions, and expected outputs.
2. Keep `SKILL.md` focused on the minimum instructions an agent needs at runtime.
3. Move long examples, schemas, or domain references into `references/`.
4. Put deterministic helper scripts in `scripts/` when repeated work should not be rewritten.
5. Preserve valid YAML frontmatter with `name` and `description`.
6. Add a compact validation checklist that can be executed or inspected after edits.

## Validation Checklist

- The trigger description names the actual user intent.
- The body avoids generic advice the base agent already knows.
- Referenced files exist and are reachable from `SKILL.md`.
- Any bundled script has clear inputs, outputs, and failure behavior.

