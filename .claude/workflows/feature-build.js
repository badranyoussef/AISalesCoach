export const meta = {
  name: 'feature-build',
  description: 'Byg AiSalesCoach feature end-to-end: planner → domain+contracts (parallelt) → application → infrastructure → api → clients (parallelt) → review (parallelt)',
  phases: [
    { title: 'Plan', detail: 'planner returnerer struktureret implementeringsplan' },
    { title: 'Domain + Contracts', detail: 'Domain entiteter og Contracts DTOs bygges parallelt' },
    { title: 'Application', detail: 'MediatR use cases + FluentValidation validators' },
    { title: 'Infrastructure', detail: 'EF Core repositories, JWT, Deepgram, DI-registrering' },
    { title: 'Api', detail: 'ASP.NET Core controllers og endpoints' },
    { title: 'Clients', detail: 'Desktop + Web + Extension bygges parallelt' },
    { title: 'Review', detail: 'csharp-reviewer + arch-guardian + security-reviewer parallelt' },
  ],
}

const PLAN_SCHEMA = {
  type: 'object',
  required: [
    'summary', 'domain_entities', 'contracts_dtos', 'use_cases',
    'infrastructure_components', 'api_endpoints', 'risks', 'needs_migration',
    'needs_desktop', 'needs_web', 'needs_extension', 'needs_ui_design',
  ],
  properties: {
    summary: { type: 'string' },
    domain_entities: { type: 'array', items: { type: 'string' } },
    contracts_dtos: { type: 'array', items: { type: 'string' } },
    use_cases: { type: 'array', items: { type: 'string' } },
    infrastructure_components: { type: 'array', items: { type: 'string' } },
    api_endpoints: { type: 'array', items: { type: 'string' } },
    desktop_changes: { type: 'array', items: { type: 'string' } },
    web_changes: { type: 'array', items: { type: 'string' } },
    extension_changes: { type: 'array', items: { type: 'string' } },
    needs_desktop: { type: 'boolean' },
    needs_web: { type: 'boolean' },
    needs_extension: { type: 'boolean' },
    needs_migration: { type: 'boolean' },
    needs_ui_design: { type: 'boolean' },
    risks: { type: 'array', items: { type: 'string' } },
  },
}

const feature = typeof args === 'string' ? args : (args && args.feature ? args.feature : 'ukendt feature')
const overrideClients = args && args.clients ? args.clients : null

// ── Phase 1: Plan ──────────────────────────────────────────────────────────
phase('Plan')
const plan = await agent(
  `Du er planner for AiSalesCoach. Feature der skal bygges: "${feature}"

Læs .claude/rules/product-context.md og .claude/rules/aisalescoach.md.
Dekomponér featuren til præcise, navngivne implementeringskomponenter per lag.

Vær konkret — navngiv faktiske klasser, records og endpoints.
needs_migration: true hvis nye EF Core-entiteter tilføjes.
needs_desktop/web/extension: true for de klienter featuren berører.
risks: GDPR/audio-risici hvis lyd, optagelse eller persondata indgår. AI-risici hvis LLM bruges.`,
  { label: 'planner', phase: 'Plan', schema: PLAN_SCHEMA, agentType: 'planner' }
)

log('Plan: ' + plan.summary)
if (plan.risks && plan.risks.length > 0) log('Risici identificeret: ' + plan.risks.join(', '))

// ── Phase 2: Domain + Contracts parallelt ─────────────────────────────────
phase('Domain + Contracts')
await parallel([
  () => agent(
    `Du er dotnet-developer for AiSalesCoach. Implementér Domain-laget for feature: "${feature}".

Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave:
- Opret entiteter: ${plan.domain_entities.join(', ')}
- Interfaces til repositories i Domain/Interfaces/
- Brug records til value objects
- Domain har INGEN NuGet-afhængigheder
- Afslut med: dotnet build src/core/AiSalesCoach.Domain/ — rapportér output`,
    { label: 'domain', phase: 'Domain + Contracts', agentType: 'dotnet-developer' }
  ),
  () => agent(
    `Du er dotnet-developer for AiSalesCoach. Implementér Contracts-laget for feature: "${feature}".

Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave:
- Opret DTOs: ${plan.contracts_dtos.join(', ')}
- Placér i src/core/AiSalesCoach.Contracts/<FeatureName>/
- Kun records (immutable) — ingen klasser med mutable properties
- Afslut med: dotnet build src/core/AiSalesCoach.Contracts/ — rapportér output`,
    { label: 'contracts', phase: 'Domain + Contracts', agentType: 'dotnet-developer' }
  ),
])

