# AiSalesCoach — Status og næste skridt

Sidst opdateret: 2026-06-09

---

## Hvad er bygget

### Monorepo-struktur (`/Dev/AiSalesCoach/`)

Clean Architecture .NET 10 solution med 9 projekter — **bygger 0 fejl, 0 advarsler**.

```
src/core/AiSalesCoach.Domain          — net10.0, ingen deps
src/core/AiSalesCoach.Application     — MediatR 14, FluentValidation 12
src/core/AiSalesCoach.Contracts       — shared DTOs
src/infrastructure/AiSalesCoach.Infrastructure — EF Core 10, Npgsql, JWT
src/api/AiSalesCoach.Api              — ASP.NET Core 10, Swagger, JWT Bearer
src/clients/AiSalesCoach.Desktop      — Avalonia 12, CommunityToolkit.Mvvm, NAudio
src/clients/AiSalesCoach.Web          — tom mappe, klar til React/Vite setup
tests/ (Domain, Application, Api)
```

> **Ingen domænelogik er implementeret endnu.** Scaffoldet er på plads — alt klar til at bygge.

---

### AI-udviklingshold (`.claude/agents/` — 29 agenter)

Et komplet virtuelt konsulentteam der dækker hele produktets livscyklus.

#### Produkt & Strategi (2 agenter)
| Agent | Model | Formål |
|-------|-------|--------|
| `product-manager` | Opus | Brainstorm produktidéer, RICE-prioritering, user stories, konkurrentanalyse |
| `tech-lead` | Opus | **Primær koordinator** — modtager feature-requests, dekomponerer, orkestrerer alle andre |

#### Implementering — bygger kode (4 agenter)
| Agent | Model | Formål |
|-------|-------|--------|
| `dotnet-developer` | Sonnet | .NET features: Domain, Application, Infrastructure, Api |
| `desktop-developer` | Sonnet | Avalonia Desktop: ViewModels, Views, Services, Platform |
| `react-developer` | Sonnet | React Web: pages, components, hooks, React Query, Zustand |
| `extension-developer` | Sonnet | Chrome/Edge MV3: side panel, service worker, offscreen audio |

#### Review — godkender kode (6 agenter)
| Agent | Model | Formål |
|-------|-------|--------|
| `csharp-reviewer` | Sonnet | C# async, nullable, security, patterns |
| `avalonia-reviewer` | Sonnet | Avalonia 12 MVVM, compiled bindings, overlay |
| `react-reviewer` | Sonnet | React hooks, render performance, accessibility |
| `typescript-reviewer` | Sonnet | TypeScript strict mode, type safety |
| `code-reviewer` | Sonnet | Generel code quality |
| `clean-arch-guardian` | Sonnet | Clean Architecture laggrænser |

#### Specialister — domæneviden (6 agenter)
| Agent | Model | Formål |
|-------|-------|--------|
| `planner` | Opus | Feature-planlægning, arkitekturbeslutninger |
| `efcore-guide` | Sonnet | EF Core 10 + Npgsql, migrations |
| `dotnet-build-resolver` | Sonnet | .NET build-fejl, NuGet, XAML |
| `database-reviewer` | Sonnet | PostgreSQL queries, schema, performance |
| `security-reviewer` | Opus | JWT, auth, OWASP, secrets, AiSalesCoach threat model |
| `tdd-guide` | Sonnet | Test-first workflow, xUnit, Vitest |

#### AI & Realtime (4 agenter)
| Agent | Model | Formål |
|-------|-------|--------|
| `ai-engineer` | Opus | LLM pipeline, 20s coaching chunks, customer_state, model valg |
| `stt-specialist` | Sonnet | Dual-stream Deepgram, audio capture (Desktop + Extension) |
| `realtime-specialist` | Sonnet | WebSocket, SignalR, audio streaming |
| `performance-engineer` | Sonnet | <500ms latency budget, memory, profiling |

#### Strategisk & Optimering (3 agenter)
| Agent | Model | Formål |
|-------|-------|--------|
| `prompt-optimizer` | Opus | Prompt engineering, token-effektivitet, injection-forsvar |
| `salescoach-optimizer` | Opus | Coaching logik, SPIN/Challenger/Sandler, framework-coverage |

#### Design (1 agent)
| Agent | Model | Formål |
|-------|-------|--------|
| `ui-designer` | Opus | Wireframes, overlay-design, web dashboard, komponent-hierarki |

