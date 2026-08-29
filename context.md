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
  - **Integration Status:** Installed and actively invoked at runtime (`src/lib/doc-generator/`) via server-side loader `loadApiDocumentationSkill()`.

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
8. [x] Product architecture finalized (PR-driven workflow, Review Studio, Gemini drift engine, SkillPatch doc generator).
9. [x] Technology stack selected (Next.js, TypeScript, Tailwind CSS, Octokit, Gemini SDK, SkillPatch).
10. [x] Next.js 15 App Router application scaffolded and verified with TypeScript, Tailwind CSS, and ESLint.
11. [x] GitHub PR Ingestion Service implemented (`src/lib/github/`) with Octokit and 100% unit test coverage.
12. [x] Deterministic API Change Parser implemented (`src/lib/api-parser/`) with 12 unit tests and 0 AI dependencies.
13. [x] Documentation Context Collector implemented (`src/lib/doc-collector/`) with 8 unit tests for Markdown section extraction.
14. [x] Gemini Semantic Drift Engine implemented (`src/lib/drift-engine/`) using `gemini-2.0-flash` with 10 unit tests.
15. [x] SkillPatch Documentation Generator Engine implemented (`src/lib/doc-generator/`) consuming `.latentcode/skills/api-documentation/SKILL.md` with 7 unit tests.
16. [x] Review Studio UI & Analysis Orchestration API implemented (`src/app/page.tsx` & `src/app/api/analyze/route.ts`).

### Pending Milestones
1. [ ] Implement GitHub sync commit action.
2. [ ] End-to-end testing and validation.
3. [ ] Demo video & Build in Public preparation.
4. [ ] Final submission preparation (transcripts, Drive folder, submission form).

---

## 5. Approved Product Architecture & Technical Decisions

### Approved MVP Workflow
1. **Developer Input:** User provides GitHub repository (`owner/repo`) and Pull Request number.
2. **GitHub Diff Retrieval:** Backend uses Octokit (`@octokit/rest`) to fetch PR metadata, changed files, and code diffs.
3. **Route & Code Parsing:** Deterministic logic identifies API route/controller changes and extracts route paths, parameters, and status codes.
4. **Documentation Location:** Deterministic logic locates matching repository documentation files (`README.md`, `docs/*.md`).
5. **Semantic Drift Detection (Gemini):** Gemini receives code diffs + existing documentation snippets, evaluates whether documentation drift exists, and provides a clear explanation.
6. **Structured Doc Generation (SkillPatch):** The installed `api-documentation` skill formats updated API documentation snippets (Markdown tables, response models, `curl` examples).
7. **Side-by-Side Review Studio:** Next.js UI presents detected changes, drift explanations, and side-by-side old vs proposed doc diffs.
8. **Explicit Human Sync:** Developer reviews the proposal and explicitly clicks "Sync Documentation", triggering an Octokit commit back to the PR branch.

### Component Responsibilities
- **Frontend (Next.js + Tailwind):** PR input, progress state, diff viewer, explicit approval trigger.
- **GitHub Service (Octokit):** Fetch PR files, read repo docs, push doc update commits.
- **Change Analysis Engine:** Deterministic diff parser and route/controller extractor.
- **Gemini Runtime Provider:** Semantic drift analysis and explanation.
- **SkillPatch `api-documentation`:** Standardized Markdown/OpenAPI documentation generation.
- **Review Layer:** Human-in-the-loop review and approval before writing to GitHub.

### Approved Technology Stack
- **Framework:** Next.js (TypeScript)
- **Styling:** Tailwind CSS
- **GitHub SDK:** `@octokit/rest`
- **AI Provider:** Gemini (`GEMINI_API_KEY` in environment variables)
- **Documentation Engine:** SkillPatch `api-documentation` skill (`.latentcode/skills/api-documentation`)

### Architectural Boundaries
- No vector databases or RAG infrastructure.
- No background queue/worker architecture.
- No webhook servers or public tunnel dependencies.
- No complex multi-tenant OAuth setups.
- No auto-committing without human approval.

### Implementation Order
1. Next.js application scaffold & setup.
2. Octokit GitHub service (PR diff fetch & file write).
3. Deterministic code diff parser module.
4. Gemini drift detection engine.
5. SkillPatch `api-documentation` prompt executor.
6. Side-by-Side Review Studio UI.
7. GitHub Sync action button & commit handler.
8. Verification & Demo recording.

---

## 6. Teammate Collaboration & Principles

- **Shared Context:** Both teammates maintain alignment via `context.md` (internal/technical context) and `README.md` (public project context).
- **Core Product Principle:** *"Keep API documentation synchronized with the code that defines the API."*
- **Build Principle:** *"Build the smallest real, useful version first; verify it; then expand."*
- **Finalized Architecture:** Architecture and technology stack decisions are explicitly finalized in Section 5. Avoid adding unvetted frameworks, databases, or infrastructure outside these boundaries.
- **Git & Safety Hygiene:**
  - Work in small, verifiable increments.
  - Coordinate before editing files currently being worked on by the teammate.
  - Keep main branch stable; test before marking complete.
  - Never commit credentials, secrets, or API keys.

---

## Current State
Review Studio UI (`src/app/page.tsx`) and Analysis Orchestration API (`src/app/api/analyze/route.ts`) implemented. Connects PR diff retrieval, route parsing, doc context collection, Gemini drift engine, and SkillPatch doc generator into an interactive side-by-side review interface. Developer approval sets local review state (direct GitHub commit action is pending next milestone). Passes 48 total unit tests via Vitest.

## Next Step
Implement the GitHub Sync commit handler (`src/app/api/sync/route.ts`) to commit approved documentation updates directly back to the GitHub PR branch.
