# AiSalesCoach — Produktkontekst (læses af alle agenter)

## ⚠️ Vedligeholdelsesregel — KRITISK

**Dette dokument SKAL opdateres når noget ændres i produktet.** Det er den eneste kilde til sandhed om hvad produktet er og gør.

**Hvem opdaterer det:**
- `tech-lead` — opdaterer efter hver feature der lander (nye endpoints, nye domænemodeller, nye klienter)
- `product-manager` — opdaterer når produktvision, brugerrejser eller prioriteter ændres
- **Du selv** — sig "opdater product-context.md" hvis du ved noget er forældet

**Hvornår det SKAL opdateres:**
- Ny klientoverflade tilføjes (fx mobilapp)
- Nyt domæneobjekt tilføjes til datamodellen
- Ny API-endpoint der ændrer forretningsflowet
- Et feature fjernes eller ændrer sig fundamentalt
- En ny ekstern service integreres (ny AI-udbyder, ny STT, ny auth)
- Forretningskonstanter ændres (chunk interval, token TTL, etc.)

**Format**: Bevar strukturen. Tilføj nye sektioner i bunden. Slet forældet indhold — bedre at mangle en sektion end at have forkert information.

---

Dette dokument giver ALLE agenter den fælles produktforståelse de skal have for at træffe de rigtige beslutninger. Det er ikke optionelt — det er fundamentet.

---

## Hvad er AiSalesCoach?

En **AI-drevet real-time salgscoaching platform** med tre klientoverflader der deler én backend:

| Overflade | Formål                                              | Brugssituation |
|-----------|-----------------------------------------------------|----------------|
| **Desktop overlay** (Avalonia) | Real-time coaching *under* et opkald via desktop    | Sælger ser hints mens de taler |
| **Web dashboard** (React) | Post-call analyse, framework-styring, pipeline      | Sælger + salgschef *efter* opkald |
| **Browser extension** (Chrome/Edge MV3) | Samme real-time coaching som desktop, men i browser | Web-møder (Zoom web, Teams web) |

---

## Reference-projekter (POC — kun til læring, ikke kopi)

| Projekt | Sti | Hvad vi lærer herfra |
|---------|-----|---------------------|
| Web POC | `/Users/youssef.badran/Dev/Closer.ai - lovable copy` | Sider, datamodeller, AI-flows, Supabase-skema |
| Desktop POC | `/Users/youssef.badran/Dev/Avalonia-testProject/SalesCoachDemo` | Dual-stream STT, overlay-design, NAudio/ScreenCaptureKit |
| Extension POC | `/Users/youssef.badran/Dev/Closer.ai-extension` | MV3 side panel, offscreen audio, Deepgram i browser |

**POC'erne er Supabase-baserede prototyper.** AiSalesCoach bygges fra bunden med ASP.NET Core + PostgreSQL + Clean Architecture. Brug POC'erne til at forstå produktet og forretningslogikken — ikke arkitekturen.

---

## Kernearkitektoniske mønstre (lær af POC, implementer i .NET)

### 1. Dual-stream STT — IKKE diarization

Den vigtigste tekniske beslutning i POC'erne: **to separate Deepgram WebSocket-forbindelser** per session:
- **Seller-stream**: Mikrofon (sælgerens stemme)
- **Participant-stream**: Systemlyd (loopback — modpartens stemme fra softphone/mødeapp)

Dette giver præcis speaker attribution uden diarization-fejl. Det er bedre end ét feed med diarization.

```
Desktop:   NAudio WaveInEvent (mic) → Deepgram WS #1 (seller)
           NAudio WasapiLoopbackCapture (system) → Deepgram WS #2 (participant)

Extension: getUserMedia (mic) → Deepgram WS #1 (seller) [via offscreen doc]
           getDisplayMedia (system audio) → Deepgram WS #2 (participant) [via side panel]
```

### 2. Coaching chunk-arkitektur (20-sekunders batches)

Coaching sker **ikke** per linje — det sker i 20-sekunders vinduer:

