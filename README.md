# API-Sync AI

API-Sync AI is designed to help API creators, open-source maintainers, and development teams keep their API documentation synchronized with changes in their codebase.

**Tagline:** Bridge the gap between evolving code and accurate API documentation.

---

## Problem

Technical documentation frequently becomes outdated as codebases and APIs evolve. Development teams move fast, refactoring code, updating function signatures, changing endpoints, and altering data structures. However, updating technical documentation is often a manual, post-hoc process that gets overlooked during rapid development.

Stale API documentation leads to broken client integrations, wasted developer time, increased support overhead, and loss of trust in technical tools and products.

---

## Who It's For

- **API Creators:** Ensure external consumers always have accurate endpoints, payload structures, and example requests matching the live code.
- **Open-Source Maintainers:** Prevent issue reports and developer confusion caused by outdated README files, guides, and API specifications.
- **Developer Teams:** Keep internal and external technical documentation aligned with fast-moving code changes without requiring tedious manual documentation audits.

---

## Product Vision

API-Sync AI is intended to become an automated documentation synchronization assistant. It aims to continuously monitor codebases for API-related changes, analyze the semantic differences, detect affected documentation, generate precise documentation updates, and provide an intuitive review workflow for developers.

---

## How It Should Work

The intended end-to-end product workflow consists of five conceptual stages:

1. **Change Detection:** Detect relevant changes in a codebase, such as API route or parameter modifications.
2. **Change Analysis:** Understand what changed in the underlying code or API signatures.
3. **Drift Identification:** Identify documentation that may have become outdated due to code changes.
4. **Update Generation:** Generate appropriate documentation updates and proposed fixes.
5. **Review & Sync:** Provide a useful review and update workflow for the developer to inspect and approve changes before syncing.

*(Note: The above stages reflect the intended conceptual workflow. None of these automated stages are implemented yet.)*

## Product Architecture & Workflow

API-Sync AI uses a hybrid deterministic and AI-powered architecture designed for safety, accuracy, and developer trust.

### Approved End-to-End Workflow

1. **Input & Extraction:** Developer inputs a GitHub repository and Pull Request URL (or number).
2. **Diff Retrieval:** API-Sync fetches the PR's changed files and diff via the GitHub REST API (Octokit).
3. **Route & Code Parsing:** Deterministic logic filters modified route/controller files (e.g. Express, FastAPI, NestJS) and extracts endpoint changes.
4. **Documentation Location:** Deterministic logic locates corresponding documentation files in the repo (`README.md`, `docs/*.md`).
5. **Semantic Drift Detection (Gemini):** Gemini analyzes the code diff against existing documentation snippets to determine whether documentation drift exists and explains the inconsistency.
6. **Structured Doc Generation (SkillPatch):** The installed `api-documentation` SkillPatch skill formats and generates precise, standardized Markdown documentation updates from the extracted API changes.
7. **Interactive Review Studio:** The proposed documentation update and drift explanation are rendered side-by-side for developer inspection.
8. **Explicit Human Approval & Sync:** Upon explicit developer approval, API-Sync commits the updated documentation directly to the relevant GitHub PR branch.

### Core Component Responsibilities

- **Frontend (Review Studio):** Provides PR/repository input, displays drift analysis state, renders side-by-side documentation diffs, and captures explicit developer approval.
- **GitHub Service (Octokit):** Fetches PR metadata, diffs, and repository files; commits approved documentation updates.
- **Change Analysis:** Deterministically parses diffs, identifies API-related source files, and extracts parameters and handlers.
- **Gemini Engine:** Performs semantic drift detection, identifies behavioral mismatches between code and docs, and explains why documentation is stale.
- **SkillPatch `api-documentation`:** Owns structured documentation update drafting and formatting rules (Markdown API tables, response types, example request snippets).
- **Review Layer:** Enforces explicit human-in-the-loop validation before any repository changes are pushed.

### MVP Technology Stack

- **Framework:** Next.js (TypeScript)
- **Styling:** Tailwind CSS
- **GitHub SDK:** `@octokit/rest`
- **Runtime AI Provider:** Gemini (using `GEMINI_API_KEY` from environment variables)
- **Documentation Generator:** Installed SkillPatch `api-documentation` skill (`.latentcode/skills/api-documentation`)

### Architecture Boundaries (Explicitly Out of Scope)