// ── Phase 3: Application ───────────────────────────────────────────────────
phase('Application')
await agent(
  `Du er dotnet-developer for AiSalesCoach. Implementér Application-laget for feature: "${feature}".

Domain og Contracts er klar. Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave:
- Opret use cases: ${plan.use_cases.join(', ')}
- Én IRequest + IRequestHandler per use case i Application/UseCases/<Feature>/
- FluentValidation validator for hvert Command (ikke Queries)
- Application kender IKKE til EF Core, HttpContext eller UI
- Afslut med: dotnet build src/core/AiSalesCoach.Application/ — rapportér output`,
  { label: 'application', phase: 'Application', agentType: 'dotnet-developer' }
)

// ── Phase 4: Infrastructure ────────────────────────────────────────────────
phase('Infrastructure')
await agent(
  `Du er dotnet-developer for AiSalesCoach. Implementér Infrastructure-laget for feature: "${feature}".

Application er klar. Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave:
- Implementér: ${plan.infrastructure_components.join(', ')}
- Implementér Domain-interfaces med EF Core/Npgsql
- Registrér alle services i DependencyInjection.cs
${plan.needs_migration
  ? '- Kør: dotnet ef migrations add <Navn> --project src/infrastructure/AiSalesCoach.Infrastructure --startup-project src/api/AiSalesCoach.Api'
  : '- Ingen ny migration nødvendig'}
- Afslut med: dotnet build src/infrastructure/AiSalesCoach.Infrastructure/ — rapportér output`,
  { label: 'infrastructure', phase: 'Infrastructure', agentType: 'dotnet-developer' }
)

// ── Phase 5: Api ───────────────────────────────────────────────────────────
phase('Api')
await agent(
  `Du er dotnet-developer for AiSalesCoach. Implementér Api-laget for feature: "${feature}".

Infrastructure er klar. Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave:
- Endpoints: ${plan.api_endpoints.join(', ')}
- Thin controllers — kun _mediator.Send(), ingen forretningslogik
- [Authorize] på alle endpoints undtagen /api/auth/login og /api/auth/refresh
- Opdatér docs/api-contracts.md med nye endpoints
- Afslut med: dotnet build src/api/AiSalesCoach.Api/ — rapportér output`,
  { label: 'api', phase: 'Api', agentType: 'dotnet-developer' }
)

// ── Phase 5b: UI Design (hvis needs_ui_design) ────────────────────────────
if (plan.needs_ui_design) {
  phase('UI Design')
  await agent(
    `Du er ui-designer for AiSalesCoach. Design UI for feature: "${feature}".

Api er klar. Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Producér:
- Konkret design-spec med komponent-hierarki
- ASCII wireframes for alle relevante states
- Farve og spacing-specifikationer der matcher eksisterende design system
- Hvad desktop-developer og react-developer skal implementere præcist

Brug docs/design/overlay-mockup.html som reference for eksisterende design-beslutninger.`,
    { label: 'ui-design', phase: 'UI Design', agentType: 'ui-designer' }
  )
}

// ── Phase 6: Clients parallelt ─────────────────────────────────────────────
phase('Clients')
const needsDesktop = overrideClients ? overrideClients.includes('desktop') : plan.needs_desktop
const needsWeb = overrideClients ? overrideClients.includes('web') : plan.needs_web
const needsExtension = overrideClients ? overrideClients.includes('extension') : plan.needs_extension

const clientTasks = []

if (needsDesktop && plan.desktop_changes && plan.desktop_changes.length > 0) {
  clientTasks.push(() => agent(
    `Du er desktop-developer for AiSalesCoach. Implementér Desktop-ændringer for feature: "${feature}".

Contracts og Api er klar. Læs src/core/AiSalesCoach.Contracts/ inden du implementerer API-kald.
Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave: ${plan.desktop_changes.join(', ')}
- CommunityToolkit.Mvvm source generators, compiled XAML bindings
- Desktop kender KUN Contracts + Domain — ikke Infrastructure eller Application
- Afslut med: dotnet build src/clients/AiSalesCoach.Desktop/ — rapportér output`,
    { label: 'desktop', phase: 'Clients', agentType: 'desktop-developer' }
  ))
}

