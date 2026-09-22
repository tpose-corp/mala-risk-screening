[sprint-0.md](https://github.com/user-attachments/files/32513519/sprint-0.md)
# Sprint 0 — status and setup steps (W6)

Per the W6 material, Sprint 0 = repo, board, rule files, branch rule, done **before** any feature
sprint. Checked against this repo on 2026-09-22.

## Status

| Sprint 0 item | Status |
|---|---|
| GitHub repo created | ✅ `tpose-corp/mala-risk-screening` |
| Whole team has repo access | ⚠️ 3 collaborators have access. The team has 5 roles in `Roles.txt` — still need to confirm/invite the remaining 1–2 people |
| `CLAUDE.md` at repo root | ✅ added, not yet committed to GitHub |
| `rule.md` at repo root | ✅ moved from `.docs/03-compliance/rule.md`, not yet committed to GitHub |
| Project board with locked MUST items as issues | ✅ 7 issues created (PBI-01, 04, 05, 06, 07, 11, 12), board set up with Todo/In progress/Done + Parked |
| `main` + feature branches, a simple branch rule | ✅ branch protection on `main` active (PR + 1 approval required) |
| `README.md` skeleton | ✅ already present |
| `.gitignore` | ✅ already present |
| One MCP (GitHub) connected to Claude Code, proven | ✅ connected and verified — asked it to list issues, it called the MCP tool and returned all 7 correctly |

## What's left

### 1. Invite the rest of the team

```
gh api repos/tpose-corp/mala-risk-screening/collaborators
```

For anyone missing:

```
gh api -X PUT repos/tpose-corp/mala-risk-screening/collaborators/<github-username> -f permission=push
```

### 2. Get the drafted files onto GitHub

`CLAUDE.md`, `rule.md` (moved), `.gitignore`, `README.md`, and everything in `.docs/` (including
this file and `.docs/04-build/scope-lock.md` + `test-plan.md`) exist locally but aren't committed
yet. Since `main` is now protected, each commit goes through a branch + pull request — either via
`git` locally, or by editing/creating the file directly on github.com (which auto-offers to open a
branch + PR when `main` is protected).

Once everyone has access (step 1), each item on the locked MUST/SHOULD list can also get a
feature branch of its own as work on it starts, following the same branch → PR → review → merge
flow.
