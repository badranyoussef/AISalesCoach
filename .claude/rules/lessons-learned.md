# AiSalesCoach — Lessons Learned

Dette dokument akkumulerer mønstre, konventioner og fejl opdaget under udviklingen.
Det opdateres automatisk via `/retro` kommandoen efter hver feature.
Alle agenter læser dette dokument automatisk.

---

## Hvordan dette dokument bruges

Hver agent der læser dette skal:
1. Tjekke om en relevant lektion gælder for den opgave der er igang
2. Undgå fejl der allerede er begået
3. Genbruge mønstre der har virket

**Pruning-regel**: Dette dokument auto-loades i ALLE agenter ved hvert kald — det skal holdes skarpt. Entries der er forældede eller modsagt af nyere beslutninger flyttes til `docs/lessons-archive.md` (slettes ikke). Retro-workflowet håndhæver dette ved hver kørsel.

---

## Format for nye entries

```
### [YYYY-MM-DD] [Feature/kontekst]
**Type**: Pattern / Fejl-der-skal-undgås / Konvention / Arkitektur-beslutning
**Berørte agenter**: dotnet-developer, efcore-guide, etc.
**Lektion**: Hvad vi lærte
**Hvorfor**: Hvorfor det er vigtigt
```

---

## Arkitektur-beslutninger

### [2026-06-09] Arkitektur: Minimal API, Aspire, NSubstitute
**Type**: Arkitektur-beslutning
**Berørte agenter**: dotnet-developer, desktop-developer, tdd-guide, devops-engineer, incident-engineer
**Lektion**: Tre beslutninger taget samlet:
1. **Minimal API** — INGEN controllers. Endpoints som statiske extension methods på `RouteGroupBuilder`. En fil per feature i `Endpoints/<Feature>/`. `RequireAuthorization()` på `MapGroup`.
2. **Aspire AppHost** — Kør via `dotnet run --project src/AiSalesCoach.AppHost` i stedet for direkte `dotnet run src/api/...`. PostgreSQL startes automatisk. Kræver `dotnet workload install aspire` første gang.
3. **NSubstitute** — Mockingframework i alle test-projekter. INGEN Moq.
**Hvorfor**: Minimal API er renere og hurtigere end controllers for dette use case. Aspire eliminerer manuel Docker-compose-opsætning for PostgreSQL. NSubstitute har bedre syntax end Moq.

### [2026-06-09] Aspire NU1902 warnings — acceptable
**Type**: Konvention
**Berørte agenter**: dotnet-build-resolver, devops-engineer
**Lektion**: `dotnet build AiSalesCoach.sln` producerer ~14 `NU1902` moderate vulnerability warnings fra Aspires transitive deps (KubernetesClient, OpenTelemetry.Api). Disse er IKKE vores kode og kan ikke fixes uden at vente på Aspire-opdatering. De er ikke CRITICAL/HIGH — de passerer quality gates.
**Hvorfor**: Undgå at bruge tid på warnings der ikke er actionable.

### [2026-06-09] Integration tests — semantisk krav, ikke 50/50
**Type**: Arkitektur-beslutning
**Berørte agenter**: tdd-guide, dotnet-developer, devops-engineer
**Lektion**: Integration tests kræves **per API endpoint** (ikke som numerisk procentkrav). Stack: `WebApplicationFactory<Program>` + `Testcontainers.PostgreSql`. Minimum 2 tests per endpoint: happy path + primær fejlcase.
**Hvorfor**: 50/50 split ville tvinge integration tests på ting der ikke behøver dem (Domain logic) og omvendt. Semantisk krav sikrer at alle rigtige endpoints er testet mod rigtig database — det er det der faktisk fanger prod-fejl.

### [2026-06-09] Integration test-projekt: AiSalesCoach.Api.Tests (ikke nyt projekt)
**Type**: Konvention
**Berørte agenter**: tdd-guide, dotnet-developer
**Lektion**: `AiSalesCoach.Api.Tests` er integration tests-projektet (ikke et separat `Integration.Tests`). Pakker: `Microsoft.AspNetCore.Mvc.Testing` + `Testcontainers.PostgreSql`. Base factory: `tests/AiSalesCoach.Api.Tests/Infrastructure/AiSalesCoachWebApplicationFactory.cs`.
**Hvorfor**: Projektet refererer allerede Api og er det naturlige hjem. Separate integration-projekt ville fragmentere teststrukturen unødvendigt.

