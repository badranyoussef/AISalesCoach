# AiSalesCoach — Hvordan opsætningen virker

Sidst opdateret: 2026-06-09

---

## 1. Hvad en "agent" er

En agent er ikke et separat program. Det er en Claude-instans der starter med et specifikt system-prompt — indholdet af `.claude/agents/[navn].md`. Hver gang en agent kaldes, læser den sit eget `.md`-fil som instruktion, kører sin opgave, og returnerer et svar. Den husker ingenting til næste gang.

**Agenter er kun så kloge som hvad der står i deres prompt.**

---

## 2. Hvad der auto-loades

Syv filer indlæses automatisk i enhver agent-kørsel:

```
.claude/rules/product-context.md       ← Hvad produktet er, domænemodel, arkitektur
.claude/rules/aisalescoach.md          ← Kodestandarder, navngivning, sikkerhedsregler, agent-routing
.claude/rules/honesty.md               ← Ærlighed, grounding og anti-gætteri krav
.claude/rules/lessons-learned.md      ← Akkumuleret viden fra tidligere features
.claude/rules/clean-architecture.md   ← Laggrænser, forbudte imports, grep-kommandoer
.claude/rules/security-by-design.md   ← AiSalesCoach threat model, OWASP, GDPR, prompt injection
.claude/rules/code-standards.md       ← 80% testdækning, async-regler, navngivningstabel, perf-targets
```

Alle 29 agenter ser disse syv filer ved hvert kald — uden at det skal angives eksplicit.

---

## 3. Hvordan agenter samarbejder

Der er tre samarbejdsmønstre:

**Mønster A — Sekventielt (output → input)**
```
planner returnerer struktureret JSON
    ↓ sendes direkte til
dotnet-developer (ved præcis hvad der skal bygges)
    ↓ rapporterer "Backend klar, Contracts: X, Y, Z"
desktop-developer + react-developer (læser Contracts og bygger)
```

**Mønster B — Parallelt (uafhængige vinkler)**
```
csharp-reviewer  ─┐
arch-guardian    ─┼─ kører samtidig, ingen venter på hinanden
security-reviewer─┘
```

**Mønster C — Workflow-script (deterministisk orkestrering)**
`feature-build.js` kombinerer begge mønstre i ét script med 13 faser og **håndhævede gates**: hver implementeringsfase returnerer et schema-valideret build-resultat, fejl udløser automatisk `dotnet-build-resolver`, og kan fejlen ikke repareres stopper workflowet med `status: 'failed'`. Planner returnerer et schema-valideret JSON-objekt som alle downstream agenter bruger direkte — ingen fortolkning, ingen fejl.

---

## 4. Flowet fra idé til kode

```
Bruger: "/feature byg auth"
    │
    ▼
feature.md (kommando til tech-lead)
    │  1. afklar krav (max 2 spørgsmål)
    │  2. planner laver struktureret plan (PLAN_SCHEMA)
    │  3. ⛔ GODKENDELSES-GATE: brugeren godkender planen FØR der bygges
    ▼
Workflow: feature-build.js (modtager den godkendte plan via args.plan)
    │
    ├── Phase 1: Plan — springes over hvis godkendt plan medsendes
    │       Planen indeholder needs_compliance_review + needs_ai_safety_review
    │       (struktureret beslutning fra planner — IKKE keyword-matching)
    │
    ├── Phase 2: domain + contracts (parallelt, Sonnet)   ⛔ build-gate
    ├── Phase 3: application (Sonnet)                     ⛔ build-gate
    ├── Phase 3b: tdd-guide — unit tests, min. 80%        ⛔ test-gate
    ├── Phase 4: infrastructure (Sonnet)                  ⛔ build-gate
    ├── Phase 5: api (Sonnet)                             ⛔ build-gate
    ├── Phase 5b: tdd-guide — integration tests/endpoint  ⛔ build-gate
    ├── Phase 5c: ui-designer (Opus) — kun hvis needs_ui_design
    ├── Phase 6: desktop + web + extension (parallelt)    ⛔ build-gate pr. klient
    │
    │   Hver ⛔ build-gate: fejler buildet → dotnet-build-resolver kaldes
    │   automatisk (én runde). Stadig rødt → workflowet STOPPER med status 'failed'.
    │
    ├── Phase 7: VERIFIKATION — dotnet build + dotnet test på HELE solutionen
    │       Fejler → én samlet reparationsrunde → re-verifikation → ellers 'failed'
    │
    ├── Phase 8: review (parallelt, struktureret severity-output)
    │       csharp-reviewer + arch-guardian + security-reviewer (altid)
    │       + compliance-specialist (hvis plan.needs_compliance_review)
    │       + ai-safety-specialist (hvis plan.needs_ai_safety_review)
    │
    ├── Phase 9: FIX-LOOP — CRITICAL/HIGH findings rettes automatisk,
    │       re-review + re-verifikation. Består fund → status 'blocked'
    │       (featuren er IKKE done — kræver manuel stillingtagen)
    │
    └── Phase 10: retro (automatisk)
            Opdaterer lessons-learned.md + shared-components.md

Returværdi: { status: 'done' | 'failed' | 'blocked', gates: {...} }
```

