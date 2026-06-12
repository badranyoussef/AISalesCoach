# AiSalesCoach — Parallel Agent Workflow

Sidst opdateret: 2026-06-11

---

## Oversigt

Al orkestrering bor i workflow JS-scripts i `.claude/workflows/`. Markdown-kommandoerne i `.claude/commands/` er tynde indgange der kalder workflowet — de duplikerer aldrig orkestreringslogik (beslutning 2026-06-11, se `lessons-learned.md`).

| Kommando | Workflow | Hvad den gør |
|----------|----------|--------------|
| `/feature` | `feature-build.js` | End-to-end build med godkendelses-gate + håndhævede quality gates |
| `/plan` | `plan-feature.js` | Triage + parallel analyse + tech-lead-syntese |
| `/review` | `review.js` | Auto-detekterer ændrede filer, kører relevante reviewers parallelt |
| `/retro` | `retro.js` | Ekstraherer lessons + delte komponenter fra seneste commits |

---

## `/feature` → feature-build.js

Kommandoen `feature.md`:
1. Afklarer krav (max 2 spørgsmål)
2. Kalder `planner` for struktureret plan (PLAN_SCHEMA)
3. **⛔ Godkendelses-gate**: brugeren godkender planen (AskUserQuestion) FØR der bygges
4. Kalder `Workflow({name: 'feature-build', args: {feature, plan}})` med den godkendte plan

**Faser i `feature-build.js`:**

```
Phase 1  — Plan (springes over hvis args.plan medsendes)
           Planen indeholder needs_compliance_review + needs_ai_safety_review
           (strukturerede planner-beslutninger — ikke keyword-matching)

Phase 2  — Domain ║ Contracts (PARALLELT)          ⛔ build-gate
Phase 3  — Application                             ⛔ build-gate
Phase 3b — Unit Tests (tdd-guide, min. 80%)        ⛔ test-gate
Phase 4  — Infrastructure (+ migration hvis needs_migration)  ⛔ build-gate
Phase 5  — Api (minimal API endpoints)             ⛔ build-gate
Phase 5b — Integration Tests (WebApplicationFactory + Testcontainers)  ⛔ build-gate
Phase 5c — UI Design (kun hvis needs_ui_design)
Phase 6  — Desktop ║ Web ║ Extension (PARALLELT)   ⛔ build-gate pr. klient

  ⛔ build-gate: agenten returnerer schema-valideret {build_succeeded, errors}.
  Rød → dotnet-build-resolver kaldes automatisk (én runde).
  Stadig rød → workflowet STOPPER: { status: 'failed', failed_phase, errors }

Phase 7  — VERIFIKATION: dotnet build + dotnet test på HELE solutionen
           (uafhængig genkørsel — agenten må ikke rette kode, kun rapportere)
           Rød → én samlet reparationsrunde → re-verifikation → ellers 'failed'

Phase 8  — Review (PARALLELT, struktureret findings-output med severity)
           csharp-reviewer ║ arch-guardian ║ security-reviewer (altid)
           + compliance-specialist (hvis plan.needs_compliance_review)
           + ai-safety-specialist (hvis plan.needs_ai_safety_review)

Phase 9  — FIX-LOOP (kun hvis CRITICAL/HIGH findings)
           Fund routes til rette developer-agent (pr. filtype) → rettes →
           re-review af de reviewers der fandt dem → re-verifikation.
           Består fund → { status: 'blocked', blocking_findings }

Phase 10 — Retro (retro-workflow opdaterer lessons-learned + shared-components)
```

**Returværdi:** `{ status: 'done' | 'failed' | 'blocked', gates: {...}, non_blocking_findings: [...] }`
Tech-lead erklærer ALDRIG en feature done hvis status ikke er `'done'`.

---

## `/plan` → plan-feature.js

```
Phase 1 — Triage (schema: touches_audio_or_personal_data, touches_ai)
          Konservativ regel: i tvivl → true
        — Derefter PARALLELT:
          planner ║ efcore-guide ║ security-reviewer
          + compliance-specialist (hvis triage: audio/persondata)
          + ai-safety-specialist (hvis triage: AI)

Phase 2 — Syntese (tech-lead samler alle analyser til én plan)
```

---

## `/review` → review.js

```
Phase 1 — Detect (schema: has_csharp, has_desktop_xaml, has_react, ...)
          git diff + git status → strukturerede flags

Phase 2 — Review (PARALLELT, kun relevante reviewers):
          .cs               → csharp-reviewer + clean-arch-guardian + security-reviewer
          .axaml/.axaml.cs  → avalonia-reviewer
          .tsx/.ts          → react-reviewer + typescript-reviewer
          Migrations/DbContext → database-reviewer
          AI-prompts/hint-logik → ai-safety-specialist
```

---

## Hvornår parallel vs. sekventiel?

**Parallelliser når**: agenter evaluerer det samme fra uafhængige vinkler (security + arch + quality) eller bygger uafhængige artefakter (Domain ║ Contracts, Desktop ║ Web ║ Extension).

**Sekvensér når**: output fra agent A er input til agent B (planner → developer, backend → clients). Clean Architecture-lagene bygges altid bottom-up.

---

## Args-format til feature-build

```js
// Anbefalet: med bruger-godkendt plan (fra /feature Trin 2)
Workflow({ name: 'feature-build', args: { feature: 'byg auth', plan: <godkendt PLAN_SCHEMA-objekt> } })

// Uden plan (workflowet planlægger selv — brug kun ved eksplicit "byg uden stop")
Workflow({ name: 'feature-build', args: 'byg auth med login og refresh tokens' })

// Med explicit klient-override
Workflow({ name: 'feature-build', args: { feature: 'byg auth', clients: ['desktop', 'web'] } })

// Kun backend (ingen clients)
Workflow({ name: 'feature-build', args: { feature: 'byg auth', clients: [] } })
```
