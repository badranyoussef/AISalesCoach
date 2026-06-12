# AiSalesCoach — Code Standards

## Test coverage — ikke optionel

Minimum **80% unit test dækning** på Application-laget for hver feature.

```bash
# Mål dækning
dotnet test --collect:"XPlat Code Coverage" --results-directory ./coverage

# Generer rapport
dotnet tool install --global dotnet-reportgenerator-globaltool
reportgenerator -reports:./coverage/**/coverage.cobertura.xml -targetdir:./coverage/html
```

En feature er **ikke done** uden tests. `tdd-guide` skal altid involveres.

## Teststruktur

```
tests/
  AiSalesCoach.Domain.Tests/
  AiSalesCoach.Application.Tests/           ← unit tests (mock repos, in-memory SQLite)
    UseCases/
      Auth/
        LoginCommandHandlerTests.cs
        RefreshTokenCommandHandlerTests.cs
      Coaching/
        GenerateHintsUseCaseTests.cs
  AiSalesCoach.Api.Tests/                   ← integration tests (real HTTP + real DB)
    Infrastructure/
      AiSalesCoachWebApplicationFactory.cs  ← WebApplicationFactory<Program> + Testcontainers
    Endpoints/
      Auth/
        LoginEndpointTests.cs
      Sessions/
        CreateSessionEndpointTests.cs
```

Navngivning: `MethodName_Scenario_ExpectedResult`
```csharp
[Fact]
public async Task Handle_ValidCredentials_ReturnsAccessToken() { }

[Fact]
public async Task Handle_InvalidPassword_ReturnsFailure() { }

[Fact]
public async Task Handle_NonExistentUser_ReturnsFailure() { }
```

Brug **in-memory SQLite** (Microsoft.EntityFrameworkCore.InMemory) til Application-laget unit tests. Aldrig mock DbContext direkte.

## Integration tests — per API endpoint

Hvert API-endpoint **skal** have integration tests i `tests/AiSalesCoach.Api.Tests/`.

**Stack:**
- `Microsoft.AspNetCore.Mvc.Testing` — `WebApplicationFactory<Program>` som HTTP-testhost
- `Testcontainers.PostgreSql` — PostgreSQL i Docker-container under testkørsel
- xUnit med `IAsyncLifetime` til container-lifecycle

**Krav per endpoint** (minimum to tests):
- Happy path (200/201 med forventet response)
- Primær fejlcase (401 Unauthorized, 400 Bad Request, eller 404 Not Found)

**Mønster:**
```csharp
public class LoginEndpointTests : IClassFixture<AiSalesCoachWebApplicationFactory>
{
    private readonly HttpClient _client;

    public LoginEndpointTests(AiSalesCoachWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Login_ValidCredentials_Returns200WithTokens() { }

    [Fact]
    public async Task Login_InvalidPassword_Returns401() { }
}
```

**Forudsætning:** Testcontainers kræver Docker — kørende lokalt og i CI/CD.

## Result<T> — ingen exceptions til flow control

```csharp
// RIGTIGT
public async Task<Result<LoginResponse>> Handle(LoginCommand cmd, CancellationToken ct)
{
    var user = await _repo.FindByEmailAsync(cmd.Email, ct);
    if (user is null) return Result.Failure<LoginResponse>("Invalid credentials.");
    if (!BCrypt.Verify(cmd.Password, user.PasswordHash))
        return Result.Failure<LoginResponse>("Invalid credentials.");
    return Result.Success(new LoginResponse(accessToken, refreshToken));
}

// FORKERT — exception som flow control
if (user is null) throw new NotFoundException("User not found."); // ← forbudt
```

Exceptions er til uventede runtime-fejl — ikke til forretningslogik.

## Async-regler

