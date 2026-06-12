# AiSalesCoach — CLAUDE.md

## Produkt
AI-drevet real-time salgscoaching overlay til desktop (Avalonia) + web-platform (React) til analyse og administration. Backend: ASP.NET Core + PostgreSQL.

## Solution-struktur

```
src/core/AiSalesCoach.Domain/          — entiteter, interfaces, value objects (ingen NuGet-deps)
src/core/AiSalesCoach.Application/     — MediatR use cases, FluentValidation
src/core/AiSalesCoach.Contracts/       — DTOs (records) delt på tværs af alle klienter
src/infrastructure/AiSalesCoach.Infrastructure/ — EF Core, Postgres, JWT, Deepgram
src/api/AiSalesCoach.Api/              — ASP.NET Core Web API controllers
src/clients/AiSalesCoach.Desktop/      — Avalonia 12 overlay-app
src/clients/AiSalesCoach.Web/          — React + TypeScript + Vite web-app
tests/                                 — xUnit tests (Domain, Application, Api)
docs/architecture.md                   — fuld arkitekturguide
```

## Stack

| Lag | Teknologi |
|-----|-----------|
| Runtime | .NET 10.0, C# 13 |
| Desktop | Avalonia 12.0.3, CommunityToolkit.Mvvm 8.x |
| API | ASP.NET Core 10, minimal API (route groups), JWT Bearer, Swagger |
| ORM | EF Core 10 + Npgsql (PostgreSQL) |
| CQRS | MediatR 14 |
| Validering | FluentValidation 12 |
| Real-time | SignalR (hint delivery API → Desktop/Extension) |
| Aspire | .NET Aspire 9 — AppHost (lokal orchestration) + ServiceDefaults (OTel + health checks) |
| Web | React 19, TypeScript, Vite, shadcn/ui, Tailwind |
| Lyd | NAudio (Windows WASAPI), ScreenCaptureKit (macOS — stub) |
| Transskription | Deepgram Nova-2 via WebSocket |
| Mocking | NSubstitute 5.x (unit tests) |

## Arkitekturprincipper

### Clean Architecture (Uncle Bob)

```
Domain ← Application ← Infrastructure ← Api
Domain ← Contracts ←────────────────── Desktop
```

**Domain er aldrig afhængig af Infrastructure, Api, Desktop eller Web.**

Se `.claude/rules/clean-architecture.md` for præcise lag-grænser og grep-kommandoer.

### Domain-Driven Design (DDD)

- **Ubiquitous Language**: Brug domænetermer konsekvent — `Session`, `Hint`, `FrameworkRule`, `TranscriptChunk`. Ikke `Record`, `Item`, `Entry`.
- **Aggregates**: `Session` er aggregate root for `TranscriptLines`, `Hints`, `HintFeedback`. Opdatér kun via aggregate root.
- **Value Objects**: Immutable typer uden identitet — `SessionStatus`, `HintType`, `CoverageScore`. Implementér som records.
- **Domain Events**: Signifikante forretningshændelser — `HintGeneratedEvent`, `SessionEndedEvent`. Publicér via MediatR notifications.
- **Repository Pattern**: Interfaces i Domain (`ISessionRepository`). Implementering i Infrastructure. Application afhænger kun af interfacet.
- **Bounded Contexts**: Real-time coaching (Sessions, Hints) er adskilt fra post-call analyse (MeetingFiles, Analysis).

## Byg og test

```bash
# Byg hele solutionen
dotnet build AiSalesCoach.sln

# Kør alle tests
dotnet test AiSalesCoach.sln

# Kør via Aspire (anbefalet — starter API + PostgreSQL automatisk)
dotnet run --project src/AiSalesCoach.AppHost

# Kør API direkte (uden Aspire)
dotnet run --project src/api/AiSalesCoach.Api

# Kør Desktop lokalt
dotnet run --project src/clients/AiSalesCoach.Desktop

# Kør Web lokalt
cd src/clients/AiSalesCoach.Web && npm run dev

# EF Core migrations (kør fra repo-rod)
dotnet ef migrations add <Navn> --project src/infrastructure/AiSalesCoach.Infrastructure --startup-project src/api/AiSalesCoach.Api
dotnet ef database update --project src/infrastructure/AiSalesCoach.Infrastructure --startup-project src/api/AiSalesCoach.Api
```

## Quality Gates — hvad der blokerer en feature

En feature er **ikke done** uden at alle gates er grønne:

| Gate | Krav | Agent |
|------|------|-------|
| Build | `dotnet build AiSalesCoach.sln` — ingen fejl, ingen warnings | `dotnet-build-resolver` |
| Tests | `dotnet test` — alle grønne, ≥80% unit test dækning (Application), integration test per API endpoint | `tdd-guide` |
| Arkitektur | Ingen layer violations | `clean-arch-guardian` |
| Sikkerhed | Ingen CRITICAL/HIGH findings | `security-reviewer` |
| Code Review | Ingen CRITICAL/HIGH findings | `csharp-reviewer` / `avalonia-reviewer` / `react-reviewer` |
| Dokumentation | `docs/api-contracts.md` opdateret med nye endpoints | `tech-lead` |

## Kodestandarder

- **C#**: records til DTOs og value objects, `Result<T>` til fejlhåndtering, ingen exceptions til flow control
- **Navngivning**: PascalCase klasser/properties, camelCase lokale variabler, `I`-prefix på interfaces
- **MediatR**: én `IRequest`/`IRequestHandler` pr. use case i `Application/UseCases/<Feature>/`
- **Controllers**: thin — modtager request, sender til MediatR, returnerer response. Ingen forretningslogik.
- **EF Core**: ingen lazy loading, eksplicitte includes, migrations versionstyres i kode
- **Secrets**: aldrig i kode — brug `appsettings.Development.json` (gitignored) eller environment variables
- **TypeScript (Web)**: strict mode, ingen `any`, React Query til alle API-kald

Se `.claude/rules/code-standards.md` for testdækning, async-regler og navngivningstabel.

## Sikkerhed

- JWT access tokens: max 15 min levetid
- Refresh tokens: max 7 dage, roteres ved brug
- Deepgram API-nøgle: **aldrig i Desktop eller Web** — kun kortlivede tokens fra Api
- CORS: whitelist kun kendte origins i produktion
- Alle endpoints kræver auth undtagen `/auth/login` og `/auth/refresh`

Se `.claude/rules/security-by-design.md` for OWASP checklist og AiSalesCoach threat model.

## AI Ethics & Ansvarlig brug

- **Samtykke**: Optagelse starter ALDRIG uden eksplicit brugersamtykke. Consent UI er ikke optionel.
- **Transparens**: Mødedeltagere skal informeres om at AI analyserer opkaldet.
- **Hallucination**: Forkerte coaching hints skader salgsudfald direkte. Brug confidence thresholds (>0.75). Se `ai-safety-specialist`.
- **Prompt injection**: Audio-input fra prospects er en angrebsvektor. Transcript-tekst må aldrig flettes ind i system-prompt-blokken.
- **Data minimering**: Gem kun hvad der er nødvendigt. Voice data er biometrisk data (GDPR Art. 9) — slettes efter 90 dage som default.
- **Bias**: Framework-scoring skal evalueres for demografisk bias inden produktionslancering.

## Reference-projekter (POC — læs kun)

- Desktop POC: `/Users/youssef.badran/Dev/Avalonia-testProject/SalesCoachDemo/`
- Web POC: `/Users/youssef.badran/Dev/Closer.ai - lovable copy/`
- Tidligere backend-scaffold: `/Users/youssef.badran/Dev/SalesCoachAI/`
