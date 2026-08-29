# API-Sync AI

> Automatically keep technical documentation synchronized with changes in your API codebase.

**Tagline:** Bridge the gap between evolving code and accurate API documentation.

---

## Problem

Technical documentation frequently becomes outdated as codebases and APIs evolve. Development teams move fast, refactoring code, updating signatures, and adding endpoints. However, updating technical documentation is often a manual, post-hoc task that gets overlooked. 

Stale API documentation leads to broken integrations, increased support overhead, developer frustration, and lost trust in technical tools.

---

## Who It's For

- **API Creators:** Ensure consumers always have accurate endpoints, payload structures, and example requests.
- **Open-Source Maintainers:** Reduce issue reports caused by outdated README files, guides, and API specifications.
- **Developer Teams:** Keep internal and external technical docs aligned with fast-moving code changes without manual overhead.

---

## Product Vision

API-Sync AI is intended to become an automated documentation synchronization system. It aims to continuously analyze code changes in API repositories, determine if existing documentation is impacted, and produce precise documentation updates for developer review.

---

## How It Should Work

The intended end-to-end product workflow consists of five conceptual stages:

1. **Change Detection:** Detect relevant code changes, such as API route or parameter modifications.
2. **Change Analysis:** Analyze the precise semantic diff and context of the modified code.
3. **Drift Identification:** Map code changes against existing documentation to identify stale content.
4. **Update Generation:** Generate proposed documentation fixes and updates.
5. **Review & Sync:** Provide a streamlined review experience for developers to inspect and approve proposed changes.

*(Note: The above reflects the intended workflow design. None of these automated stages are implemented yet.)*

---

## What Exists Today

The project is currently in its initial setup phase. No application code, backend services, or user interfaces have been built or deployed yet.

Current files present in the repository:
- `README.md` (this living project context document)
- `.gitignore` (standard repository exclusion rules)

---

## Current Status

- **Repository Setup:** Complete
- **GitHub Repository:** Connected (`https://github.com/toufiqfarhan0/api-sync`)
- **Initial Commit:** Complete
- **LatentCode:** Connected and active
- **SkillPatch Environment:** Connected and verified
- **SkillPatch Project-Level Installation:** Not yet done
- **Application Implementation:** Not started

---

## BuildSprint 2026

Built for **BuildSprint 2026** by team **LatentForce.ai**.

Official BuildSprint Rules & Constraints:
- 48-hour build sprint window: **28 Aug 2026, 6:00 PM IST to 30 Aug 2026, 6:00 PM IST**.
- Projects must be built during the official window; pre-built projects are not eligible.
- LatentCode is the only AI coding harness allowed for writing submission code.
- Standard tools (Git, GitHub, package managers, APIs, databases, frameworks) are permitted.
- Submission requires a public/judge-accessible GitHub project link.
- Demo video maximum length: 2 minutes.
- Build in Public link is required as part of submission.
- LatentCode session transcript is required (each team member who writes code using LatentCode must export and submit their own transcript).
- SkillPatch category requires at least one SkillPatch skill to be used and declared in the final submission.

---

## Judging Strategy

### Official Criteria Weights
- **Idea & Innovation:** 30%
- **Execution:** 30%
- **Usefulness & Impact:** 25%
- **Presentation & Demo:** 10%
- **Build in Public:** 5%

### Our Project Alignment Strategy
- **Innovation & Impact (55%):** Address a tangible pain point (documentation drift) with a clear, automated AI-driven review workflow.
- **Execution (30%):** Deliver a working, reliable MVP within the sprint window using small, verified build steps rather than incomplete scope.
- **Presentation & Build in Public (15%):** Present a crisp, 2-minute demo video alongside clear, transparent progress updates.

---

## SkillPatch

- SkillPatch is fully connected and verified in our LatentCode environment.
- We have not selected or installed a project-level skill yet.
- We will evaluate and choose a SkillPatch skill based on actual utility for API-Sync AI.
- Any installed skill must be meaningfully used within the product.
- When a SkillPatch skill is installed, this README will be updated with the skill name, slug, purpose, usage location, and implementation status.
- The installed skill will be explicitly declared in the final submission to qualify for the SkillPatch track according to the rulebook.

---

## Team Workflow

This repository is developed by two teammates under team **LatentForce.ai**.

Core Team Principles:
- Use LatentCode as the sole AI coding harness for implementation.
- Work in small, verifiable steps.
- Focus on one major task at a time.
- Review current repository state prior to starting new changes.
- Maintain complete accuracy regarding implementation status.
- Keep README documentation synchronized with meaningful project changes.
- Create clear Git commits and push after completing meaningful milestones.
- Coordinate before modifying areas currently worked on by the other teammate.
- Avoid unnecessary rewrites of existing verified work.

---

## Development Rules

- Keep the `main` branch stable and functional.
- Do not commit secrets, API keys, or credentials.
- Do not commit SkillPatch or LatentCode credentials.
- Do not claim an integration is complete until verified.
- Test important functionality before marking a milestone complete.
- Write clear, descriptive commit messages.
- Keep the README current as the project evolves.

---

## Project Milestones

Initial Roadmap:
- [x] Initial repository setup
- [ ] SkillPatch skill selection
- [ ] SkillPatch installation and project integration
- [ ] Product architecture definition
- [ ] Core implementation setup
- [ ] Code parsing & change detection logic
- [ ] Documentation synchronization workflow
- [ ] Review & approval interface / experience
- [ ] End-to-end testing and validation
- [ ] Demo preparation
- [ ] Final submission preparation

*(Note: Milestones represent our initial project roadmap and will be updated dynamically as implementation progresses.)*

---

## Change Log / Build Log

- **Initial Setup:** Repository initialized, connected to GitHub, `.gitignore` created, initial commit pushed.
- **Environment Verification:** SkillPatch connection verified.
- **Documentation:** Shared living README created with BuildSprint guidelines, team principles, and project roadmap.
- **Current State:** No SkillPatch skills installed; no application code implemented yet.

---

## Submission Checklist

Official Submission Requirements:
- [ ] Public/judge-accessible GitHub repository URL
- [ ] Working project implementation
- [ ] Demo video (<= 2 minutes)
- [ ] Build in Public post link
- [ ] Exported LatentCode transcript(s)
- [ ] Google Drive folder containing demo video and required transcript(s)
- [ ] Final submission form submitted before the deadline
- [ ] SkillPatch skill declared (if competing in SkillPatch track)

---

## Repository Information

- **GitHub Repository:** https://github.com/toufiqfarhan0/api-sync
- **Default Branch:** `main`

---

## Documentation Policy

This README is a living source of project context. When implementation, architecture, dependencies, integrations, or major milestones change, update this document as part of the same development step whenever appropriate.

---

## Current Build Principle

"Build the smallest real, useful version first; verify it; then expand."