### [2026-06-11] Workflow-scripts er den eneste orkestreringskilde (erstatter beslutning af 2026-06-06)
**Type**: Arkitektur-beslutning
**Berørte agenter**: tech-lead, alle
**Lektion**: ALLE orkestrerede flows bor i workflow-scripts: `feature-build.js`, `plan-feature.js`, `review.js`, `retro.js`. Markdown-kommandoer (`/feature`, `/plan`, `/review`, `/retro`) er TYNDE indgange der kalder workflowet — de duplikerer aldrig orkestreringslogik. Den oprindelige beslutning (2026-06-06: kun feature-build som script) blev de facto brudt da plan-feature.js og review.js blev tilføjet, hvilket gav to modstridende sandheder per flow.
**Hvorfor**: To implementeringer af samme flow drifter fra hinanden. Én kilde til orkestrering = én ting at vedligeholde og teste.

### [2026-06-11] Quality gates HÅNDHÆVES i feature-build — ikke kun dokumenteret
**Type**: Arkitektur-beslutning
**Berørte agenter**: tech-lead, dotnet-developer, tdd-guide, alle reviewers
**Lektion**: `feature-build.js` håndhæver gates strukturelt:
1. Hver implementeringsfase returnerer schema-valideret `{build_succeeded, errors}` — fejl udløser automatisk `dotnet-build-resolver` (én runde), derefter stopper workflowet med `status: 'failed'`.
2. Verifikations-fase genkører `dotnet build` + `dotnet test` på HELE solutionen uafhængigt inden review.
3. Reviewers returnerer strukturerede findings med severity (CRITICAL/HIGH/MEDIUM/LOW). CRITICAL/HIGH udløser automatisk fix-loop (én bunden iteration) + re-review + re-verifikation. Består fund: `status: 'blocked'`.
4. Compliance/AI-safety review gates afgøres af planner-flags (`needs_compliance_review`, `needs_ai_safety_review`) — ALDRIG keyword-matching på fritekst. Konservativ regel: i tvivl → true.
5. `/feature` har obligatorisk plan-godkendelses-gate (AskUserQuestion) inden workflowet startes; den godkendte plan sendes via `args.plan`.
**Hvorfor**: Tidligere kunne en feature blive erklæret "done" med rødt build, uadresserede CRITICAL findings og skippet GDPR-review — gates var social contract, ikke mekanik. Erklær ALDRIG done hvis workflow-status ikke er 'done'.

### [2026-06-11] FILETOKEN/read-token-systemet fjernet
**Type**: Arkitektur-beslutning
**Berørte agenter**: alle
**Lektion**: Read-token-mekanismen (agenter skulle starte svar med `*Nx7vP-Qm3kR-read*`) er FJERNET. Tokenværdien stod hardcodet i hver agents egen prompt og beviste derfor intet; rules-filerne auto-loades alligevel i alle agenter. Grounding sikres nu af auto-loadede rules + grounding-sektion i hver agent + honesty.md.
**Hvorfor**: Mekanismen kostede kontekst-tokens ved hvert kald og gav falsk tryghed. Genindfør den ALDRIG uden at fjerne tokenværdierne fra agent-prompterne først.

### [2026-06-11] Hook-matchere matcher kun tool-NAVNE
**Type**: Fejl-der-skal-undgås
**Berørte agenter**: devops-engineer, tech-lead
**Lektion**: I `settings.json` hooks er `matcher` et tool-NAVN (evt. regex som `Edit|Write`) — IKKE permission-syntaks. `"Bash(git commit*)"` matcher aldrig noget, så hooken kørte aldrig. Korrekt mønster: matcher `"Bash"` + scriptet læser selv `tool_input.command` fra stdin og filtrerer.
**Hvorfor**: En håndhævelsesmekanisme der aldrig udløses er værre end ingen — den giver falsk tryghed. Test altid hooks med et bevidst trigger-scenarie.

### [2026-06-06] STT-valg: Deepgram Nova-2, dual-stream
**Type**: Arkitektur-beslutning
**Berørte agenter**: stt-specialist, desktop-developer, extension-developer, realtime-specialist
**Lektion**: Dual-stream Deepgram (to separate WebSocket-forbindelser: mic=sælger, system=deltager) er besluttet. Diarization bruges IKKE.
**Hvorfor**: Dual-stream giver præcis speaker attribution uden diarization-fejl. Bekræftet af stt-specialist analyse.

