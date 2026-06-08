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
| API | ASP.NET Core 10, JWT Bearer, Swagger |
| ORM | EF Core 10 + Npgsql (PostgreSQL) |
| CQRS | MediatR 14 |
| Validering | FluentValidation 12 |
| Web | React 19, TypeScript, Vite, shadcn/ui, Tailwind |
| Lyd | NAudio (Windows WASAPI), ScreenCaptureKit (macOS — stub) |
| Transskription | Deepgram Nova-2 via WebSocket |

## Afhængighedsregler

```
Domain ← Application ← Infrastructure ← Api
Domain ← Contracts ←────────────────── Desktop
```

**Domain er aldrig afhængig af Infrastructure, Api, Desktop eller Web.**

## Byg og test

```bash
# Byg hele solutionen
dotnet build AiSalesCoach.sln

# Kør alle tests
dotnet test AiSalesCoach.sln

# Kør API lokalt
dotnet run --project src/api/AiSalesCoach.Api

# Kør Desktop lokalt
dotnet run --project src/clients/AiSalesCoach.Desktop

# Kør Web lokalt
cd src/clients/AiSalesCoach.Web && npm run dev

# EF Core migrations (kør fra Infrastructure-projektet)
dotnet ef migrations add <Navn> --project src/infrastructure/AiSalesCoach.Infrastructure --startup-project src/api/AiSalesCoach.Api
dotnet ef database update --project src/infrastructure/AiSalesCoach.Infrastructure --startup-project src/api/AiSalesCoach.Api
```

## Kodestandarder

- **C#**: records til DTOs og value objects, `Result<T>` til fejlhåndtering, ingen exceptions til flow control
- **Navngivning**: PascalCase klasser/properties, camelCase lokale variabler, `I`-prefix på interfaces
- **MediatR**: én `IRequest`/`IRequestHandler` pr. use case i `Application/UseCases/<Feature>/`
- **Controllers**: thin — modtager request, sender til MediatR, returnerer response. Ingen forretningslogik.
- **EF Core**: ingen lazy loading, eksplicitte includes, migrations versionstyres i kode
- **Secrets**: aldrig i kode — brug `appsettings.Development.json` (gitignored) eller environment variables
- **TypeScript (Web)**: strict mode, ingen `any`, React Query til alle API-kald

## Sikkerhed (VIGTIGT)

- JWT access tokens: max 15 min levetid
- Refresh tokens: max 7 dage, roteres ved brug
- Deepgram API-nøgle: **aldrig i Desktop eller Web** — kun kortlivede tokens fra Api
- CORS: whitelist kun kendte origins i produktion
- Alle endpoints kræver auth undtagen `/auth/login` og `/auth/refresh`

## Reference-projekter (POC — læs kun)

- Desktop POC: `/Users/youssef.badran/Dev/Avalonia-testProject/SalesCoachDemo/`
- Web POC: `/Users/youssef.badran/Dev/Closer.ai - lovable copy/`
- Tidligere backend-scaffold: `/Users/youssef.badran/Dev/SalesCoachAI/`