```
Transcript buffer (rullende 90s vindue)
    ↓ hvert 20. sekund
POST /api/coaching/hints med:
  - transcript_chunk: seneste 20s (ca. 300-500 tokens)
  - session_context: sidst 4000 tegn af fuld transcript
  - customer_state: opak JSON-objekt (AI opretholder kontekst på tværs af chunks)
  - company: firmanavn (optional)
  - project_id / framework_id
    ↓
Svar:
  - hints[]: [{type, text, urgency}]
  - framework_coverage: {discovery, pain_points, urgency, stakeholders, objections, closing}
  - customer_state: opdateret kontekstobjekt (returneres og sendes med næste kald)
```

`customer_state` er den kritiske mekanisme der lader AI'en huske hvad der skete for 2 minutter siden uden at sende hele historikken.

### 3. Framework-systemet

Salgschefer/-reps definerer **sales frameworks** som AI'en scorer opkald imod:

```
Framework (projekt-niveau)
  └── FrameworkRules[]: individuelle salgskrav
        - rule_name: "Stakeholder identification"
        - category: "Discovery" | "Objections" | "Closing" | ...
        - ideal_behavior_example: "Asks 'Who else needs to be involved?'"
        - scoring_criteria: "Present if stakeholders named in first 10 min"
  └── AnalysisBlueprint:
        - sections[]: vægtede scoringssektioner
        - scoring_rubric: hvordan AI'en evaluerer
        - tone: "strict" | "supportive"
        - required_observations / forbidden_observations
```

Post-call analyse scorer hvert opkald mod frameworket og returnerer:
- Overall score (0-100)
- Strengths: hvilke regler blev efterlevet
- Missed items: hvilke regler blev ikke efterlevet
- Suggested questions: hvad burde sælgeren have spurgt
- Framework coverage: 6 dimensioner som procent

### 4. Framework coverage — 6 dimensioner

Disse 6 dimensioner er produktets primære coaching-metrik. De bruges overalt:

| Dimension | Dansk | Beskrivelse |
|-----------|-------|-------------|
| `discovery` | Afdækning | Har sælgeren forstået kundens situation? |
| `pain_points` | Smertepunkter | Er problemerne identificeret og uddybet? |
| `urgency` | Hastegrad | Er der etableret en årsag til at handle nu? |
| `stakeholders` | Beslutningstagere | Er alle involverede identificeret? |
| `objections` | Indvendinger | Er indvendinger håndteret? |
| `closing` | Lukning | Er der forsøgt lukning / næste skridt? |

---

## Domænemodel (hvad der skal bygges)

```
Organization
  └── Projects[]              — "workspaces" med egne frameworks og indstillinger
        └── Frameworks[]      — framework med regler + blueprint
              └── FrameworkRules[]
              └── AnalysisBlueprint
        └── Deals[]           — pipeline (company, stage, industry)
        └── MeetingFiles[]    — uploadede/optagne sessioner
              └── Transcript  — fuld tekst
              └── TranscriptChunks[] — segmenteret med timestamps + embeddings
              └── Analysis    — AI-scoring mod framework
                    └── AnalysisCitations[] — koblet til regler + chunks
              └── MeetingInsights[] — AI-opdagede indsigter
        └── Sessions[]        — live coaching-sessioner (Desktop/Extension)
              └── TranscriptLines[] — sælger + deltager linjer med timestamps
              └── Hints[]     — genererede coaching-hints
              └── HintFeedback[] — bruger-ratings af hints

User → OrganizationMembers (rolle: owner/admin/member)
```

---

## Tre klientoverflader — ansvarsfordeling

### Desktop overlay (Avalonia)
- **Hvad det gør**: Transparent always-on-top vindue (320px bred, altid nederst til højre). Viser hints i <2 sekunder. Fanger lyd via NAudio (Windows) / ScreenCaptureKit (macOS). Skjules fra skærmoptagelse.
- **Hvad det IKKE gør**: Gemmer ikke API-nøgler. Kalder ikke Deepgram direkte — får kortlivede tokens fra Api. Kender ikke til Infrastructure-laget.
- **Primær bruger**: Sælger under aktivt opkald.