---

## 5. Hvordan systemet bliver klogere over tid

Agenter har ingen hukommelse. Den eneste måde de kan blive klogere på er hvis deres kontekst (rules-filerne) bliver rigere.

**Mekanismen:**

```
Feature bygget
    ↓
retro køres AUTOMATISK (sidst i feature-build.js)
    ↓
retro.js workflow:
  1. Læser git log (hvad blev bygget)
  2. Kører analyse-agent: "hvad lærte vi?"
  3. Skriver nye entries til lessons-learned.md
    ↓
Næste feature: alle agenter ser de nye entries automatisk
```

**Tre typer viden der akkumuleres:**

| Fil | Hvad gemmes | Opdateres af |
|-----|------------|-------------|
| `lessons-learned.md` | Mønstre, fejl, konventioner fra hvert byggeri | Automatisk via retro i `feature-build.js` |
| `product-context.md` | Ny domænelogik, nye endpoints, nye beslutninger | `tech-lead` manuelt efter feature |
| Agent `.md`-filer | Agent-specifik viden (fx ny EF Core pattern) | Direkte edit når noget opdages |

---

## 6. Sikring af at agenter har læst det nødvendige

**Niveau 1 — Automatisk (rules-filer):**
Alt i `.claude/rules/` loades automatisk som projektinstruktioner. Agenter behøver ikke gøre noget — de ser det altid. Hver agent-prompt indeholder desuden en grounding-sektion der kræver at reglerne efterleves og at `product-context.md` konsulteres ved tvivl frem for at gætte (`honesty.md`).

> **Historik**: Tidligere fandtes et FILETOKEN-system hvor agenter skulle returnere et token (`*Nx7vP-Qm3kR-read*`) som bevis på at de havde læst rules-filerne. Det blev fjernet 2026-06-11: tokenværdien stod hardcodet i agent-prompterne (beviste derfor ingenting), og rules-filerne auto-loades alligevel. Mekanismen kostede kun kontekst og gav falsk tryghed.

**Niveau 2 — Eksplicit instruktion i agent-prompts:**
`dotnet-developer`: *"Læs AiSalesCoach.Contracts/ inden du implementerer API-kald"*
`desktop-developer`: *"Byg IKKE mod et endpoint der ikke er i docs/api-contracts.md"*

**Niveau 3 — Pre-commit hook:**
`settings.json` kører `pre-commit-check.py` på alle Bash-kald (hook-matchere matcher kun tool-NAVNE, så scriptet filtrerer selv: kun `git commit`-kommandoer udløser scanningen). Scriptet scanner Domain, Application og Desktop for forbudte imports (Clean Architecture violations). **Exit code 2 blokerer committet** hvis violations findes.

**Niveau 4 — Workflow-gates (feature-build.js):**
Hver implementeringsfase returnerer schema-valideret build-status. Workflowet stopper hårdt ved rød build/test og blokerer ved uløste CRITICAL/HIGH review-findings. En agent kan ikke "rapportere sig forbi" en gate — `honesty.md` forbyder falsk grøn rapportering, og verifikationsfasen genkører build+test uafhængigt.

**Niveau 5 — `docs/api-contracts.md`:**
Opdateres af `dotnet-developer` efter hvert backend-build. Frontend-agenter læser den inden de implementerer. Det er den eneste kilde til sandhed om hvad der er tilgængeligt.

---

## 7. Model-valg

| Model | Bruges til | Hvorfor |
|-------|-----------|---------|
| **Opus** | planner, tech-lead, ai-engineer, salescoach-optimizer, compliance-specialist, ai-safety-specialist, prompt-optimizer, ui-designer, product-manager, security-reviewer | Strategiske beslutninger, kompleks syntese, domæne-ekspertise, sikkerhedsanalyse |
| **Sonnet** | Alle implementerings- og øvrige review-agenter | Hurtigere, billigere, tilstrækkeligt til kode og review |

Grundregel: **design, strategi og sikkerhed = Opus, implementering og review = Sonnet**.

---

## 8. Hvad der stadig er manuelt

| Handling | Hvem | Hvornår |
|----------|------|---------|
| Opdatér `product-context.md` | `tech-lead` (manuelt) | Når ny domænelogik lander |
| Besvar `platform-decisions.md` | Bruger + partner | Blokerer Organisation/Project-schema |
| Beslut overlay-bredde (320 vs 400px) | Bruger | Blokerer Desktop-implementation |

> **Retro er ikke længere manuelt** — det kører automatisk som sidste fase i `feature-build.js`.

---

## 9. Kommandoer i praksis

| Kommando | Workflow bagved | Hvornår |
|----------|----------------|---------|
| `/feature [beskrivelse]` | `feature-build.js` | Byg en ny feature end-to-end med godkendelses-gate + håndhævede quality gates |
| `/plan [beskrivelse]` | `plan-feature.js` | Planlæg uden at bygge — triage + parallel analyse + syntese til godkendelse |
| `/review` | `review.js` | Code review af alle ændrede filer — auto-detekterede reviewers parallelt |
| `/retro` | `retro.js` | Manuel retro — opdater hvad systemet ved (kører normalt automatisk) |
| `/idea [idé]` | (direkte) | Evaluer en produktidé med RICE-score |

