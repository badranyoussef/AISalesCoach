# AiSalesCoach — Parallel Agent Workflow

Sidst opdateret: 2026-06-04

---

## Oversigt

AiSalesCoach bruger to mekanismer til at køre agenter parallelt:

| Mekanisme | Brugt til | Fordele |
|-----------|-----------|---------|
| **Markdown-kommando** (direkte Agent-kald) | `/review`, `/plan` | Simpelt, direkte, ingen ekstra lag |
| **Workflow JS-script** | `/feature` | Schema-baseret dataflow, resume ved fejl, synlighed |

---

## Nuværende setup

### `/feature` → Workflow-script

Kommandoen `feature.md` kalder `Workflow({name: 'feature-build'})`.

**Hvorfor Workflow her:** Plannerens strukturerede JSON-output (schema-valideret) flyder direkte til downstream agenter. Det eliminerer fortolkningsfejl og gør lange builds resumable.

**Faser i `feature-build.js`:**

```
Phase 1 — Plan
  planner (schema → struktureret JSON)

Phase 2 — Domain + Contracts (PARALLELT)
  dotnet-developer (Domain)  ║  dotnet-developer (Contracts)

Phase 3 — Application
  dotnet-developer

Phase 3b — Tests  ← NYT
  tdd-guide (xUnit tests, min. 80% dækning på Application-laget)

Phase 4 — Infrastructure
  dotnet-developer (+ EF Core migration hvis needs_migration=true)

Phase 5 — Api
  dotnet-developer

Phase 6 — Clients (PARALLELT, kun dem planner markerede needed)
  desktop-developer  ║  react-developer  ║  extension-developer

Phase 7 — Review (PARALLELT)
  csharp-reviewer  ║  arch-guardian  ║  security-reviewer
  + compliance-specialist (hvis audio/GDPR-risici)
  + ai-safety-specialist (hvis LLM/coaching-risici)

Phase 8 — Retro  ← NYT
  retro-workflow (opdaterer lessons-learned.md automatisk)
```

---

### `/review` → Direkte Agent-kald

Kommandoen `review.md` instruerer tech-lead til at kalde relevante reviewers parallelt via Agent-værktøjet.

**Relevante reviewers per filtype:**
- `.cs` → `csharp-reviewer` + `clean-arch-guardian` + `security-reviewer`
- `.axaml` / `.axaml.cs` → `avalonia-reviewer`
- `.tsx` / `.ts` → `react-reviewer` + `typescript-reviewer`
- Migrations/DbContext → `database-reviewer`
- AI-prompts/hint-logik → `ai-safety-specialist`

---

### `/plan` → Direkte Agent-kald

Kommandoen `plan.md` kører disse agenter parallelt:
- `planner` + `clean-arch-guardian` + `efcore-guide` + `security-reviewer`
- `compliance-specialist` (hvis audio/persondata)
- `ai-safety-specialist` (hvis LLM-features)

---

## Workflow-scripts der eksisterer

Alle tre scripts ligger i `.claude/workflows/` og er klar til brug:

| Script | `meta.name` | Status |
|--------|------------|--------|
| `feature-build.js` | `feature-build` | Aktiv — bruges af `/feature` |
| `review.js` | `review` | Inaktiv — script klar, kommando bruger det ikke |
| `plan-feature.js` | `plan-feature` | Inaktiv — script klar, kommando bruger det ikke |

---

## Hvornår skal Workflow-scripts bruges?

Brug Workflow-script når **alle tre** er sande:
1. Struktureret data skal flyde fra én agent til de næste (schema-valideret output)
2. Buildet har 3+ sekventielle faser der kan fejle midt i (resume er relevant)
3. Manuel koordinering er fejlbehæftet pga. kompleksitet

Brug direkte Agent-kald (markdown-kommando) når:
- Faserne er uafhængige af hinanden (ingen data skal videregives)
- Workflowet er kort nok til at resume ikke er nødvendigt

---

## Sådan aktiveres Workflow for /review

Erstat indholdet af `.claude/commands/review.md` med:

```
Du er tech-lead for AiSalesCoach.

Kald Workflow-værktøjet med:
  name: 'review'
```

Scriptet auto-detekterer filtyper og kører kun relevante reviewers.

---

## Sådan aktiveres Workflow for /plan

Erstat indholdet af `.claude/commands/plan.md` med:

```
Du er tech-lead for AiSalesCoach. Brugeren vil PLANLÆGGE (ikke bygge endnu): $ARGUMENTS

Kald Workflow-værktøjet med:
  name: 'plan-feature'
  args: { feature: '$ARGUMENTS' }
```

Scriptet kører planner + efcore + security + compliance + ai-safety parallelt og syntetiserer til én plan.

---

## Args-format til feature-build

```js
// Simpelt (feature-navn som string)
Workflow({ name: 'feature-build', args: 'byg auth med login og refresh tokens' })

// Med explicit klient-override
Workflow({ name: 'feature-build', args: { feature: 'byg auth', clients: ['desktop', 'web'] } })

// Kun backend (ingen clients)
Workflow({ name: 'feature-build', args: { feature: 'byg auth', clients: [] } })
```
