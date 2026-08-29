# API-Sync AI — Project Context & Teammate Handoff

This document serves as the internal technical and product context document for our two-person BuildSprint team (LatentForce.ai). It provides complete shared state, design goals, rules, and current progress.

---

## 1. Project Overview

- **Name:** API-Sync AI
- **Core Problem:** Technical and API documentation frequently becomes outdated ("documentation drift") when underlying code evolves. This creates confusion for developers, breaks client integrations, and inflates support overhead.
- **Target Users:**
  - **API Creators:** Ensure public and internal endpoints remain accurately documented.
  - **Open-Source Maintainers:** Prevent issue reports caused by stale READMEs and API specs.
  - **Developer Teams:** Keep fast-moving codebases and docs in sync automatically.
- **Product Vision:** API-Sync AI will detect API/code changes, identify affected documentation, generate precise documentation updates, and provide an efficient developer review/synchronization workflow.
- **Current Reality:** *The product vision is NOT yet implemented.* The project is currently at the repository setup stage.

---

## 2. BuildSprint 2026 Context

Built for **BuildSprint 2026** by team **LatentForce.ai**.

Official Competition Rules & Constraints:
- **Sprint Window:** 48-hour online build sprint (28 Aug 2026 6:00 PM IST to 30 Aug 2026 6:00 PM IST).
- **Time Window Rule:** Projects must be built strictly during the official build window. Pre-built projects are ineligible.
- **AI Coding Harness:** **LatentCode** is the ONLY AI coding harness permitted to write submission code.
- **Allowed Tools:** Standard developer tools (Git/GitHub, package managers, databases, APIs, frameworks, open-source libraries) are allowed.
- **Submission Requirements:**
  - Public/judge-accessible GitHub project link.
  - Demo video (max 2 minutes).
  - Build in Public link.
  - Exported LatentCode transcript(s) for each team member writing code with LatentCode.
  - SkillPatch skill must be used in the build and declared in submission to qualify for the SkillPatch prize category.

### Official Judging Weights
- **Idea & Innovation:** 30%
- **Execution:** 30%
- **Usefulness & Impact:** 25%
- **Presentation & Demo:** 10%
- **Build in Public:** 5%

---

## 3. Tooling & Environment State

### LatentCode
- LatentCode is active and connected as our sole AI coding harness.
- All submission code generation will occur strictly within LatentCode.
- Development follows an incremental, verifiable step-by-step workflow.

### AI Model Provider (Gemini)
- Runtime AI provider for the application will be **Gemini**.
- A Gemini API key is available in the environment (`GEMINI_API_KEY`).
- We do **NOT** have an OpenAI API key.
- **Secret Management:** Never hardcode or commit API keys or credentials.
- Specific Gemini SDKs and models will be selected when architecture decisions are finalized.

### SkillPatch Status & Installed Skill
- **Status:** SkillPatch is connected to LatentCode (`https://skillpatch.dev`).
- **`/skillpatch` Availability:** Verified and active.
- **Installed Skill:** `api-documentation` (slug: `api-documentation`)
  - **Local Path:** `.latentcode/skills/api-documentation/SKILL.md`
  - **Capabilities:** Analyzes route/controller code, OpenAPI YAML/JSON, Postman collections, plain text endpoint lists, gRPC protos, and GraphQL schemas across JS/TS, Python, Java, and C#. Produces structured Markdown, OpenAPI 3.0 YAML, self-contained HTML docs, or Postman JSON.
  - **Verification:** Security score `94/100`, verified `true`, security passed `true`.
  - **What It Does NOT Do:** It does NOT monitor Git repositories, compute code diffs, detect drift, run a web UI, integrate with GitHub PRs, or store database records.
  - **Role:** It acts as a specialized documentation-generation engine *within* our system, while API-Sync AI owns change detection, drift analysis, UI, and review workflows.
  - **Integration Status:** Installed and verified in repo; application invocation code pending.

---

## 4. Repository & Milestone Tracking

- **GitHub Repository:** `https://github.com/toufiqfarhan0/api-sync`
- **Default Branch:** `main`
- **Initial Commit Hash:** `2a575dc05dc242c8854d289f1551b25a757f57ac`
- **Initial Commit Message:** `Initial commit: establish project repository structure`
- **Documentation Commit Hash:** `d8e8501fd1b787e34374ce47cdc57ae1e9911973` (`docs: add project context and build plan`)

### Completed Milestones
1. [x] Repository initialized & connected to GitHub.
2. [x] Initial clean commit created and pushed.
3. [x] LatentCode harness active and verified.
4. [x] SkillPatch connection verified.
5. [x] `api-documentation` evaluated and selected as recommended SkillPatch skill.
6. [x] Living README.md and context.md created.
7. [x] `api-documentation` SkillPatch skill installed at `.latentcode/skills/api-documentation`.

### Pending Milestones
1. [ ] Finalize product architecture.
2. [ ] Decide technology stack based on architecture.
3. [ ] Implement core API-Sync workflow.
4. [ ] Integrate Gemini as runtime AI provider.
5. [ ] Implement documentation synchronization logic.
6. [ ] Implement developer review/sync experience.
7. [ ] Integrate GitHub interactions (as defined by final architecture).
8. [ ] End-to-end testing and validation.
9. [ ] Demo video & Build in Public preparation.
10. [ ] Final submission preparation (transcripts, Drive folder, submission form).

---

## 5. Teammate Collaboration & Principles

- **Shared Context:** Both teammates maintain alignment via `context.md` (internal/technical context) and `README.md` (public project context).
- **Core Product Principle:** *"Keep API documentation synchronized with the code that defines the API."*
- **Build Principle:** *"Build the smallest real, useful version first; verify it; then expand."*
- **No Premature Architecture:** Frameworks, databases, webhooks, deployment targets, and UI components are intentionally left unselected until decided explicitly in upcoming architecture steps.
- **Git & Safety Hygiene:**
  - Work in small, verifiable increments.
  - Coordinate before editing files currently being worked on by the teammate.
  - Keep main branch stable; test before marking complete.
  - Never commit credentials, secrets, or API keys.

---

## Current State
Repository setup is complete. SkillPatch connectivity is verified. The `api-documentation` skill has been evaluated and installed at `.latentcode/skills/api-documentation`. Product implementation has not yet started.

## Next Step
Finalize product architecture and technology stack, then proceed with core API-Sync implementation using the installed `api-documentation` skill for update generation.
