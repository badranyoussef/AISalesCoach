# AiSalesCoach — Clean Architecture (Hard Rule)
<!-- FILETOKEN: CaR7x -->

Disse regler er absolutte. Violations blokerer commit og implementation.

## Dependency graph

```
Domain ← Application ← Infrastructure ← Api
Domain ← Contracts ←──────────────────── Desktop
Web: HTTP-only client — ingen .NET projektreference overhovedet
```

## Forbudte afhængigheder

| Projekt | Må ALDRIG importere |
|---------|-------------------|
| `AiSalesCoach.Domain` | Application, Contracts, Infrastructure, Api, Desktop — eller NuGet udover .NET BCL |
| `AiSalesCoach.Contracts` | Domain, Application, Infrastructure, Api, Desktop |
| `AiSalesCoach.Application` | Infrastructure, Api, EF Core, HttpContext, IWebHostEnvironment |
| `AiSalesCoach.Desktop` | Application, Infrastructure, Api |
| `AiSalesCoach.Web` | Ethvert .NET-projekt (HTTP-only) |

## Verifikation — kør disse inden commit

```bash
# Domain importerer upper layers?
grep -r "using AiSalesCoach\.\(Application\|Infrastructure\|Api\)" \
  src/core/AiSalesCoach.Domain/ --include="*.cs"

# Application importerer Infrastructure/Api?
grep -r "using AiSalesCoach\.\(Infrastructure\|Api\)" \
  src/core/AiSalesCoach.Application/ --include="*.cs"

# Desktop importerer backend-lag?
grep -r "using AiSalesCoach\.\(Application\|Infrastructure\|Api\)" \
  src/clients/AiSalesCoach.Desktop/ --include="*.cs"

# EF Core bruges uden for Infrastructure?
grep -r "DbContext\|DbSet\|EntityFramework\|Npgsql" \
  src/core/ src/api/ src/clients/ --include="*.cs"

# Domain har NuGet-deps?
grep "PackageReference" \
  src/core/AiSalesCoach.Domain/AiSalesCoach.Domain.csproj
```

Alle disse skal returnere tom output. Gør de ikke det → stop implementering og ret violations FØRST.

## Sådan løser du violations

**Scenario**: Application-kode har brug for databaseadgang.
**Forkert**: `using AiSalesCoach.Infrastructure;` i Application.
**Rigtigt**: Definer `ISessionRepository` i Domain. Application bruger interfacet. Infrastructure implementerer.

**Scenario**: Desktop har brug for en service der er implementeret i Infrastructure.
**Forkert**: `new UserRepository(...)` i Desktop ViewModel.
**Rigtigt**: Definer interface i Domain, registrér implementation i Infrastructure DI, injicér interface i ViewModel.

**Scenario**: Domain-entitet har brug for validering.
**Forkert**: `using FluentValidation;` i Domain entity.
**Rigtigt**: Valideringslogik hører i Application-laget som FluentValidation `IValidator<Command>`.

## DDD i AiSalesCoach-kontekst

- `Domain` = domænemodel: `Session`, `Hint`, `FrameworkRule`, `TranscriptChunk`, `User`, `Organization`
- `Application` = use cases: `StartSessionCommand`, `GenerateHintsUseCase`, `CreateFrameworkCommand`
- `Infrastructure` = ekstern verden: PostgreSQL via EF Core, Deepgram WebSocket, JWT generering
- `Api` = HTTP-adapter: ASP.NET Core controllers der kun kalder `_mediator.Send()`

Krydser du en grænse: indfør et interface i Domain, implementér i Infrastructure.
