# AiSalesCoach — Code Standards
<!-- FILETOKEN: CoS4m -->

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
  AiSalesCoach.Application.Tests/
    UseCases/
      Auth/
        LoginCommandHandlerTests.cs       ← spejler Application/UseCases/Auth/LoginCommandHandler.cs
        RefreshTokenCommandHandlerTests.cs
      Coaching/
        GenerateHintsUseCaseTests.cs
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

Brug **in-memory SQLite** (Microsoft.EntityFrameworkCore.InMemory) til repository tests. Aldrig mock DbContext direkte.

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