To ensure a reliable, high-impact MVP within the BuildSprint, the following are explicitly out of scope:
- Vector databases and complex RAG infrastructure
- Webhook servers and background worker queues
- Complex multi-tenant OAuth organization management
- Automatic background auto-committing without human approval

---

## What Exists Today

The project is currently in its initial setup phase. No application features, backend services, or user interfaces have been implemented yet.

Current state of the repository:
- `README.md` (this living project context and documentation file)
- `.gitignore` (standard repository exclusion rules)

The application itself has not yet been implemented.

---

## Current Status

- **Repository setup:** complete
- **GitHub repository:** connected
- **Initial commit:** complete
- **LatentCode:** connected/active
- **SkillPatch:** connected and verified
- **SkillPatch project-level installation:** complete (`api-documentation` installed at `.latentcode/skills/api-documentation`)
- **Product Architecture & Tech Stack:** complete (Next.js, Octokit, Gemini, SkillPatch)
- **Application implementation:** started (Next.js 15, TypeScript, Tailwind CSS application foundation scaffolded and verified)

---

## BuildSprint 2026

Project created for **BuildSprint 2026** by team **LatentForce.ai**.

Official BuildSprint Rules & Constraints:
- 48-hour build sprint
- Build window: 28 Aug 2026, 6:00 PM IST to 30 Aug 2026, 6:00 PM IST
- Projects must be built during the official window
- Pre-built projects are not eligible
- LatentCode is the only AI coding harness allowed for writing submission code
- Normal Git/GitHub, package managers, APIs, databases, frameworks, etc. are allowed
- Submission requires the GitHub project link
- Demo video maximum: 2 minutes
- Build in Public link is part of submission
- LatentCode session transcript is required
- Team members who write code with LatentCode need their own exported transcript
- SkillPatch category requires at least one SkillPatch skill to be used and declared

---

## Judging Strategy

### Official Judging Criteria & Weights
- **Idea & Innovation:** 30%
- **Execution:** 30%
- **Usefulness & Impact:** 25%
- **Presentation & Demo:** 10%
- **Build in Public:** 5%

### Our Project Alignment Strategy
*Official criteria define how projects are evaluated; our strategy outlines how we focus our build efforts.*
- **Idea & Innovation (30%) & Usefulness & Impact (25%):** Focus on solving the universal developer problem of documentation drift through intelligent, automated change detection and review workflows.
- **Execution (30%):** Build a working, verified core product within the sprint window using small, incremental development steps rather than unverified complex scope.
- **Presentation & Demo (10%) & Build in Public (5%):** Produce a concise 2-minute demonstration showing a clear problem-solution flow, accompanied by public build updates.

---

## SkillPatch

- SkillPatch is connected to our LatentCode environment.
- **Installed Skill:** `api-documentation` (slug: `api-documentation`)
  - **Location:** `.latentcode/skills/api-documentation/SKILL.md`
  - **Purpose:** Generates comprehensive, structured API documentation (Markdown, OpenAPI 3.0 YAML, Postman JSON, HTML) from route/controller source code, specs, or endpoint definitions.
  - **Workflow Role:** Intended to own Stage 4 (Update Generation) and support Stage 2 (Change Analysis) in the API-Sync AI pipeline by formatting code/API changes into standard documentation formats.
  - **What It Does NOT Do:** It does not perform Git repository monitoring, code diffing, drift detection, application UI rendering, database persistence, or GitHub PR management.
  - **Integration Status:** Installed and verified in project repository; not yet invoked in product code (application implementation pending).
- The skill will be declared in the final submission to count for the SkillPatch category according to the rulebook.

---

## Team Workflow

This repository will be developed by two teammates under team **LatentForce.ai**.

Team Principles:
- Use LatentCode as the AI coding harness for implementation.
- Work in small, verifiable steps.
- One major task at a time.
- Review the current repository state before making changes.
- Do not fabricate implementation status.
- Keep README documentation synchronized with meaningful project changes.
- After a meaningful completed milestone, commit and push.
- Coordinate before modifying areas currently being worked on by the other teammate.
- Avoid unnecessary rewrites of each other's work.

---

## Development Rules

- Keep the main branch stable.
- Do not commit secrets/API keys.
- Do not commit SkillPatch or LatentCode credentials.
- Do not claim an integration is complete until it is verified.
- Test important functionality before calling a milestone complete.
- Keep commits meaningful and descriptive.
- Keep the README current as the project evolves.

---

## Project Milestones

