# AiSalesCoach — Lessons Learned
<!-- FILETOKEN: Lx9wQ -->

Dette dokument akkumulerer mønstre, konventioner og fejl opdaget under udviklingen.
Det opdateres automatisk via `/retro` kommandoen efter hver feature.
Alle agenter læser dette dokument automatisk.

---

## Hvordan dette dokument bruges

Hver agent der læser dette skal:
1. Tjekke om en relevant lektion gælder for den opgave der er igang
2. Undgå fejl der allerede er begået
3. Genbruge mønstre der har virket

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

### [2026-06-06] Workflow-scripts vs. markdown-kommandoer
**Type**: Arkitektur-beslutning
**Berørte agenter**: tech-lead, alle
**Lektion**: Workflow JS-scripts bruges KUN til `feature-build` (schema-baseret dataflow + resume). `/review` og `/plan` bruger direkte Agent-kald fra markdown-kommandoer.
**Hvorfor**: Workflow-scripts tilføjer kompleksitet der kun er berettiget når struktureret JSON skal flyde mellem agenter, eller builds er lange nok at resume er relevant.

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

### [2026-06-08] Sidepaneler — faste dimensioner fra start
**Type**: Konvention
**Berørte agenter**: ui-designer
**Lektion**: Transcript og coverage-paneler har ALTID faste dimensioner: `width:240px; height:134px; overflow-y:auto`. Aldrig `max-height` eller `min-height` — præcist fast. Scroll-funktionen håndterer indhold der overstiger højden.
**Hvorfor**: Paneler uden fast højde voksede med indhold og ødelagde layout-proportionerne.

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
