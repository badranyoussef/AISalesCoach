export const meta = {
  name: 'plan-feature',
  description: 'Kør planner + efcore + security + compliance + ai-safety parallelt, syntetisér til én implementeringsplan',
  phases: [
    { title: 'Analyse', detail: 'planner + efcore-guide + security-reviewer + compliance + ai-safety parallelt' },
    { title: 'Syntese', detail: 'tech-lead syntetiserer alle analyser til samlet plan' },
  ],
}

const TRIAGE_SCHEMA = {
  type: 'object',
  required: ['touches_audio_or_personal_data', 'touches_ai', 'reasoning'],
  properties: {
    touches_audio_or_personal_data: {
      type: 'boolean',
      description: 'true hvis featuren berører audio, optagelse, stemmedata, transcripts, persondata, samtykke eller data retention',
    },
    touches_ai: {
      type: 'boolean',
      description: 'true hvis featuren involverer LLM-kald, prompts, coaching hints, customer_state eller AI-genereret indhold',
    },
    reasoning: { type: 'string' },
  },
}

const feature = typeof args === 'string' ? args : (args && args.feature ? args.feature : 'ukendt feature')

// ── Phase 1: Triage + parallel analyse ─────────────────────────────────────
phase('Analyse')

// Struktureret triage i stedet for keyword-matching på feature-titlen.
// Falske negative er farlige (skippet GDPR/AI-review) — vær konservativ: i tvivl → true.
const triage = await agent(
  `Du klassificerer en feature for AiSalesCoach (AI-drevet real-time salgscoaching med audio-optagelse).
Læs .claude/rules/product-context.md for produktforståelse.

Feature: "${feature}"

Afgør:
- touches_audio_or_personal_data: berører featuren audio, optagelse, stemmedata, transcripts, persondata, samtykke eller retention — direkte ELLER indirekte (fx en feature der viser transcript-data)?
- touches_ai: involverer featuren LLM-kald, prompts, hints, customer_state eller andet AI-genereret indhold — direkte ELLER indirekte?

Vær konservativ: er du i tvivl, sæt flaget til true. Et overflødigt review er billigt — et skippet review er dyrt.`,
  { label: 'triage', phase: 'Analyse', schema: TRIAGE_SCHEMA }
)
log('Triage: audio/persondata=' + triage.touches_audio_or_personal_data + ', ai=' + triage.touches_ai + ' — ' + triage.reasoning)

const analyseTasks = [
  () => agent(
    `Du er planner for AiSalesCoach. Analysér feature: "${feature}"

Læs .claude/rules/product-context.md og .claude/rules/aisalescoach.md.

Returner:
- Hvilke lag berøres (Domain/Application/Infrastructure/Api/Desktop/Web/Extension)
- Konkrete klasser, records og endpoints der skal oprettes (navngiv dem præcist)
- Rækkefølge og afhængigheder mellem lag
- Om der kræves EF Core migration
- Estimat: lille (<1 dag) / medium (1-3 dage) / stor (>3 dage)`,
    { label: 'planner', phase: 'Analyse', agentType: 'planner' }
  ),
  () => agent(
    `Du er efcore-guide for AiSalesCoach. Analysér database-aspekter af feature: "${feature}"

Returner:
- Nye entiteter og forslag til EF Core-konfiguration (tabel-navne, kolonner, typer)
- Anbefalede indexes (primær + fremmednøgler + query-mønstre)
- Migration-strategi (safe vs. breaking change)
- Npgsql-specifikke overvejelser (enums, arrays, JSON-kolonner)`,
    { label: 'efcore', phase: 'Analyse', agentType: 'efcore-guide' }
  ),
  () => agent(
    `Du er security-reviewer for AiSalesCoach. Analysér sikkerhedskrav for feature: "${feature}"

Returner:
- Autentificering og autorisationskrav (hvilke endpoints kræver auth, hvilke roller)
- Sensitive data der håndteres (persondata, tokens, credentials)
- Potentielle angrebsvektorer (input-validering, injection, token-eksponering)
- Anbefalede sikkerhedsforanstaltninger`,
    { label: 'security', phase: 'Analyse', agentType: 'security-reviewer' }
  ),
]

if (triage.touches_audio_or_personal_data) {
  analyseTasks.push(() => agent(
    `Du er compliance-specialist for AiSalesCoach. Analysér compliance-krav for feature: "${feature}"

Returner:
- GDPR-krav: samtykke (hvornår, hvordan, hvad UI skal vise), lawful basis
- Stemmedata som biometrisk data under GDPR art. 9 — hvad kræver det?
- Data retention policy (hvornår slettes hvad, default: 90 dage)
- Danske Datatilsynet-specifikke krav
- Konkrete krav til consent-UI`,
    { label: 'compliance', phase: 'Analyse', agentType: 'compliance-specialist' }
  ))
}

if (triage.touches_ai) {
  analyseTasks.push(() => agent(
    `Du er ai-safety-specialist for AiSalesCoach. Analysér AI-sikkerhedskrav for feature: "${feature}"

KRITISK: Produktet modtager ukontrolleret tale-input fra prospects — adversarial prompts udtalt højt er en reel angrebsvektor.

Returner:
- Prompt injection risici (via audio → transcript → LLM)
- Output-valideringskrav for AI-genereret indhold
- Hallucination-risici i coaching-kontekst (hvilken skade kan forkerte hints gøre?)
- customer_state validering (AI-genereret objekt der sendes tilbage)
- Anbefalede sikkerhedsforanstaltninger`,
    { label: 'ai-safety', phase: 'Analyse', agentType: 'ai-safety-specialist' }
  ))
}

const analyses = await parallel(analyseTasks)
const validAnalyses = analyses.filter(Boolean)

log(validAnalyses.length + ' analyser returneret')

// ── Phase 2: Syntese ────────────────────────────────────────────────────────
phase('Syntese')
const synthesis = await agent(
  `Du er tech-lead for AiSalesCoach. Syntetisér disse parallelle analyser for feature "${feature}" til én samlet implementeringsplan.

Analyser:
${validAnalyses.map(function(a, i) { return '--- Analyse ' + (i + 1) + ' ---\n' + a }).join('\n\n')}

Præsenter planen i dette format:

## Feature: ${feature}

### Overblik
[2-3 sætninger]

### Implementeringsrækkefølge (bottom-up)
[Lag for lag med konkrete klasser/endpoints/komponenter]

### Database
[Migrationer, entiteter, indexes]

### Sikkerhedskrav
[Konkrete krav der SKAL opfyldes]

### Compliance (hvis relevant)
[GDPR-krav, consent-flow]

### AI-sikkerhed (hvis relevant)
[Prompt injection forsvar, output-validering]

### Åbne spørgsmål
[Hvad kræver afklaring inden vi starter?]

### Anbefaling
[Start nu / afklar X først]`,
  { label: 'synthesis', phase: 'Syntese', agentType: 'tech-lead' }
)

return { feature: feature, plan: synthesis }
