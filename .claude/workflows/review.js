export const meta = {
  name: 'review',
  description: 'Auto-detect ændrede filer og kør alle relevante review-agenter parallelt',
  phases: [
    { title: 'Detect', detail: 'Find ændrede filer og bestem hvilke reviewers er relevante' },
    { title: 'Review', detail: 'Kør alle relevante reviewers parallelt' },
  ],
}

const DETECT_SCHEMA = {
  type: 'object',
  required: ['has_csharp', 'has_desktop_xaml', 'has_react', 'has_typescript', 'has_migrations', 'has_ai_prompts'],
  properties: {
    has_csharp: { type: 'boolean' },
    has_desktop_xaml: { type: 'boolean' },
    has_react: { type: 'boolean' },
    has_typescript: { type: 'boolean' },
    has_migrations: { type: 'boolean' },
    has_ai_prompts: { type: 'boolean' },
    changed_files: { type: 'array', items: { type: 'string' } },
  },
}

const scope = typeof args === 'string' ? args : (args && args.scope ? args.scope : 'alle aktuelle ændringer')

// ── Phase 1: Detect ────────────────────────────────────────────────────────
phase('Detect')
const detection = await agent(
  `Find alle ændrede filer i AiSalesCoach-projektet.

Kør:
1. git diff --name-only HEAD
2. git status --short

Sæt flags:
- has_csharp: true hvis nogen .cs-filer er ændret
- has_desktop_xaml: true hvis nogen .axaml eller .axaml.cs filer er ændret
- has_react: true hvis nogen .tsx-filer er ændret
- has_typescript: true hvis nogen .ts eller .tsx-filer er ændret
- has_migrations: true hvis nogen Migrations/-filer eller DbContext er ændret
- has_ai_prompts: true hvis nogen prompt-strings, hint-logik eller AI-kald er ændret`,
  { label: 'detect', phase: 'Detect', schema: DETECT_SCHEMA }
)

if (!detection || !detection.changed_files || detection.changed_files.length === 0) {
  log('Ingen ændrede filer fundet — intet at reviewe')
  return { scope: scope, agents_run: 0 }
}

log('Ændrede filer: ' + detection.changed_files.join(', '))

// ── Phase 2: Review parallelt ──────────────────────────────────────────────
phase('Review')
const reviewTasks = []

if (detection.has_csharp) {
  reviewTasks.push(() => agent(
    `Du er csharp-reviewer for AiSalesCoach. Review C#-ændringer (scope: ${scope}).
Kør: git diff --name-only HEAD for at se ændrede filer, læs de relevante .cs-filer.
Fokus: async/await patterns, nullable reference types, Result<T> brug, CancellationToken.
Rapportér fund med filsti + linjenummer.`,
    { label: 'csharp', phase: 'Review', agentType: 'csharp-reviewer' }
  ))

  reviewTasks.push(() => agent(
    `Du er clean-arch-guardian for AiSalesCoach. Verificér Clean Architecture-grænser (scope: ${scope}).
Tjek .csproj-filer for ulovlige referencer.
Kør: dotnet build AiSalesCoach.sln — rapportér eventuelle violations.`,
    { label: 'arch-guardian', phase: 'Review', agentType: 'clean-arch-guardian' }
  ))

  reviewTasks.push(() => agent(
    `Du er security-reviewer for AiSalesCoach. Review security i C#-ændringer (scope: ${scope}).
Fokus: JWT håndtering, Deepgram token-eksponering, input-validering, OWASP Top 10.`,
    { label: 'security', phase: 'Review', agentType: 'security-reviewer' }
  ))
}

if (detection.has_desktop_xaml) {
  reviewTasks.push(() => agent(
    `Du er avalonia-reviewer for AiSalesCoach. Review Avalonia Desktop-ændringer (scope: ${scope}).
Fokus: CommunityToolkit.Mvvm patterns, compiled XAML bindings, overlay-adfærd, platform-abstraktioner (Windows/macOS).`,
    { label: 'avalonia', phase: 'Review', agentType: 'avalonia-reviewer' }
  ))
}

if (detection.has_react) {
  reviewTasks.push(() => agent(
    `Du er react-reviewer for AiSalesCoach. Review React-ændringer (scope: ${scope}).
Fokus: hook correctness, render performance, tilgængelighed, React 19 patterns.`,
    { label: 'react', phase: 'Review', agentType: 'react-reviewer' }
  ))
}

if (detection.has_typescript) {
  reviewTasks.push(() => agent(
    `Du er typescript-reviewer for AiSalesCoach. Review TypeScript-ændringer (scope: ${scope}).
Fokus: strict mode, ingen any, type safety, async correctness.`,
    { label: 'typescript', phase: 'Review', agentType: 'typescript-reviewer' }
  ))
}

if (detection.has_migrations) {
  reviewTasks.push(() => agent(
    `Du er database-reviewer for AiSalesCoach. Review EF Core migrations og DbContext-ændringer (scope: ${scope}).
Fokus: migration-sikkerhed under concurrent writes, index-strategi, nullable columns, Npgsql-konventioner.`,
    { label: 'database', phase: 'Review', agentType: 'database-reviewer' }
  ))
}

if (detection.has_ai_prompts) {
  reviewTasks.push(() => agent(
    `Du er ai-safety-specialist for AiSalesCoach. Review AI-sikkerhed i ændrede prompts/hint-logik (scope: ${scope}).
Fokus: prompt injection via audio-input, output-validering, hallucination i coaching hints.`,
    { label: 'ai-safety', phase: 'Review', agentType: 'ai-safety-specialist' }
  ))
}

if (reviewTasks.length === 0) {
  log('Ingen relevante reviewers for de ændrede filer')
  return { scope: scope, agents_run: 0 }
}

const results = await parallel(reviewTasks)
const ran = results.filter(Boolean).length
log('Review komplet — ' + ran + ' agenter kørt.')
return { scope: scope, agents_run: ran }