### [2026-06-06] Database: Row-level tenancy via organization_id
**Type**: Arkitektur-beslutning
**Berørte agenter**: efcore-guide, dotnet-developer, database-reviewer
**Lektion**: `organization_id` placeres direkte på `projects`, `sessions` og `meeting_files`. Alle andre child-tabeller arver isolation via join-kæden.
**Hvorfor**: Denormalisering på de to mest-queried tabeller undgår join overhead. Enkel at implementere med EF Core global query filters.

### [2026-06-06] customer_state som jsonb
**Type**: Arkitektur-beslutning
**Berørte agenter**: dotnet-developer, efcore-guide, ai-safety-specialist
**Lektion**: `customer_state` på `sessions` er `jsonb` kolonne — opak AI-genereret blob. Valideres som untrusted input inden persistens (max 8 KB, max 3 niveauer nesting, ingen HTML/script).
**Hvorfor**: Struktureret datamodel er ikke mulig for AI-genereret kontekst. Jsonb giver fleksibilitet. Sikkerhedsvalidering er obligatorisk da det er AI-output.

### [2026-06-06] analysis_blueprint_sections som jsonb
**Type**: Arkitektur-beslutning
**Berørte agenter**: efcore-guide, dotnet-developer
**Lektion**: `sections`, `scoring_rubric`, `required_observations`, `forbidden_observations` på `analysis_blueprints` er jsonb kolonner.
**Hvorfor**: Altid læst samlet, aldrig queried individuelt. Separate rækker ville kræve komplekse Include-chains for ingen gevinst.

### [2026-06-06] Timestamps: altid timestamptz
**Type**: Konvention
**Berørte agenter**: efcore-guide, dotnet-developer
**Lektion**: Alle timestamp-kolonner bruger `timestamptz`. Sæt `AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", false)` i `Program.cs` FØR `builder.Build()`.
**Hvorfor**: Mangler dette switch → `Cannot write DateTime with Kind=Unspecified` exceptions i produktion.

### [2026-06-06] Multi-tenancy: afventer forretningsbeslutning
**Type**: Åben beslutning
**Berørte agenter**: efcore-guide, dotnet-developer, planner
**Lektion**: Organization/Project-ejerskabsstruktur afventer svar fra partner på `docs/platform-decisions.md`. Byg Fase 2-logik (audio, coaching, STT) mod `userId`-placeholder. Isolér ejerskabstjek bag `ICurrentOrganizationContext` interface.
**Hvorfor**: Multi-tenancy-beslutningen er en breaking change hvis den tages bagudrettet.

---

## Mønstre der virker

### Contracts ALLERFØRST i feature-build
**Berørte agenter**: dotnet-developer, desktop-developer, react-developer, extension-developer
**Lektion**: Contracts DTOs oprettes og rapporteres til tech-lead inden frontend-agenter starter. Desktop og Web læser `AiSalesCoach.Contracts/` direkte — duplikerer aldrig DTOs.
**Hvorfor**: Frontend-agenter starter ellers med forkerte eller manglende typer.

---

## Fejl der skal undgås

### Supabase-referencer i nyt kode
**Berørte agenter**: alle
**Lektion**: POC'erne brugte Supabase. AiSalesCoach er bygget med ASP.NET Core + PostgreSQL + EF Core. Ingen Supabase-specifikke mønstre (auth.uid(), RLS policies, edge functions) er relevante.

### npm-kommandoer til .NET test
**Berørte agenter**: tdd-guide, dotnet-developer
**Lektion**: Tests køres med `dotnet test AiSalesCoach.sln`, ikke `npm test`. Coverage med `dotnet test --collect:"XPlat Code Coverage"`.

---

---

## Desktop overlay — HTML prototype design regler

### [2026-06-08] Bar-elementer overlapper ved flex-shrink
**Type**: Fejl-der-skal-undgås
**Berørte agenter**: ui-designer, desktop-developer
**Lektion**: I en status-bar med mange elementer (REC-timer, audio-meter, opacity-slider, knapper) SKAL alle faste elementer have `flex-shrink:0`. Kun ét element (fx session-label) må have `flex:1` og krympe. Uden dette overlapper elementer ved første gengivelse.
**Hvorfor**: Sket 3 gange i samme session. Flex-containere komprimerer elementer uden `flex-shrink:0` og skaber visuelle overlap der er svære at debugge uden browser.

