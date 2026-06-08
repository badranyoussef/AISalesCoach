# AiSalesCoach — Hvordan opsætningen virker

Sidst opdateret: 2026-06-06

---

## 1. Hvad en "agent" er

En agent er ikke et separat program. Det er en Claude-instans der starter med et specifikt system-prompt — indholdet af `.claude/agents/[navn].md`. Hver gang en agent kaldes, læser den sit eget `.md`-fil som instruktion, kører sin opgave, og returnerer et svar. Den husker ingenting til næste gang.

**Agenter er kun så kloge som hvad der står i deres prompt.**

---

## 2. Hvad der auto-loades

Fire filer indlæses automatisk i enhver agent-kørsel:

```
.claude/rules/product-context.md    ← Hvad produktet er, domænemodel, arkitektur
.claude/rules/aisalescoach.md       ← Kodestandarder, navngivning, sikkerhedsregler
.claude/rules/honesty.md            ← Ærlighed og read-token krav
.claude/rules/lessons-learned.md   ← Akkumuleret viden fra tidligere features
```

Alle 29 agenter ser disse fire filer ved hvert kald — uden at det skal angives eksplicit.

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
`feature-build.js` kombinerer begge mønstre i ét script med 7 faser. Planner returnerer et schema-valideret JSON-objekt som alle downstream agenter bruger direkte — ingen fortolkning, ingen fejl.

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
    ├── Phase 4: infrastructure-developer (Sonnet)
    │
    ├── Phase 5: api-developer (Sonnet)
    │
    ├── Phase 5b: ui-designer (Opus) — kun hvis needs_ui_design=true
    │
    ├── Phase 6: desktop + web + extension (parallelt, Sonnet)
    │       Starter KUN efter Phase 5 — læser Contracts-projektet
    │
    └── Phase 7: csharp-reviewer + arch-guardian + security-reviewer (parallelt)
                 + compliance-specialist (hvis audio/GDPR-risici)
                 + ai-safety-specialist (hvis LLM-features)

Derefter: /retro → opdaterer lessons-learned.md
```

---

## 5. Hvordan systemet bliver klogere over tid

Agenter har ingen hukommelse. Den eneste måde de kan blive klogere på er hvis deres kontekst (rules-filerne) bliver rigere.

**Mekanismen:**

```
Feature bygget
    ↓
/retro køres
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
| `lessons-learned.md` | Mønstre, fejl, konventioner fra hvert byggeri | `/retro` workflow |
| `product-context.md` | Ny domænelogik, nye endpoints, nye beslutninger | tech-lead manuelt efter feature |
| Agent `.md`-filer | Agent-specifik viden (fx ny EF Core pattern) | Direkte edit når noget opdages |

---

## 6. Sikring af at agenter har læst det nødvendige

**Niveau 1 — Automatisk (rules-filer):**
Alt i `.claude/rules/` loades automatisk. Agenter behøver ikke gøre noget — de ser det altid.

**Niveau 2 — FILETOKEN-system:**
`product-context.md` og `aisalescoach.md` indeholder skjulte tokens (`Nx7vP` og `Qm3kR`). Kommandoer kræver at agenter starter svar med `*Nx7vP-Qm3kR-read*`. En agent der ikke har læst filerne kender ikke tokensene — det er synligt med det samme.

**Niveau 3 — Eksplicit instruktion i agent-prompts:**
`dotnet-developer`: *"Læs AiSalesCoach.Contracts/ inden du implementerer API-kald"*
`desktop-developer`: *"Byg IKKE mod et endpoint der ikke er i docs/api-contracts.md"*

**Niveau 4 — `docs/api-contracts.md`:**
Opdateres af `dotnet-developer` efter hvert backend-build. Frontend-agenter læser den inden de implementerer. Det er den eneste kilde til sandhed om hvad der er tilgængeligt.

---

## 7. Model-valg

| Model | Bruges til | Hvorfor |
|-------|-----------|---------|
| **Opus** | planner, tech-lead, ai-engineer, salescoach-optimizer, compliance-specialist, ai-safety-specialist, prompt-optimizer, ui-designer, product-manager | Strategiske beslutninger, kompleks syntese, domæne-ekspertise |
| **Sonnet** | Alle implementerings- og review-agenter | Hurtigere, billigere, tilstrækkeligt til kode og review |

Grundregel: **design og strategi = Opus, implementering og review = Sonnet**.

---

## 8. Hvad der stadig er manuelt

| Handling | Hvem | Hvornår |
|----------|------|---------|
| Kør `/retro` | Bruger | Efter hver feature |
| Opdatér `product-context.md` | tech-lead (manuelt) | Når ny domænelogik lander |
| Besvar `platform-decisions.md` | Bruger + partner | Blokerer Organisation/Project-schema |
| Beslut overlay-bredde (320 vs 400px) | Bruger | Blokerer Desktop-implementation |

---

## 9. Kommandoer i praksis

| Kommando | Hvornår |
|----------|---------|
| `/feature [beskrivelse]` | Byg en ny feature end-to-end |
| `/plan [beskrivelse]` | Planlæg uden at bygge — få plan til godkendelse |
| `/review` | Code review af alle ændrede filer |
| `/retro` | Efter en feature — opdater hvad systemet ved |
| `/idea [idé]` | Evaluer en produktidé med RICE-score |

---

## 10. De 29 agenter — hvem gør hvad

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
| `react-reviewer` | Sonnet | React hooks, render performance |
| `typescript-reviewer` | Sonnet | TypeScript strict mode |
| `clean-arch-guardian` | Sonnet | Laggrænser, dependency-regler |
| `security-reviewer` | Opus | JWT, Deepgram tokens, customer_state, OWASP |
| `code-reviewer` | Sonnet | Generel fallback-reviewer |

### Specialister
| Agent | Model | Rolle |
|-------|-------|-------|
| `planner` | Opus | Implementeringsplaner med præcise komponent-navne |
| `efcore-guide` | Sonnet | EF Core, Npgsql, migrations |
| `dotnet-build-resolver` | Sonnet | Build-fejl, NuGet, XAML compile errors |
| `database-reviewer` | Sonnet | PostgreSQL queries, schema, indexes |
| `tdd-guide` | Sonnet | xUnit tests, TDD workflow |

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
| `salescoach-optimizer` | Opus | Coaching logik, SPIN/Challenger, framework-coverage |
| `ui-designer` | Opus | Wireframes, overlay-design, komponent-hierarki |

### Compliance, Sikkerhed & Drift
| Agent | Model | Rolle |
|-------|-------|-------|
| `compliance-specialist` | Opus | GDPR, optagelsessamtykke, Datatilsynet |
| `ai-safety-specialist` | Opus | Prompt injection via audio, output-validering |
| `incident-engineer` | Sonnet | Logging, OpenTelemetry, health checks |
| `devops-engineer` | Sonnet | GitHub Actions, Docker, CI/CD |