#### Compliance, Sikkerhed & Drift (4 agenter)
| Agent | Model | Formål |
|-------|-------|--------|
| `compliance-specialist` | Opus | GDPR, optagelsessamtykke, data retention, Datatilsynet |
| `ai-safety-specialist` | Opus | Prompt injection via lyd, output-validering, hallucination |
| `incident-engineer` | Sonnet | Logging, OpenTelemetry, health checks, incident runbooks |
| `devops-engineer` | Sonnet | GitHub Actions, Docker, CI/CD, deployment |

---

### Regler og produktkontekst (`.claude/rules/`)

| Fil | Indhold |
|-----|---------|
| `aisalescoach.md` | Kodestandarder, SOLID/DRY/YAGNI, design principper, agent routing-tabel |
| `product-context.md` | **Komplet produktviden** — læses automatisk af alle agenter. Dual-stream STT, 20s chunk-arkitektur, domænemodel, 3 klientoverflader, POC-indsigter, forretningskonstanter. **SKAL opdateres ved produktændringer.** |
| `clean-architecture.md` | Hard rule — forbudte imports, grep-kommandoer til verifikation, fix-mønstre for violations |
| `security-by-design.md` | AiSalesCoach threat model (adversarial audio, Deepgram key, customer_state), OWASP Top 10, GDPR, prompt injection defense |
| `code-standards.md` | 80% testdækning, Result\<T\>, async-regler, navngivningstabel, performance-targets |
| `honesty.md` | Read-token krav, ærlighed og pålidelighed for alle agenter |
| `lessons-learned.md` | Akkumuleret viden — opdateres automatisk af retro-workflow efter hver feature |

---

### Produktviden — analyserede POC-projekter

Alle tre reference-projekter er gennemgået og indsigterne er dokumenteret i `product-context.md`:

| POC | Sti | Vigtigste indsigt |
|-----|-----|--------------------|
| Web app | `/Dev/Closer.ai - lovable copy` | Sider, datamodel, framework-system, AI-flows, Supabase-skema |
| Desktop overlay | `/Dev/Avalonia-testProject/SalesCoachDemo` | Dual-stream STT, 20s chunk coaching, overlay-UI, NAudio/ScreenCaptureKit |
| Browser extension | `/Dev/Closer.ai-extension` | MV3 side panel, offscreen documents, WebM Opus, dual-stream i browser |

**Nøglemønstre implementeret i POC og skal genanvendes:**
- Dual-stream Deepgram (2 separate connections: mic=sælger + system=deltager — ikke diarization)
- 20-sekunders coaching chunks med `customer_state` for kontekst-persistens
- Framework-system: bruger-definerede regler + analysis blueprint + 6 coverage-dimensioner
- Kortlivede Deepgram-tokens genereret server-side (aldrig i klient)

---

## Kendte workflows

### Ny feature (start her)
```
1. product-manager  — brainstorm + user story + prioritering
2. ui-designer      — wireframes + designspec
3. tech-lead        — teknisk dekomponering + koordinering af alle agenter
```

### Build en feature
```
tech-lead orkestrerer:
  planner → clean-arch-guardian → efcore-guide (parallel)
  dotnet-developer (lag for lag: Domain → Application → Infrastructure → Api)
  desktop-developer + react-developer + extension-developer (parallel)
  csharp-reviewer + security-reviewer + tdd-guide (parallel review)
```

### Review alt kode
```
parallel: csharp-reviewer + clean-arch-guardian + security-reviewer
        + avalonia-reviewer (Desktop) + react-reviewer + typescript-reviewer (Web/Extension)
        + ai-safety-specialist (hvis AI-features berøres)
```

---

## Fixes og forbedringer

### 2026-06-04 — Initial opsætning
1. ✅ `.gitignore` sikkerhedsbug — `!appsettings.Development.json` fjernet (ville have committet secrets)
2. ✅ `.claude/settings.local.json` oprettet — 25 pre-godkendte kommandoer (dotnet, git, find, npm, npx)
3. ✅ CLAUDE.md syntaksfejl fixet
4. ✅ React-version harmoniseret til 19