### [2026-06-08] Overlay-proportioner ift. MacBook-skærm
**Type**: Konvention
**Berørte agenter**: ui-designer
**Lektion**: I MacBook-simulering skal overlay-baren max fylde **33-36% af skærmbredden**. Med en lid på 1100px og skærm på ~1084px = bar max ~390px. Går baren over 40% ser overlayget urealistisk stort ud.
**Hvorfor**: Første iteration fyldte 62% af skærmen. På en rigtig MacBook Pro 14" (1512px logisk) ville 460px = 30% — det må ikke se større ud i simuleringen.

### [2026-06-08] Sidepaneler (transcript/coverage) — layout og position
**Type**: Konvention
**Berørte agenter**: ui-designer
**Lektion**: Coverage og transcript sidder VED SIDEN AF baren (row-layout), ikke nedenunder. Den korrekte struktur:
```
#d-all { flex-direction: row; align-items: flex-start; }
  [Coverage panel]  [Center column: bar + hints]  [Transcript panel]
```
Center-kolonnen er den eneste der vokser nedad. Sidepanelerne top-aligner med baren.
**Hvorfor**: Implementeret forkert 2 gange — antog column-layout i stedet for row-layout med center-kolonne.

### [2026-06-08, opdateret 2026-06-11] Sidepaneler — faste dimensioner fra start
**Type**: Konvention
**Berørte agenter**: ui-designer, desktop-developer
**Lektion**: Transcript og coverage-paneler har ALTID faste dimensioner: `width:240px; height:134px`. Aldrig `max-height` eller `min-height` — præcist fast. Indholdsstrategien er forskellig per panel:
- **Transcript**: `overflow-y:auto` — scroller internt.
- **Coverage**: `overflow:hidden` + CSS grid `2 kolonner × 3 rækker` — alle 6 dimensioner synlige samtidig, INGEN scroll (besluttet 2026-06-11). Lange labels (fx "Beslutningstagere") får `text-overflow:ellipsis` + `title`-tooltip.
**Hvorfor**: Paneler uden fast højde voksede med indhold og ødelagde layout-proportionerne. Scroll i coverage skjulte halvdelen af dimensionerne — sælgeren skal kunne aflæse alle 6 på ét blik.

### [2026-06-08] MacBook-ramme minimumsstørrelse
**Type**: Konvention
**Berørte agenter**: ui-designer
**Lektion**: MacBook Pro 14" simulering: lid min **1100px** bred, screen ~1084×698px (ratio 16:10.4). Base 1174px. Disse dimensioner sikrer at overlayets 33-36% bredde-regel kan overholdes og stadig give plads til sidepaneler.
**Hvorfor**: Første iteration med 824px lid resulterede i at overlayget tog 62% af skærmen.

### [2026-06-08] Z-index hierarki for overlay-prototype
**Type**: Konvention
**Berørte agenter**: ui-designer
**Lektion**: Fast z-index stacking i MacBook-prototype:
```
macOS menu bar: z-index 6
Notch:          z-index 7
Overlay (#d-all): z-index 5  ← OVER dock, UNDER OS chrome
Dock:           z-index 4
Wallpaper:      z-index 1
```
**Hvorfor**: Dock overlappede overlay fordi z-index ikke var fastlagt.

### [2026-06-08] Overlay-position skal specificeres fra start
**Type**: Konvention
**Berørte agenter**: ui-designer
**Lektion**: Afklar ALTID overlay-startposition inden implementation: **`top:32px; left:50%; transform:translateX(-50%)`** (top-center) er AiSalesCoach Desktop overlayets position i demoen. Ikke bottom-right (som er en anden valid position for det færdige produkt).
**Hvorfor**: Antog bottom-right i første iteration. Bruger ville top-center. Positionen påvirker hele layoutet.

---

## Åbne spørgsmål (afventer beslutning)

- Multi-tenancy model — se `docs/platform-decisions.md`
- Desktop overlay bredde: 320px (spec) vs. 400px (coverage-bar kræver det) — se `docs/design/overlay-mockup.html`
- pgvector dimensions: 1536 (OpenAI ada-002) vs. 3072 (text-embedding-3-large) — afventer AI-provider valg