if (needsWeb && plan.web_changes && plan.web_changes.length > 0) {
  clientTasks.push(() => agent(
    `Du er react-developer for AiSalesCoach. Implementér Web-ændringer for feature: "${feature}".

Api er klar. Se docs/api-contracts.md for endpoints.
Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave: ${plan.web_changes.join(', ')}
- React 19 + TypeScript strict mode (ingen any)
- React Query til alle API-kald, shadcn/ui + Tailwind`,
    { label: 'web', phase: 'Clients', agentType: 'react-developer' }
  ))
}

if (needsExtension && plan.extension_changes && plan.extension_changes.length > 0) {
  clientTasks.push(() => agent(
    `Du er extension-developer for AiSalesCoach. Implementér Extension-ændringer for feature: "${feature}".

Api er klar. Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave: ${plan.extension_changes.join(', ')}
- Manifest V3 constraints, service worker lifecycle
- Offscreen documents til audio capture`,
    { label: 'extension', phase: 'Clients', agentType: 'extension-developer' }
  ))
}

if (clientTasks.length > 0) {
  await parallel(clientTasks)
} else {
  log('Ingen client-ændringer i denne feature — Clients-fasen springes over')
}

// ── Phase 7: Review parallelt ──────────────────────────────────────────────
phase('Review')
const reviewTasks = [
  () => agent(
    `Du er csharp-reviewer for AiSalesCoach. Review C#-koden for feature "${feature}".
Fokus: async/await patterns, nullable reference types, Result<T> brug, CancellationToken, ingen exceptions til flow control.
Rapportér konkrete fund med filsti + linjenummer.`,
    { label: 'csharp', phase: 'Review', agentType: 'csharp-reviewer' }
  ),
  () => agent(
    `Du er clean-arch-guardian for AiSalesCoach. Verificér Clean Architecture-grænser for feature "${feature}".
Tjek .csproj-filer: Domain ingen NuGet-deps, Application kender ikke EF Core, Desktop kender ikke Infrastructure.
Kør: dotnet build AiSalesCoach.sln — rapportér eventuelle violations.`,
    { label: 'arch-guardian', phase: 'Review', agentType: 'clean-arch-guardian' }
  ),
  () => agent(
    `Du er security-reviewer for AiSalesCoach. Review security for feature "${feature}".
Fokus: JWT håndtering, Deepgram token-eksponering, input-validering, SQL injection, OWASP Top 10.
Kendte risici fra planen: ${JSON.stringify(plan.risks)}`,
    { label: 'security', phase: 'Review', agentType: 'security-reviewer' }
  ),
]

const risksStr = plan.risks ? plan.risks.join(' ').toLowerCase() : ''

if (risksStr.includes('audio') || risksStr.includes('gdpr') || risksStr.includes('persondata') || risksStr.includes('optagelse') || risksStr.includes('stemme')) {
  reviewTasks.push(() => agent(
    `Du er compliance-specialist for AiSalesCoach. Review compliance for feature "${feature}".
Fokus: GDPR samtykke til optagelse, stemmedata som biometrisk data (art. 9), data retention policy.
Risici: ${JSON.stringify(plan.risks)}`,
    { label: 'compliance', phase: 'Review', agentType: 'compliance-specialist' }
  ))
}

if (risksStr.includes('ai') || risksStr.includes('prompt') || risksStr.includes('llm') || risksStr.includes('coaching') || risksStr.includes('hint')) {
  reviewTasks.push(() => agent(
    `Du er ai-safety-specialist for AiSalesCoach. Review AI-sikkerhed for feature "${feature}".
Fokus: prompt injection via audio-input, output-validering, hallucination i coaching hints, customer_state validering.`,
    { label: 'ai-safety', phase: 'Review', agentType: 'ai-safety-specialist' }
  ))
}

await parallel(reviewTasks)

log('Build komplet. Kør: dotnet test AiSalesCoach.sln')
return { feature: feature, summary: plan.summary }