Initial Roadmap:
- [x] Initial repository setup — complete
- [x] SkillPatch selection (`api-documentation`) — complete
- [x] SkillPatch installation (`.latentcode/skills/api-documentation`) — complete
- [x] Product architecture & tech stack selection — complete
- [x] Next.js application scaffold & setup — complete
- [x] GitHub PR Ingestion Service (`@octokit/rest`) — complete
- [x] Deterministic route/controller code diff parser — complete
- [x] Documentation Context Collector — complete
- [ ] Gemini drift detection engine — pending
- [ ] SkillPatch doc generator engine — pending
- [ ] Review Studio UI — pending
- [ ] Review experience — pending
- [ ] Testing and reliability — pending
- [ ] Demo preparation — pending
- [ ] Final submission preparation — pending

*(Note: This is an initial roadmap and will be adapted as real development progresses.)*

---

## Change Log / Build Log

- **Initial Setup:**
  - Initial repository established
  - Initial commit created and pushed
  - SkillPatch connection verified
- **SkillPatch Integration:**
  - Evaluated and selected `api-documentation` SkillPatch skill
  - Installed `api-documentation` into `.latentcode/skills/api-documentation`
  - Verified installation and skill loading in LatentCode
- **Product Architecture & Tech Stack:**
  - Finalized MVP architecture: Next.js + Octokit + Gemini + SkillPatch
  - Defined end-to-end PR-driven workflow and side-by-side Review Studio
- **Application Scaffold:**
  - Created Next.js 15 App Router foundation with TypeScript and Tailwind CSS
  - Configured ESLint and PostCSS
  - Verified `npm run lint`, `npm run build`, and `next dev` local server execution
- **GitHub PR Ingestion Service:**
  - Added `@octokit/rest` dependency
  - Implemented typed `fetchPullRequestData` service in `src/lib/github/`
  - Retrieves PR metadata, changed file list, status, additions/deletions, and raw patch/diff content
  - Normalizes responses into clean internal TypeScript structures (`NormalizedPullRequestData`)
  - Added unit test suite with 100% test coverage using Vitest
  - Does NOT yet perform route parsing, drift detection, or GitHub writes/commits
- **Deterministic API Change Parser:**
  - Implemented zero-AI deterministic parser in `src/lib/api-parser/`
  - Parses Express/Koa/FastAPI routes (`router.get`, `router.post`) and Next.js App Router handlers (`export function GET`)
  - Extracts HTTP methods, route paths, path parameters (`:id`), query parameters (`req.query`), request body fields (`req.body`), and response status codes (`res.status`)
  - Identifies change types (`ADDED`, `MODIFIED`, `REMOVED`) from Git patch diffs
  - Added 12 unit tests verifying deterministic extraction and zero hallucination
  - Does NOT use Gemini or AI models; pure deterministic code only
- **Documentation Context Collector:**
  - Implemented deterministic documentation section collector in `src/lib/doc-collector/`
  - Inspects `README.md` and `docs/**/*.md` files to extract sections matching parsed `ApiChange` items
  - Parses Markdown headings (`#`, `##`, `###`) and performs deterministic matching on paths, HTTP methods, and route keywords
  - Reports match confidence (`HIGH`, `MEDIUM`, `LOW`) and match reason (`METHOD_AND_PATH`, `EXACT_PATH`, `HEADING_MATCH`, `ROUTE_KEYWORD`)
  - Added 8 unit tests covering section parsing, exact/partial matching, and unmatched change tracking
  - Gemini drift detection remains pending (no AI or doc modification performed at this stage)

*(Future entries will be added as real milestones are completed.)*

---

## Submission Checklist

Official Submission Checklist:
- [ ] Public/judge-accessible GitHub repository
- [ ] Working project
- [ ] Demo video <= 2 minutes
- [ ] Build in Public post/link
- [ ] Exported LatentCode transcript(s)
- [ ] Google Drive folder containing demo video and required transcripts
- [ ] Final submission before the deadline
- [ ] SkillPatch skill declared if used

---

## Repository Information

- **GitHub repository:** https://github.com/toufiqfarhan0/api-sync
- **Default branch:** main

---

## Documentation Policy

This README is a living source of project context. When implementation, architecture, dependencies, integrations, or major milestones change, update this document as part of the same development step whenever appropriate.

---

## Current Build Principle

"Build the smallest real, useful version first; verify it; then expand."

"API-Sync AI uses deterministic code and GitHub processing for reliable change extraction, Gemini for semantic reasoning, and SkillPatch for structured documentation generation, with explicit human approval before synchronization."
