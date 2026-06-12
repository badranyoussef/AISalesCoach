# AiSalesCoach — Security by Design

Sikkerhedsregler gælder for ALT kode. Ingen undtagelser.

## AiSalesCoach threat model — produktspecifikt

Dette produkt har angrebsvektorer som de fleste webapps ikke har:

| Trussel | Beskrivelse | Mitigering |
|---------|-------------|-----------|
| **Adversarial audio** | Prospect siger "Ignore previous instructions" højt → transskriberes → sendes til LLM | Transcript-tekst MÅ ALDRIG indsættes i system-prompt-blokken |
| **Deepgram key leak** | API-nøglen eksponeres i Desktop/Extension | Kun kortlivede tokens (≤60s) genereres server-side |
| **customer_state injection** | AI returnerer JSON med injicerede instruktioner | Valider som untrusted: max 8KB, max 3 nesting-niveauer, ingen HTML/script |
| **SignalR group bypass** | Klient tilslutter sig en anden brugers session-gruppe | Verificér `session.UserId == currentUserId` inden `AddToGroupAsync` |
| **Biometrisk data** | Stemmedata er biometrisk under GDPR Art. 9 | Kræver eksplicit samtykke, 90 dages default retention |

## OWASP Top 10 — tjek altid

- **A01 Broken Access Control**: `[Authorize]` på alle endpoints. SignalR hubs verificerer ejerskab.
- **A02 Crypto Failures**: JWT secrets fra env vars. Refresh tokens som SHA-256 hash. BCrypt work factor ≥ 12.
- **A03 Injection**: EF Core parameterized queries. Aldrig string-concateneret SQL. Transcript-tekst i separate prompt-variable.
- **A05 Misconfiguration**: Ingen `app.UseDeveloperExceptionPage()` i production. CORS whitelist-only.
- **A07 Auth Failures**: JWT max 15min. Refresh max 7 dage. Roteres ved brug. Revokeres ved logout.
- **A09 Logging Failures**: Log ALDRIG JWTs, passwords, API-nøgler, eller rå audio-data.

## Secrets — absolutte regler

```
FORBIDDEN i src/**/*.cs og src/**/*.ts:
- Hardkodede connection strings
- JWT secrets som strenge
- Deepgram API nøgler (format: sk_... eller dg_...)
- Passwords som klartekst
```

Brug altid:
- `appsettings.Development.json` (gitignored) lokalt
- Environment variables i CI/CD og production
- GitHub Actions Secrets (aldrig i workflow YAML-filer som klartekst)

## GDPR for audio og persondata

- **Samtykke UI**: Vises INDEN optagelse starter. Eksplicit, specifik, kan afvises. Ikke bundtet med andre betingelser.
- **Optagelsesindikator**: Synlig rød dot/label under hele sessionen.
- **Data retention**: Default 90 dage → automatisk sletning. Brugere kan anmode om sletning (right to erasure).
- **Right to erasure**: `DELETE FROM sessions WHERE user_id = @id` cascade til alle child-tabeller inkl. transcript_lines, hints, hint_feedback.
- **Databehandleraftale**: Kræves med Deepgram som databehandler.
- **Biometrisk data (Art. 9)**: Eksplicit samtykke kræves — ikke "legitimate interest". Separate samtykkeformularer.

## Prompt injection defense

```csharp
// FORKERT — transcript blandes ind i system prompt
var systemPrompt = $"""
You are a sales coach. Here is the transcript: {transcriptText}
""";

// RIGTIGT — transcript er i separat user-besked
var messages = new[]
{
    new { role = "system", content = systemPromptWithoutTranscript },
    new { role = "user",   content = $"Transcript:\n{transcriptText}\n\nCustomer state:\n{customerStateJson}" }
};
```

Transcript-tekst og customer_state går ALTID i `user`-rollen — aldrig i `system`-blokken.

## customer_state validering

```csharp
// Valider AI-genereret JSON inden persistens
public static Result<JsonDocument> ValidateCustomerState(string json)
{
    if (json.Length > 8192) return Result.Failure("customer_state exceeds 8KB limit.");
    var doc = JsonDocument.Parse(json);
    if (GetMaxNestingDepth(doc.RootElement) > 3) return Result.Failure("Nesting depth exceeds 3.");
    if (ContainsScriptOrHtml(json)) return Result.Failure("customer_state contains forbidden content.");
    return Result.Success(doc);
}
```
