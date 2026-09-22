# Sprint 0 — status and setup steps (W6)

Per the W6 material, Sprint 0 = repo, board, rule files, branch rule, done **before** any feature
sprint. Checked against this repo on 2026-09-22.

## Status

| Sprint 0 item | Status |
|---|---|
| GitHub repo created | ✅ `tpose-corp/mala-risk-screening` |
| Whole team has repo access | ⚠️ Only 3 collaborators total (1 admin, 2 read-only). The team has 5 roles in `Roles.txt` — confirm everyone is actually invited, and that non-admin members have **Write**, not just **Read** (Read can't push a branch or open a PR) |
| `CLAUDE.md` at repo root | ✅ added (this sprint) |
| `rule.md` at repo root | ✅ moved from `.docs/03-compliance/rule.md` (this sprint) |
| Project board with locked MUST items as issues | ❌ no issues exist yet — see steps below |
| `main` + feature branches, a simple branch rule | ❌ only `main` exists, no branch protection rule |
| `README.md` skeleton | ✅ already present |
| `.gitignore` | ✅ already present |
| One MCP (GitHub) connected to Claude Code, proven | ❌ not yet — see steps below |

## Steps to run yourself (do not have the agent run these)

These touch GitHub directly (issues, permissions, branch rules) — run them yourself so the
activity is attributed to the right team member, not the agent.

### 1. Confirm/fix team access

```
gh api repos/tpose-corp/mala-risk-screening/collaborators
```

For anyone missing or stuck on Read:

```
gh api -X PUT repos/tpose-corp/mala-risk-screening/collaborators/<github-username> -f permission=push
```

(`push` = GitHub's "Write" role — needed to create branches and open PRs.)

### 2. Turn the locked MUST list into issues, one per person

Using the MUST list from `.docs/04-build/scope-lock.md` (already confirmed/locked), create one
issue per item and assign it to a teammate — split the 7 items across the team so it isn't one
person again:

```
gh issue create --repo tpose-corp/mala-risk-screening \
  --title "PBI-01: Login" \
  --body "As front-line staff, I need to log in with my own account. See .docs/01-requirements/backlog.md#PBI-01" \
  --assignee <github-username> --label must
```

Repeat for PBI-04, 05, 06, 07, 11, 12 (the MUST list), and for the test plan
(`.docs/04-build/test-plan.md`, already drafted — covers all 7 MUST items).

Create a **project board** (or use the repo's default "Projects" tab) with columns To do / In
progress / Done, and add the MUST issues to it. Should/Could/Won't items from `scope-lock.md` can
go on the board too, in a separate "Parked" column, so they're visible but not in this sprint.

### 3. Branch rule

Minimal version — protect `main`, require a PR instead of pushing directly:

```
gh api -X PUT repos/tpose-corp/mala-risk-screening/branches/main/protection \
  -f required_pull_request_reviews[required_approving_review_count]=1 \
  -f enforce_admins=false \
  -f restrictions=null \
  -f required_status_checks=null
```

Then each person works on `feature/<short-name>` branches and opens a PR into `main`.

### 4. Connect GitHub MCP to Claude Code

Follow Claude Code's `/mcp` setup for the GitHub MCP server, pointed at this repo. Prove it works
by asking the agent to list the open issues you just created — if it reads them without you
pasting anything, it's connected.
