export const meta = {
  name: 'retro',
  description: 'Post-feature retrospektiv: analyser seneste commits og opdater lessons-learned.md med nye mønstre og konventioner',
  phases: [
    { title: 'Analyser', detail: 'Find seneste commits og ændrede filer' },
    { title: 'Ekstrahér', detail: 'Identificer mønstre, fejl og konventioner fra byggeriet' },
    { title: 'Opdatér', detail: 'Skriv nye entries til lessons-learned.md' },
  ],
}

const EXTRACT_SCHEMA = {
  type: 'object',
  required: ['feature_built', 'new_patterns', 'mistakes_corrected', 'conventions', 'arch_decisions', 'open_questions'],
  properties: {
    feature_built: { type: 'string' },
    new_patterns: { type: 'array', items: { type: 'string' } },
    mistakes_corrected: { type: 'array', items: { type: 'string' } },
    conventions: { type: 'array', items: { type: 'string' } },
    arch_decisions: { type: 'array', items: { type: 'string' } },
    open_questions: { type: 'array', items: { type: 'string' } },
  },
}

const context = typeof args === 'string' ? args : (args && args.context ? args.context : '')

// ── Phase 1: Analyser seneste commits ────────────────────────────
phase('Analyser')
const gitContext = await agent(
  `Kør disse kommandoer og returner output:
1. git log --oneline -10
2. git diff HEAD~3..HEAD --name-only
3. git diff HEAD~3..HEAD --stat

Returner rå output fra alle tre kommandoer.`,
  { label: 'git-context', phase: 'Analyser' }
)

// ── Phase 2: Ekstraher mønstre ───────────────────────────────────
phase('Ekstrahér')
const extracted = await agent(
  `Du er tech-lead for AiSalesCoach. Analyser denne build-aktivitet og ekstraher hvad der er lært.

Git-aktivitet:
${gitContext}

${context ? 'Ekstra kontekst: ' + context : ''}

Læs .claude/rules/product-context.md og .claude/rules/aisalescoach.md for at forstå projektet.
Læs .claude/rules/lessons-learned.md for at undgå dubletter.

Identificér:
- feature_built: hvad blev bygget
- new_patterns: mønstre der opstod og bør genbruges (vær specifik — navngiv klasser/filer)
- mistakes_corrected: fejl der blev lavet og rettet undervejs
- conventions: kodningskonventioner der blev etableret
- arch_decisions: arkitektur-beslutninger der er taget og skal huskes
- open_questions: åbne spørgsmål der opstod men ikke er afklaret

Returner KUN reelle fund — ikke generiske observationer. Tom liste er et gyldigt svar.`,
  { label: 'extract-patterns', phase: 'Ekstrahér', schema: EXTRACT_SCHEMA }
)

log('Feature: ' + extracted.feature_built)

const hasContent = [
  extracted.new_patterns,
  extracted.mistakes_corrected,
  extracted.conventions,
  extracted.arch_decisions,
].some(arr => arr && arr.length > 0)

if (!hasContent) {
  log('Ingen nye mønstre fundet — lessons-learned.md uændret.')
  return { updated: false, feature: extracted.feature_built }
}

// ── Phase 3: Opdatér lessons-learned.md ─────────────────────────
phase('Opdatér')
await agent(
  `Du er tech-lead for AiSalesCoach. Tilføj nye entries til .claude/rules/lessons-learned.md.

Hvad der skal tilføjes:
${JSON.stringify(extracted, null, 2)}

Regler:
1. Læs .claude/rules/lessons-learned.md FØR du skriver for at undgå dubletter
2. Brug dette format for hver entry:
   ### [YYYY-MM-DD] [feature_built]
   **Type**: Pattern / Fejl-der-skal-undgås / Konvention / Arkitektur-beslutning
   **Berørte agenter**: [list]
   **Lektion**: [konkret lektion]
   **Hvorfor**: [hvorfor det er vigtigt]
3. Tilføj under den relevante sektion (Mønstre der virker / Fejl der skal undgås / Arkitektur-beslutninger / Åbne spørgsmål)
4. Skriv KUN entries for de fund der har reel fremtidig værdi
5. Opdater FILETOKEN i filen: skift den nuværende værdi til en ny 5-tegns streng

Opdatér filen direkte.`,
  { label: 'update-lessons', phase: 'Opdatér' }
)

log('lessons-learned.md opdateret.')
return { updated: true, feature: extracted.feature_built, entries_added: extracted.new_patterns.length + extracted.arch_decisions.length }