### Web dashboard (React)
- **Hvad det gør**: Post-call analyse, framework-opbygning, deal pipeline, hint-optimering, team-administration, sessionshistorik.
- **Sider**: Dashboard, Meeting Library, Framework Library, Analysis Workspace, Analysis Director, Live Session, Hint Optimizer, Deals, Settings.
- **Primære brugere**: Sælger (egne opkald) + Salgschef (hele teamet).

### Browser extension (Chrome/Edge MV3)
- **Hvad det gør**: Side panel med real-time coaching under web-møder. Fanger mikrofon via `getUserMedia` (offscreen document) og systemlyd via `getDisplayMedia`. Gemmer sessioner til backend.
- **Teknisk**: Manifest V3, service worker, offscreen documents, side panel API.
- **Primær bruger**: Sælger der holder møder i browser (Zoom web, Teams web).

---

## Backend migration (Supabase POC → ASP.NET Core)

POC'erne bruger Supabase edge functions til AI-kald og Supabase Auth til login. AiSalesCoach erstatter dette med:

| POC (Supabase) | Nyt (ASP.NET Core) |
|----------------|--------------------|
| `/functions/v1/live-coach` | `POST /api/coaching/hints` (Application: `GenerateHintsUseCase`) |
| `/functions/v1/analyze-meeting` | `POST /api/analyses` + baggrundsjob |
| `/functions/v1/deepgram-token` | `GET /api/sessions/{id}/token` (kortlivet Deepgram token) |
| `/functions/v1/meeting-insights` | Baggrundsjob efter analyse |
| `supabase.auth.signInWithPassword()` | `POST /api/auth/login` (JWT + refresh token) |
| Supabase RLS | EF Core queries med userId-filter + rolle-baseret adgangskontrol |
| Supabase Realtime | SignalR hub (`/hubs/coaching`) |
| Supabase Storage | Blob storage (Azure/S3 eller lokal) for lydfiler |

---

## Sikkerhedskrav der er unikke for dette produkt

1. **Opkaldsoptagelse kræver samtykke** — GDPR + lokale love. Deltager skal informeres og samtykke INDEN optagelse starter. UI skal vise tydelig indikator. Se `compliance-specialist` agent.
2. **Deepgram API-nøgle forlader aldrig serveren** — Desktop og Extension modtager kortlivede tokens (max 60s levetid). Roteres per session.
3. **`customer_state`-objektet** returneres fra AI og sendes tilbage næste chunk. Det er AI-genereret indhold — valider det inden det gemmes eller sendes videre.
4. **Audio-data** er særligt følsomt (stemmedata er biometrisk data under GDPR). Krypter i transit og hvile. Definer retention policy (default: slet efter 90 dage).

---

## Forretningslogik-konstanter

```
COACHING_CHUNK_INTERVAL_SECONDS = 20
SESSION_CONTEXT_MAX_CHARS = 4000
DEEPGRAM_TOKEN_TTL_SECONDS = 60
HINT_DISPLAY_AUTO_DISMISS_SECONDS = 12
MAX_HINTS_DISPLAYED = 5 (desktop) / 20 (extension)
COVERAGE_DIMENSIONS = [discovery, pain_points, urgency, stakeholders, objections, closing]
AUDIO_SAMPLE_RATE = 16000   // Hz — Deepgram krav
AUDIO_CHANNELS = 1          // mono
AUDIO_ENCODING = linear16   // PCM 16-bit signed
```

---

## Eksisterende agenter — hvem ved hvad

Brug altid den specialiserede agent til det rigtige arbejde. Se `.claude/rules/aisalescoach.md` for den fulde routing-tabel.

Når du er i tvivl: `tech-lead` agenten koordinerer alle andre og kender det fulde billede.
