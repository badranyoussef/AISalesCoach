# AiSalesCoach — Arkitektur

## Produkt
AI-drevet real-time salgscoaching overlay til desktop + web-platform til analyse og administration.

## Monorepo-struktur

```
AiSalesCoach/
├── AiSalesCoach.sln                          .NET solution
├── src/
│   ├── core/
│   │   ├── AiSalesCoach.Domain/              Entiteter, value objects, domæne-interfaces
│   │   ├── AiSalesCoach.Application/         Use cases (MediatR), validering (FluentValidation)
│   │   └── AiSalesCoach.Contracts/           DTOs delt på tværs af alle klienter
│   ├── infrastructure/
│   │   └── AiSalesCoach.Infrastructure/      EF Core + Postgres, eksterne APIs, JWT
│   ├── api/
│   │   └── AiSalesCoach.Api/                 ASP.NET Core Web API (controllers)
│   └── clients/
│       ├── AiSalesCoach.Desktop/             Avalonia 12 overlay-app (Windows + macOS)
│       └── AiSalesCoach.Web/                 React + TypeScript + Vite web-app
├── tests/
│   ├── AiSalesCoach.Domain.Tests/
│   ├── AiSalesCoach.Application.Tests/
│   └── AiSalesCoach.Api.Tests/
└── docs/
```

## Afhængighedsregler (Clean Architecture)

Afhængigheder peger altid **indad** — aldrig udad.

```
Domain          ←── Application ←── Infrastructure ←── Api
   ↑
Contracts ←──────────────────────────────── Desktop + Web
```

| Projekt | Må referere til |
|---------|-----------------|
| Domain | Ingenting |
| Contracts | Ingenting |
| Application | Domain, Contracts |
| Infrastructure | Application (→ Domain transitiv) |
| Api | Infrastructure, Contracts |
| Desktop | Contracts, Domain |
| Web | Contracts (via API HTTP-kald) |

**Domain må ALDRIG referere til Infrastructure, Api, Desktop eller Web.**

## Lags ansvar

### Domain
- Rene C# records/classes — ingen NuGet-afhængigheder
- Entiteter med forretningsregler og invarianter
- Interfaces som Infrastructure implementerer
- Value objects og domæne-exceptions
- `Result<T>` pattern til fejlhåndtering

### Application
- Use cases (én klasse pr. use case via MediatR IRequest/IRequestHandler)
- Orkestrerer Domain-objekter, kalder Domain-interfaces
- FluentValidation validators pr. command/query
- Kender ikke til HTTP, database eller UI

### Contracts
- Kun records (DTOs) — ingen logik
- Definerer API-kontrakten mellem alle klienter og API
- Breaking change her fejler alle klienter ved compile-time

### Infrastructure
- Implementerer Domain-interfaces
- EF Core DbContext + Npgsql Postgres-opsætning
- JWT-token generering og validering
- Deepgram WebSocket-integration
- Platform-specifik kode (Windows/macOS lyd + screen capture hiding)
- `DependencyInjection.cs` — registrerer alle services

### Api
- ASP.NET Core controllers — thin layer
- Validerer requests (via Contracts DTOs + FluentValidation)
- Kalder Application use cases via MediatR Send
- Returnerer Contracts DTOs som response
- JWT Bearer authentication
- Swagger/OpenAPI dokumentation

### Desktop (Avalonia)
- MVVM med CommunityToolkit.Mvvm (source generators, ingen Fody)
- ViewModels modtager services via constructor injection
- `Platform/` — screen capture hiding (Windows + macOS)
- `Services/` — audio capture, HTTP client mod Api
- Kender kun til Contracts og Domain — ikke Infrastructure

### Web (React + TypeScript)
- Vite build toolchain
- shadcn/ui + Tailwind CSS komponentbibliotek
- React Query til server state
- Zustand til client state
- Alle API-kald går igennem `services/api.ts`

## Nøgleprincipper

1. **Ingen hemmeligheder i kode** — JWT secrets, DB-connection strings, API-nøgler i environment variables
2. **Deepgram-tokens** genereres altid server-side (Api) og sendes kortlivede til Desktop — aldrig gemt i klienten
3. **Kortlivede JWT** + refresh tokens — access token ≤15 min, refresh token ≤7 dage
4. **EF Core migrations** versionstyres i Infrastructure — `dotnet ef migrations add` fra Infrastructure-projektet
5. **Contracts-ændringer** er breaking — brug semantic versioning på API-endpoints