Alle kommandoer er tynde indgange — orkestreringslogikken bor i workflow-scriptet, ét sted.

---

## 10. Quality Gates — hvad der blokerer en feature

En feature er **ikke done** uden at alle gates er grønne. Gates er HÅNDHÆVET i `feature-build.js` — ikke kun dokumenteret:

| Gate | Krav | Håndhævelse |
|------|------|-------------|
| Plan-godkendelse | Brugeren godkender planen inden build | `/feature` Trin 2 (AskUserQuestion) |
| Build | `dotnet build` — ingen fejl | Schema-valideret per fase; fejl → auto build-resolver → ellers `status: 'failed'` |
| Tests | ≥80% unit test dækning (Application), integration test per endpoint | Test-gate Phase 3b/5b + fuld `dotnet test` i Verifikations-fasen |
| Fuld verifikation | Hele solutionen bygger + alle tests grønne | Phase 7 — uafhængig genkørsel, én reparationsrunde, ellers `failed` |
| Arkitektur | Ingen layer violations | Review-fase (arch-guardian) + pre-commit hook (exit 2 blokerer) |
| Sikkerhed | Ingen CRITICAL/HIGH findings | Findings-schema → fix-loop → består fund: `status: 'blocked'` |
| Code Review | Ingen CRITICAL/HIGH findings | Samme fix-loop som sikkerhed |
| Compliance/AI-safety | Review når planens flags kræver det | `needs_compliance_review`/`needs_ai_safety_review` fra planner (konservativ: i tvivl → true) |
| Dokumentation | `docs/api-contracts.md` opdateret | Phase 5 (api-developer) |

---

## 11. De 29 agenter — hvem gør hvad

### Primær koordinator
| Agent | Model | Rolle |
|-------|-------|-------|
| `tech-lead` | Opus | Primær dialogpartner, koordinerer alle andre |
| `product-manager` | Opus | Produktidéer, prioritering, user stories |

### Implementering
| Agent | Model | Rolle |
|-------|-------|-------|
| `dotnet-developer` | Sonnet | Domain, Application, Infrastructure, Api |
| `desktop-developer` | Sonnet | Avalonia overlay: ViewModels, Views, Services |
| `react-developer` | Sonnet | React Web: pages, components, hooks |
| `extension-developer` | Sonnet | Chrome MV3: side panel, service worker, offscreen audio |

### Review
| Agent | Model | Rolle |
|-------|-------|-------|
| `csharp-reviewer` | Sonnet | C# async, nullable, patterns |
| `avalonia-reviewer` | Sonnet | Avalonia MVVM, compiled bindings |
| `react-reviewer` | Sonnet | React hooks, render performance, AiSalesCoach-mønstre |
| `typescript-reviewer` | Sonnet | TypeScript strict mode, AiSalesCoach Web-mønstre |
| `clean-arch-guardian` | Sonnet | Laggrænser, dependency-regler |
| `security-reviewer` | Opus | JWT, Deepgram tokens, customer_state, OWASP |
| `code-reviewer` | Sonnet | Generel fallback-reviewer |

### Specialister
| Agent | Model | Rolle |
|-------|-------|-------|
| `planner` | Opus | Implementeringsplaner med præcise komponent-navne + Output Contract |
| `efcore-guide` | Sonnet | EF Core, Npgsql, migrations |
| `dotnet-build-resolver` | Sonnet | Build-fejl, NuGet, XAML compile errors |
| `database-reviewer` | Sonnet | PostgreSQL queries, schema, indexes |
| `tdd-guide` | Sonnet | xUnit tests, TDD workflow, 80% coverage |

### AI & Realtime
| Agent | Model | Rolle |
|-------|-------|-------|
| `ai-engineer` | Opus | LLM pipeline, 20s chunks, customer_state, model-valg |
| `stt-specialist` | Sonnet | Deepgram dual-stream, audio capture |
| `realtime-specialist` | Sonnet | WebSocket, SignalR, audio streaming |
| `performance-engineer` | Sonnet | <500ms latency budget, memory, profiling |

### Strategisk & Optimering
| Agent | Model | Rolle |
|-------|-------|-------|
| `prompt-optimizer` | Opus | Prompt engineering, token-effektivitet |
| `salescoach-optimizer` | Opus | Coaching logik, SPIN/Challenger/Sandler/MEDDIC, framework-coverage |
| `ui-designer` | Opus | Wireframes, overlay-design, komponent-hierarki |

### Compliance, Sikkerhed & Drift
| Agent | Model | Rolle |
|-------|-------|-------|
| `compliance-specialist` | Opus | GDPR, optagelsessamtykke, Datatilsynet |
| `ai-safety-specialist` | Opus | Prompt injection via audio, output-validering |
| `incident-engineer` | Sonnet | Logging, OpenTelemetry, health checks |
| `devops-engineer` | Sonnet | GitHub Actions, Docker, CI/CD |
