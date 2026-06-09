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
.claude/rules/honesty.md               ← Ærlighed og read-token krav
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
`feature-build.js` kombinerer begge mønstre i ét script med 9 faser. Planner returnerer et schema-valideret JSON-objekt som alle downstream agenter bruger direkte — ingen fortolkning, ingen fejl.

---

## 4. Flowet fra idé til kode

```
Bruger: "/feature byg auth"
    │
    ▼
feature.md (kommando til tech-lead)
    │  afklar krav (max 2 spørgsmål)
    ▼
Workflow: feature-build.js
    │
    ├── Phase 1: planner (Opus)
    │       Læser kodebasen + rules-filer
    │       Returnerer struktureret JSON: entiteter, DTOs, endpoints, risici
    │
    ├── Phase 2: domain-developer + contracts-developer (parallelt, Sonnet)
    │
    ├── Phase 3: application-developer (Sonnet)
    │
    ├── Phase 3b: tdd-guide (Sonnet)  ← skriver xUnit tests, min. 80% dækning
    │
    ├── Phase 4: infrastructure-developer (Sonnet)
    │
    ├── Phase 5: api-developer (Sonnet)
    │
    ├── Phase 5b: ui-designer (Opus) — kun hvis needs_ui_design=true
    │
    ├── Phase 6: desktop + web + extension (parallelt, Sonnet)
    │       Starter KUN efter Phase 5 — læser Contracts-projektet
    │
    ├── Phase 7: review (parallelt)
    │       csharp-reviewer + arch-guardian + security-reviewer (altid)
    │       + compliance-specialist (hvis audio/GDPR-risici)
    │       + ai-safety-specialist (hvis LLM-features)
    │
    └── Phase 8: retro (automatisk)
            Opdaterer lessons-learned.md med mønstre fra dette byggeri
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
Alt i `.claude/rules/` loades automatisk. Agenter behøver ikke gøre noget — de ser det altid.

**Niveau 2 — FILETOKEN-system:**
`product-context.md` og `aisalescoach.md` indeholder skjulte tokens (`Nx7vP` og `Qm3kR`). Alle 29 agent-prompts starter med eksplicit instruktion om at læse begge filer og returnere `*Nx7vP-Qm3kR-read*` som allerførste linje. En agent der ikke har læst filerne kender ikke tokenerne.

**Niveau 3 — PostToolUse hook:**
`settings.json` kører `check-read-token.py` efter hvert Agent-kald. Mangler tokenet i svaret, vises en advarsel i konteksten med præcis hvad agenten skal gøre.

**Niveau 4 — Eksplicit instruktion i agent-prompts:**
`dotnet-developer`: *"Læs AiSalesCoach.Contracts/ inden du implementerer API-kald"*
`desktop-developer`: *"Byg IKKE mod et endpoint der ikke er i docs/api-contracts.md"*

**Niveau 5 — Pre-commit hook:**
`settings.json` kører `pre-commit-check.py` inden ethvert `git commit`. Scriptet scanner Domain, Application og Desktop for forbudte imports (Clean Architecture violations). **Exit code 2 blokerer committet** hvis violations findes.

**Niveau 6 — `docs/api-contracts.md`:**
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

| Kommando | Hvornår |
|----------|---------|
| `/feature [beskrivelse]` | Byg en ny feature end-to-end (9 faser inkl. tests + retro) |
| `/plan [beskrivelse]` | Planlæg uden at bygge — få plan til godkendelse |
| `/review` | Code review af alle ændrede filer |
| `/retro` | Manuel retro — opdater hvad systemet ved (normalt automatisk) |
| `/idea [idé]` | Evaluer en produktidé med RICE-score |

---

## 10. Quality Gates — hvad der blokerer en feature

En feature er **ikke done** uden at alle gates er grønne:

| Gate | Krav | Hvornår tjekkes |
|------|------|----------------|
| Build | `dotnet build` — ingen fejl, ingen warnings | Phase 3-5 (hvert lag bygger) |
| Tests | ≥80% dækning på Application-laget | Phase 3b (tdd-guide) |
| Arkitektur | Ingen layer violations | Phase 7 (arch-guardian) + pre-commit hook |
| Sikkerhed | Ingen CRITICAL/HIGH findings | Phase 7 (security-reviewer) |
| Code Review | Ingen CRITICAL/HIGH findings | Phase 7 (csharp-reviewer m.fl.) |
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