| Regel | Eksempel |
|-------|---------|
| Alle public async metoder accepterer `CancellationToken ct` | `Task<Result<T>> Handle(..., CancellationToken ct)` |
| Aldrig `async void` undtagen event handlers | `private async Task DoWorkAsync(CancellationToken ct)` |
| Aldrig `.Result` eller `.Wait()` | Altid `await` |
| `ConfigureAwait(false)` i Infrastructure og Application | Library-kode, ikke Api/Desktop |
| Parallel uafhængige operationer | `await Task.WhenAll(task1, task2)` |

## Navngivning

| Element | Konvention | Eksempel |
|---------|-----------|---------|
| Use case command | `*Command` + `*CommandHandler` | `LoginCommand`, `LoginCommandHandler` |
| Use case query | `*Query` + `*QueryHandler` | `GetSessionQuery`, `GetSessionQueryHandler` |
| Domain entity | PascalCase substantiv | `Session`, `Hint`, `FrameworkRule` |
| Interface | `I`-prefix | `ISessionRepository`, `IDeepgramTokenService` |
| DTO (Contracts) | `*Request`/`*Response` | `CreateSessionRequest`, `HintResponse` |
| EF entity config | `*Configuration` | `SessionConfiguration : IEntityTypeConfiguration<Session>` |
| React komponent | PascalCase | `HintCard`, `FrameworkCoverageBar`, `LiveSession` |
| React hook | `use`-prefix | `useSession`, `useHints`, `useApiClient` |
| Zustand store | `use*Store` | `useSessionStore`, `useFrameworkStore` |

## Minimal API — endpoint pattern

Endpoints er **statiske extension methods på `RouteGroupBuilder`**, én fil per feature:

```csharp
// src/api/AiSalesCoach.Api/Endpoints/Auth/AuthEndpoints.cs
public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/login", async (LoginRequest req, ISender mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new LoginCommand(req.Email, req.Password), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.Unauthorized();
        })
        .WithName("Login")
        .AllowAnonymous();

        return group;
    }
}

// src/api/AiSalesCoach.Api/Program.cs — registrering
app.MapGroup("/api/auth").MapAuthEndpoints();
app.MapGroup("/api/sessions").RequireAuthorization().MapSessionEndpoints();
```

**Regler:**
- Ingen controllers — nogensinde
- Hvert endpoint-kald: kun `mediator.Send()` + `Results.*` returnværdi. Ingen forretningslogik.
- `[Authorize]` → `RequireAuthorization()` på `MapGroup` — ikke per endpoint medmindre undtagelse
- `AllowAnonymous()` kun på `/auth/login` og `/auth/refresh`
- Endpoint-filer: `src/api/AiSalesCoach.Api/Endpoints/<Feature>/<Feature>Endpoints.cs`

## C# records til DTOs

```csharp
// RIGTIGT — Contracts bruger records
public record LoginRequest(string Email, string Password);
public record LoginResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt);

// FORKERT — mutable klasser i Contracts
public class LoginRequest { public string Email { get; set; } } // ← forbudt
```

## Performance targets (real-time audio pipeline)

| Målpunkt | Budget |
|----------|--------|
| Audio → hint (end-to-end) | < 500ms |
| API response (non-AI endpoints) | < 100ms p99 |
| Deepgram token generation | < 200ms |
| SignalR hint push (API → Desktop) | < 50ms |

Alt på audio→hint-stien: involvér `performance-engineer` inden implementering.

## TypeScript / React Web

- **Strict mode**: `"strict": true` i tsconfig.json. Ingen `any` undtagen `catch (e: unknown)`.
- **React Query**: Alle API-kald via `useQuery`/`useMutation` — aldrig `fetch`/`axios` direkte i komponenter.
- **Zustand**: Global state via stores. Ingen prop-drilling dybere end 2 niveauer.
- **shadcn/ui**: Brug eksisterende komponenter. Tilføj ikke nye UI-libraries uden godkendelse.
- **Ingen index som key**: `key={item.id}` — aldrig `key={index}`.
