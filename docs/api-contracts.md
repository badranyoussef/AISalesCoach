# AiSalesCoach — API Contracts

Dette dokument vedligeholdes af `tech-lead` og opdateres automatisk når backend-features lander.
Det er den **eneste autoritative kilde** til hvilke endpoints der eksisterer og hvad de forventer.

Frontend-agenter (`react-developer`, `desktop-developer`, `extension-developer`) læser dette dokument
**inden** de implementerer API-kald. Byg ikke mod et endpoint der ikke er listet her.

---

## Status: Ingen endpoints implementeret endnu

Scaffoldet er på plads. Ingen domænelogik er bygget. Dette dokument udfyldes løbende.

---

## Format for nye endpoints

Når `dotnet-developer` færdiggør en feature, tilføjes den her:

```
## [Feature navn]

### POST /api/[resource]
**Request** (`AiSalesCoach.Contracts/[Mappe]/[Navn]Request.cs`):
```csharp
public record [Navn]Request([felt]: [type], ...);
```
**Response** (`AiSalesCoach.Contracts/[Mappe]/[Navn]Response.cs`):
```csharp
public record [Navn]Response([felt]: [type], ...);
```
**Auth**: Kræver JWT Bearer / Anonym
**Fejl**: 400 (validering), 401 (uautoriseret), 404 (ikke fundet)
```

---

## Planlagte endpoints (ikke implementeret)

### Auth
- `POST /api/auth/login` — email + password → JWT access token + refresh token
- `POST /api/auth/refresh` — refresh token → nyt access token
- `POST /api/auth/logout` — invalidér refresh token

### Sessions (live coaching)
- `POST /api/sessions` — start ny session
- `PUT /api/sessions/{id}/end` — afslut session
- `GET /api/sessions/{id}/token` — hent kortlivet Deepgram token
- `POST /api/coaching/hints` — 20-sekunders coaching chunk → hints + coverage
- WebSocket: `wss://api/sessions/{id}/audio` — audio upload

### Analyser
- `POST /api/analyses` — kør post-call analyse
- `GET /api/analyses/{id}` — hent analysresultat

### Frameworks
- `GET /api/frameworks` — list frameworks for projekt
- `POST /api/frameworks` — opret nyt framework
- `GET /api/frameworks/{id}/rules` — hent regler

### SignalR Hubs
- `/hubs/coaching` — real-time hint-levering til Desktop/Extension