### 2026-06-09 — "Software-fabrik" upgrade
5. ✅ **Read-token enforcement** — alle 29 agent-prompts starter med obligatorisk fillæsning + `PostToolUse` hook der advarer ved manglende token
6. ✅ **Pre-commit hook** — `pre-commit-check.py` blokerer `git commit` ved Clean Architecture violations
7. ✅ **3 nye rule-filer** — `clean-architecture.md`, `security-by-design.md`, `code-standards.md` (auto-loades af alle agenter)
8. ✅ **CLAUDE.md** — tilføjet DDD, SignalR, Quality Gates-tabel, AI Ethics-sektion
9. ✅ **feature-build.js** — unit test-fase (Phase 3b) + integration test-fase (Phase 5b, WebApplicationFactory + Testcontainers) + automatisk retro
10. ✅ **planner Output Contract** — præcist handoff-format til downstream agenter
11. ✅ **typescript-reviewer + react-reviewer** — AiSalesCoach-specifikke mønstre tilføjet

### 2026-06-09 — Arkitektur upgrade
12. ✅ **Minimal API** — controllers fjernet, endpoint-mønster med `RouteGroupBuilder` indført i `code-standards.md`
13. ✅ **Aspire AppHost** — `src/AiSalesCoach.AppHost/` + `src/AiSalesCoach.ServiceDefaults/` oprettet og tilføjet til solution
14. ✅ **NSubstitute** — tilføjet til Domain.Tests og Application.Tests; `Microsoft.EntityFrameworkCore.InMemory` tilføjet til Application.Tests
15. ✅ **Program.cs** — migreret til minimal API, `public partial class Program {}` tilføjet for WebApplicationFactory

**Claude Code opsætning er på konsulenthus-niveau.**

---

## Næste prioriterede skridt

### Infrastruktur (gøres én gang)
1. **Web-klient setup** — Vite + React 19 + TypeScript + Tailwind + shadcn/ui i `src/clients/AiSalesCoach.Web/`
2. **Extension setup** — Vite + React + MV3 i `src/clients/AiSalesCoach.Extension/`

### Første feature: Auth
4. **Domain-entiteter** — `User`, `Organization`, `RefreshToken`
5. **Infrastructure** — `AiSalesCoachDbContext` + EF Core config + første migration
6. **Auth-flow** — JWT login + refresh tokens i Api + LoginViewModel i Desktop

### Anden feature: Live session
7. **Session-domæne** — `Session`, `TranscriptLine`, `Hint`, `SessionConsent`
8. **Dual-stream audio** — port fra Desktop POC (NAudio + ScreenCaptureKit)
9. **Coaching chunk endpoint** — `POST /api/coaching/hints` med `customer_state`
10. **SignalR hub** — real-time hint-levering til Desktop og Extension

### Tredje feature: Framework & analyse
11. **Framework-domæne** — `Framework`, `FrameworkRule`, `AnalysisBlueprint`
12. **Post-call analyse** — asynkron job, scoring mod framework
13. **Web dashboard** — Sessions, Analysis, Framework Library sider

---

## Arkitekturdiagram

```
┌─────────────────┐   ┌──────────────────┐   ┌──────────────────────┐
│  Desktop Overlay │   │  Browser Extension│   │    Web Dashboard     │
│  (Avalonia 12)   │   │  (Chrome MV3)     │   │  (React 19 + Vite)   │
│                  │   │                   │   │                      │
│ NAudio/SCKit     │   │ getUserMedia      │   │ Session review       │
│ Dual-stream WS   │   │ getDisplayMedia   │   │ Framework builder    │
│ SignalR hints    │   │ Offscreen doc     │   │ Analytics dashboard  │
└────────┬─────────┘   └────────┬──────────┘   └──────────┬───────────┘
         │                      │                          │
         └──────────────────────┴──────────────────────────┘
                                │ JWT Bearer
                    ┌───────────▼────────────┐
                    │   AiSalesCoach.Api      │
                    │   (ASP.NET Core 10)     │
                    │                         │
                    │  /api/auth              │
                    │  /api/sessions          │
                    │  /api/coaching/hints    │
                    │  /api/analyses          │
                    │  /api/frameworks        │
                    │  /hubs/coaching (SignalR)│
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼──────────────────┐
              │                 │                  │
   ┌──────────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
   │   Application    │  │Infrastructure│  │   Deepgram   │
   │   (MediatR)      │  │(EF Core/PG)  │  │   Nova-2     │
   └──────────────────┘  └──────────────┘  └──────────────┘
```
