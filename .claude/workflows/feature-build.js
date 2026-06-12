export const meta = {
  name: 'feature-build',
  description: 'Byg AiSalesCoach feature end-to-end med håndhævede quality gates: plan → domain+contracts → application → unit tests → infrastructure → api → integration tests → clients → verifikation → review m. fix-loop → retro',
  phases: [
    { title: 'Plan', detail: 'planner returnerer struktureret plan (springes over hvis godkendt plan medsendes)' },
    { title: 'Domain + Contracts', detail: 'Domain entiteter og Contracts DTOs parallelt — build-gate per projekt' },
    { title: 'Application', detail: 'MediatR use cases + FluentValidation — build-gate' },
    { title: 'Unit Tests', detail: 'tdd-guide skriver unit tests, min. 80% dækning — test-gate' },
    { title: 'Infrastructure', detail: 'EF Core, JWT, Deepgram, DI — build-gate' },
    { title: 'Api', detail: 'Minimal API endpoints — build-gate' },
    { title: 'Integration Tests', detail: 'tdd-guide skriver integration tests per endpoint — build-gate' },
    { title: 'UI Design', detail: 'ui-designer (kun hvis needs_ui_design)' },
    { title: 'Clients', detail: 'Desktop + Web + Extension parallelt — build-gate per klient' },
    { title: 'Verifikation', detail: 'Fuld dotnet build + dotnet test på hele solutionen — hård gate' },
    { title: 'Review', detail: 'Reviewers parallelt med struktureret findings-output' },
    { title: 'Fix', detail: 'CRITICAL/HIGH findings rettes og re-reviewes — én bunden iteration' },
    { title: 'Retro', detail: 'lessons-learned.md og shared-components.md opdateres' },
  ],
}

// ───────────────────────────── Schemas ─────────────────────────────────────

const PLAN_SCHEMA = {
  type: 'object',
  required: [
    'summary', 'domain_entities', 'contracts_dtos', 'use_cases',
    'infrastructure_components', 'api_endpoints', 'risks', 'needs_migration',
    'needs_desktop', 'needs_web', 'needs_extension', 'needs_ui_design',
    'needs_compliance_review', 'needs_ai_safety_review',
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
    needs_compliance_review: {
      type: 'boolean',
      description: 'true hvis featuren berører audio, optagelse, stemmedata, persondata, samtykke, retention eller anden GDPR-relevant behandling',
    },
    needs_ai_safety_review: {
      type: 'boolean',
      description: 'true hvis featuren involverer LLM-kald, prompts, coaching hints, customer_state, transcript-behandling eller andet AI-genereret indhold',
    },
    risks: { type: 'array', items: { type: 'string' } },
  },
}

const BUILD_REPORT_SCHEMA = {
  type: 'object',
  required: ['build_succeeded', 'summary'],
  properties: {
    build_succeeded: { type: 'boolean', description: 'true KUN hvis build/test-kommandoen exitede med kode 0 og uden fejl. Rapportér ærligt — falsk grøn er værre end rød.' },
    summary: { type: 'string', description: 'Hvad blev implementeret + faktisk build/test-output i kort form' },
    errors: { type: 'array', items: { type: 'string' }, description: 'Compiler-/testfejl ordret, hvis build_succeeded=false' },
  },
}

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['build_succeeded', 'tests_succeeded', 'summary'],
  properties: {
    build_succeeded: { type: 'boolean' },
    tests_succeeded: { type: 'boolean' },
    failed_tests: { type: 'array', items: { type: 'string' } },
    errors: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
}

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'title', 'file', 'description'],
        properties: {
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          title: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'number' },
          description: { type: 'string' },
          suggested_fix: { type: 'string' },
        },
      },
    },
  },
}

// ───────────────────────────── Input ───────────────────────────────────────

const feature = typeof args === 'string' ? args : (args && args.feature ? args.feature : 'ukendt feature')
const overrideClients = args && args.clients ? args.clients : null
const approvedPlan = args && args.plan ? args.plan : null

// ───────────────────────────── Gate-hjælpere ───────────────────────────────

// Én bunden reparationsrunde via dotnet-build-resolver. Returnerer endelig rapport.
async function dotnetBuildGate(report, phaseName, buildTarget) {
  if (report && report.build_succeeded) return report
  const errors = report && report.errors ? report.errors : ['(agenten returnerede intet build-resultat)']
  log('⛔ ' + phaseName + ': build/test fejlede — kalder dotnet-build-resolver')
  const fixed = await agent(
    `Du er dotnet-build-resolver for AiSalesCoach. Fasen "${phaseName}" i feature-build af "${feature}" fejlede.

Rapporterede fejl:
${errors.join('\n')}

Opgave:
1. Kør: ${buildTarget} — reproducér fejlene
2. Diagnosticér og ret dem (mindst mulige ændring, ingen scope-udvidelse)
3. Kør kommandoen igen og bekræft grøn
4. build_succeeded = true KUN hvis exit code 0. Rapportér ærligt.`,
    { label: 'build-resolver', phase: phaseName, schema: BUILD_REPORT_SCHEMA, agentType: 'dotnet-build-resolver' }
  )
  return fixed || { build_succeeded: false, summary: 'dotnet-build-resolver returnerede intet resultat', errors: errors }
}

function failResult(phaseName, report) {
  log('🛑 Workflow stoppet i fasen "' + phaseName + '" — gate ikke bestået. Featuren er IKKE done.')
  return {
    status: 'failed',
    failed_phase: phaseName,
    feature: feature,
    errors: (report && report.errors) || [],
    summary: (report && report.summary) || '',
  }
}

// ── Phase 1: Plan ──────────────────────────────────────────────────────────
phase('Plan')
let plan
if (approvedPlan) {
  plan = approvedPlan
  log('Bruger-godkendt plan modtaget — planner springes over.')
} else {
  plan = await agent(
    `Du er planner for AiSalesCoach. Feature der skal bygges: "${feature}"

Læs .claude/rules/product-context.md og .claude/rules/aisalescoach.md.
Dekomponér featuren til præcise, navngivne implementeringskomponenter per lag.

Vær konkret — navngiv faktiske klasser, records og endpoints.
needs_migration: true hvis nye EF Core-entiteter tilføjes.
needs_desktop/web/extension: true for de klienter featuren berører.
needs_compliance_review: true hvis featuren berører audio, optagelse, stemmedata, persondata, samtykke eller data retention — vær konservativ: i tvivl → true.
needs_ai_safety_review: true hvis featuren involverer LLM-kald, prompts, coaching hints, customer_state eller transcript-behandling — i tvivl → true.
risks: konkrete risici (GDPR/audio/AI/sikkerhed).`,
    { label: 'planner', phase: 'Plan', schema: PLAN_SCHEMA, agentType: 'planner' }
  )
}

log('Plan: ' + plan.summary)
if (plan.risks && plan.risks.length > 0) log('Risici identificeret: ' + plan.risks.join(', '))
if (plan.needs_compliance_review) log('Compliance-review er PÅKRÆVET for denne feature')
if (plan.needs_ai_safety_review) log('AI-safety-review er PÅKRÆVET for denne feature')

// ── Phase 2: Domain + Contracts parallelt ─────────────────────────────────
phase('Domain + Contracts')
const domainAndContracts = await parallel([
  () => agent(
    `Du er dotnet-developer for AiSalesCoach. Implementér Domain-laget for feature: "${feature}".

Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave:
- Opret entiteter: ${plan.domain_entities.join(', ')}
- Interfaces til repositories i Domain/Interfaces/
- Brug records til value objects
- Domain har INGEN NuGet-afhængigheder
- Afslut med: dotnet build src/core/AiSalesCoach.Domain/ — build_succeeded afspejler det FAKTISKE resultat`,
    { label: 'domain', phase: 'Domain + Contracts', schema: BUILD_REPORT_SCHEMA, agentType: 'dotnet-developer' }
  ),
  () => agent(
    `Du er dotnet-developer for AiSalesCoach. Implementér Contracts-laget for feature: "${feature}".

Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave:
- Opret DTOs: ${plan.contracts_dtos.join(', ')}
- Placér i src/core/AiSalesCoach.Contracts/<FeatureName>/
- Kun records (immutable) — ingen klasser med mutable properties
- Afslut med: dotnet build src/core/AiSalesCoach.Contracts/ — build_succeeded afspejler det FAKTISKE resultat`,
    { label: 'contracts', phase: 'Domain + Contracts', schema: BUILD_REPORT_SCHEMA, agentType: 'dotnet-developer' }
  ),
])

const domainReport = await dotnetBuildGate(domainAndContracts[0], 'Domain + Contracts', 'dotnet build src/core/AiSalesCoach.Domain/')
if (!domainReport.build_succeeded) return failResult('Domain', domainReport)
const contractsReport = await dotnetBuildGate(domainAndContracts[1], 'Domain + Contracts', 'dotnet build src/core/AiSalesCoach.Contracts/')
if (!contractsReport.build_succeeded) return failResult('Contracts', contractsReport)

// ── Phase 3: Application ───────────────────────────────────────────────────
phase('Application')
let appReport = await agent(
  `Du er dotnet-developer for AiSalesCoach. Implementér Application-laget for feature: "${feature}".

Domain og Contracts er klar. Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave:
- Opret use cases: ${plan.use_cases.join(', ')}
- Én IRequest + IRequestHandler per use case i Application/UseCases/<Feature>/
- FluentValidation validator for hvert Command (ikke Queries)
- Application kender IKKE til EF Core, HttpContext eller UI
- Afslut med: dotnet build src/core/AiSalesCoach.Application/ — build_succeeded afspejler det FAKTISKE resultat`,
  { label: 'application', phase: 'Application', schema: BUILD_REPORT_SCHEMA, agentType: 'dotnet-developer' }
)
appReport = await dotnetBuildGate(appReport, 'Application', 'dotnet build src/core/AiSalesCoach.Application/')
if (!appReport.build_succeeded) return failResult('Application', appReport)

// ── Phase 3b: Unit Tests ───────────────────────────────────────────────────
phase('Unit Tests')
let unitTestReport = await agent(
  `Du er tdd-guide for AiSalesCoach. Skriv unit tests for feature: "${feature}".

Application-laget er implementeret. Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave:
- Skriv xUnit unit tests for: ${plan.use_cases.join(', ')}
- Navngivning: MethodName_Scenario_ExpectedResult
- Brug in-memory SQLite (Microsoft.EntityFrameworkCore.InMemory) til repository tests — ALDRIG mock DbContext direkte
- Test minimum 3 scenarier per use case: success-path + validation-failure + edge case (not-found/unauthorized)
- Minimum 80% dækning af de nye Application use cases
- Placér i: tests/AiSalesCoach.Application.Tests/UseCases/<FeatureName>/
- Afslut med: dotnet test tests/AiSalesCoach.Application.Tests/ --collect:"XPlat Code Coverage"
- build_succeeded = true KUN hvis alle tests er grønne. Rapportér dækningsprocent i summary.`,
  { label: 'unit-tests', phase: 'Unit Tests', schema: BUILD_REPORT_SCHEMA, agentType: 'tdd-guide' }
)
unitTestReport = await dotnetBuildGate(unitTestReport, 'Unit Tests', 'dotnet test tests/AiSalesCoach.Application.Tests/')
if (!unitTestReport.build_succeeded) return failResult('Unit Tests', unitTestReport)

// ── Phase 4: Infrastructure ────────────────────────────────────────────────
phase('Infrastructure')
let infraReport = await agent(
  `Du er dotnet-developer for AiSalesCoach. Implementér Infrastructure-laget for feature: "${feature}".

Application og Tests er klar. Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave:
- Implementér: ${plan.infrastructure_components.join(', ')}
- Implementér Domain-interfaces med EF Core/Npgsql
- Registrér alle services i DependencyInjection.cs
${plan.needs_migration
  ? '- Kør: dotnet ef migrations add <Navn> --project src/infrastructure/AiSalesCoach.Infrastructure --startup-project src/api/AiSalesCoach.Api'
  : '- Ingen ny migration nødvendig'}
- Afslut med: dotnet build src/infrastructure/AiSalesCoach.Infrastructure/ — build_succeeded afspejler det FAKTISKE resultat`,
  { label: 'infrastructure', phase: 'Infrastructure', schema: BUILD_REPORT_SCHEMA, agentType: 'dotnet-developer' }
)
infraReport = await dotnetBuildGate(infraReport, 'Infrastructure', 'dotnet build src/infrastructure/AiSalesCoach.Infrastructure/')
if (!infraReport.build_succeeded) return failResult('Infrastructure', infraReport)

// ── Phase 5: Api ───────────────────────────────────────────────────────────
phase('Api')
let apiReport = await agent(
  `Du er dotnet-developer for AiSalesCoach. Implementér Api-laget for feature: "${feature}".

Infrastructure er klar. Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave:
- Endpoints: ${plan.api_endpoints.join(', ')}
- Minimal API: statiske extension methods på RouteGroupBuilder i Endpoints/<Feature>/ — INGEN controllers
- Kun mediator.Send() + Results.* per endpoint, ingen forretningslogik
- RequireAuthorization() på MapGroup — AllowAnonymous() kun på /auth/login og /auth/refresh
- Opdatér docs/api-contracts.md med nye endpoints
- Afslut med: dotnet build src/api/AiSalesCoach.Api/ — build_succeeded afspejler det FAKTISKE resultat`,
  { label: 'api', phase: 'Api', schema: BUILD_REPORT_SCHEMA, agentType: 'dotnet-developer' }
)
apiReport = await dotnetBuildGate(apiReport, 'Api', 'dotnet build src/api/AiSalesCoach.Api/')
if (!apiReport.build_succeeded) return failResult('Api', apiReport)

// ── Phase 5b: Integration Tests ───────────────────────────────────────────
phase('Integration Tests')
let intTestReport = await agent(
  `Du er tdd-guide for AiSalesCoach. Skriv integration tests for feature: "${feature}".

Api-laget er implementeret. Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave:
- Skriv integration tests for hvert endpoint: ${plan.api_endpoints.join(', ')}
- Brug AiSalesCoachWebApplicationFactory fra tests/AiSalesCoach.Api.Tests/Infrastructure/
- Mønster: IClassFixture<AiSalesCoachWebApplicationFactory>, HttpClient fra factory.CreateClient()
- Minimum per endpoint: happy path (200/201) + primær fejlcase (401/400/404)
- Placér i: tests/AiSalesCoach.Api.Tests/Endpoints/<FeatureName>/
- Forudsætning: Testcontainers kræver Docker — kontrollér at Docker kører; hvis ikke, rapportér det i summary og kør kun build
- Afslut med: dotnet build tests/AiSalesCoach.Api.Tests/ — build_succeeded afspejler det FAKTISKE resultat`,
  { label: 'integration-tests', phase: 'Integration Tests', schema: BUILD_REPORT_SCHEMA, agentType: 'tdd-guide' }
)
intTestReport = await dotnetBuildGate(intTestReport, 'Integration Tests', 'dotnet build tests/AiSalesCoach.Api.Tests/')
if (!intTestReport.build_succeeded) return failResult('Integration Tests', intTestReport)

// ── Phase 5c: UI Design (hvis needs_ui_design) ────────────────────────────
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
const clientNames = []

if (needsDesktop && plan.desktop_changes && plan.desktop_changes.length > 0) {
  clientNames.push('desktop')
  clientTasks.push(() => agent(
    `Du er desktop-developer for AiSalesCoach. Implementér Desktop-ændringer for feature: "${feature}".

Contracts og Api er klar. Læs src/core/AiSalesCoach.Contracts/ inden du implementerer API-kald.
Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave: ${plan.desktop_changes.join(', ')}
- CommunityToolkit.Mvvm source generators, compiled XAML bindings
- Desktop kender KUN Contracts + Domain — ikke Infrastructure eller Application
- Afslut med: dotnet build src/clients/AiSalesCoach.Desktop/ — build_succeeded afspejler det FAKTISKE resultat`,
    { label: 'desktop', phase: 'Clients', schema: BUILD_REPORT_SCHEMA, agentType: 'desktop-developer' }
  ))
}

if (needsWeb && plan.web_changes && plan.web_changes.length > 0) {
  clientNames.push('web')
  clientTasks.push(() => agent(
    `Du er react-developer for AiSalesCoach. Implementér Web-ændringer for feature: "${feature}".

Api er klar. Se docs/api-contracts.md for endpoints.
Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave: ${plan.web_changes.join(', ')}
- React 19 + TypeScript strict mode (ingen any)
- React Query til alle API-kald, shadcn/ui + Tailwind
- Zustand til global session-state
- Afslut med typecheck/build (fx npx tsc --noEmit eller npm run build i src/clients/AiSalesCoach.Web) — build_succeeded afspejler det FAKTISKE resultat`,
    { label: 'web', phase: 'Clients', schema: BUILD_REPORT_SCHEMA, agentType: 'react-developer' }
  ))
}

if (needsExtension && plan.extension_changes && plan.extension_changes.length > 0) {
  clientNames.push('extension')
  clientTasks.push(() => agent(
    `Du er extension-developer for AiSalesCoach. Implementér Extension-ændringer for feature: "${feature}".

Api er klar. Implementeringsplan:
${JSON.stringify(plan, null, 2)}

Opgave: ${plan.extension_changes.join(', ')}
- Manifest V3 constraints, service worker lifecycle
- Offscreen documents til audio capture
- Afslut med extension-projektets typecheck/build — build_succeeded afspejler det FAKTISKE resultat`,
    { label: 'extension', phase: 'Clients', schema: BUILD_REPORT_SCHEMA, agentType: 'extension-developer' }
  ))
}

if (clientTasks.length > 0) {
  const clientReports = await parallel(clientTasks)
  for (let i = 0; i < clientReports.length; i++) {
    const r = clientReports[i]
    const name = clientNames[i]
    if (r && r.build_succeeded) continue
    // Én bunden reparationsrunde med samme agent-type
    const fixAgentType = name === 'desktop' ? 'desktop-developer' : (name === 'web' ? 'react-developer' : 'extension-developer')
    log('⛔ Clients/' + name + ': build fejlede — én reparationsrunde med ' + fixAgentType)
    const fixed = await agent(
      `Du er ${fixAgentType} for AiSalesCoach. Klient-implementeringen for "${feature}" (${name}) fejlede sit build.

Fejl:
${((r && r.errors) || ['(intet build-resultat returneret)']).join('\n')}

Ret fejlene med mindst mulige ændring, kør build/typecheck igen, og rapportér ærligt.`,
      { label: name + '-fix', phase: 'Clients', schema: BUILD_REPORT_SCHEMA, agentType: fixAgentType }
    )
    if (!fixed || !fixed.build_succeeded) return failResult('Clients (' + name + ')', fixed || r)
  }
} else {
  log('Ingen client-ændringer i denne feature — Clients-fasen springes over')
}

// ── Phase 7: Verifikation — fuld solution build + test ────────────────────
phase('Verifikation')
async function runFullVerification() {
  return agent(
    `Du er dotnet-build-resolver for AiSalesCoach. Kør fuld verifikation af solutionen efter feature: "${feature}".

1. Kør: dotnet build AiSalesCoach.sln
2. Kør: dotnet test AiSalesCoach.sln
3. Rapportér ÆRLIGT: build_succeeded og tests_succeeded afspejler de faktiske exit codes.
   NU1902-warnings fra Aspire-transitive deps er kendte og acceptable — de tæller ikke som fejl.
4. Hvis tests fejler: list de fejlende tests i failed_tests (fuldt navn).
Du må IKKE rette kode i denne kørsel — kun verificere og rapportere.`,
    { label: 'verify', phase: 'Verifikation', schema: VERIFY_SCHEMA, agentType: 'dotnet-build-resolver' }
  )
}

let verify = await runFullVerification()

if (!verify || !verify.build_succeeded || !verify.tests_succeeded) {
  log('⛔ Verifikation fejlede — én samlet reparationsrunde')
  await agent(
    `Du er dotnet-developer for AiSalesCoach. Den fulde verifikation af feature "${feature}" fejlede.

Resultat:
${JSON.stringify(verify, null, 2)}

Ret fejlene (build-fejl og/eller fejlende tests) med mindst mulige ændring. Ret produktionskoden hvis den er forkert — ret KUN tests hvis testen selv er forkert. Kør dotnet build + dotnet test igen og bekræft grøn.`,
    { label: 'verify-fix', phase: 'Verifikation', schema: BUILD_REPORT_SCHEMA, agentType: 'dotnet-developer' }
  )
  verify = await runFullVerification()
  if (!verify || !verify.build_succeeded || !verify.tests_succeeded) {
    return failResult('Verifikation', { errors: (verify && (verify.errors || verify.failed_tests)) || [], summary: verify ? verify.summary : '' })
  }
}
log('✅ Verifikation grøn: fuld solution bygger og alle tests passerer')

// ── Phase 8: Review parallelt — struktureret findings-output ──────────────
phase('Review')

function reviewerTask(agentType, label, focus) {
  return () => agent(
    `Du er ${agentType} for AiSalesCoach. Review feature "${feature}".
${focus}
Rapportér ALLE fund som strukturerede findings med severity:
- CRITICAL: sikkerhedshul, datatab, arkitektur-violation, compliance-brud
- HIGH: bug der vil ramme produktion, manglende auth, forkert fejlhåndtering
- MEDIUM: vedligeholdelsesproblem, manglende test, afvigelse fra konventioner
- LOW: stil, navngivning, mindre forbedringer
Ingen fund = tom findings-liste. Rapportér KUN reelle fund — ingen spekulative.`,
    { label: label, phase: 'Review', schema: FINDINGS_SCHEMA, agentType: agentType }
  )
}

const reviewerDefs = [
  ['csharp-reviewer', 'csharp', 'Fokus: async/await patterns, nullable reference types, Result<T> brug, CancellationToken, ingen exceptions til flow control. Kør git diff --name-only HEAD og læs de ændrede filer.'],
  ['clean-arch-guardian', 'arch-guardian', 'Fokus: laggrænser. Tjek .csproj-filer: Domain ingen NuGet-deps, Application kender ikke EF Core, Desktop kender ikke Infrastructure. Kør grep-kommandoerne fra .claude/rules/clean-architecture.md.'],
  ['security-reviewer', 'security', 'Fokus: JWT håndtering, Deepgram token-eksponering, input-validering, SQL injection, OWASP Top 10. Kendte risici fra planen: ' + JSON.stringify(plan.risks)],
]

if (plan.needs_compliance_review) {
  reviewerDefs.push(['compliance-specialist', 'compliance', 'Fokus: GDPR samtykke til optagelse, stemmedata som biometrisk data (art. 9), data retention policy, right to erasure. Risici: ' + JSON.stringify(plan.risks)])
}

if (plan.needs_ai_safety_review) {
  reviewerDefs.push(['ai-safety-specialist', 'ai-safety', 'Fokus: prompt injection via audio-input (transcript må ALDRIG i system-prompt), output-validering, hallucination i coaching hints, customer_state validering (max 8KB, max 3 nesting, ingen HTML/script).'])
}

let reviewResults = await parallel(reviewerDefs.map(d => reviewerTask(d[0], d[1], d[2])))

function collectBlocking(results) {
  const blocking = []
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (!r || !r.findings) continue
    for (const f of r.findings) {
      if (f.severity === 'CRITICAL' || f.severity === 'HIGH') {
        blocking.push({ reviewer: reviewerDefs[i] ? reviewerDefs[i][0] : 'unknown', finding: f })
      }
    }
  }
  return blocking
}

let blocking = collectBlocking(reviewResults)
const allFindings = reviewResults.filter(Boolean).flatMap(r => r.findings || [])
log('Review: ' + allFindings.length + ' fund i alt, heraf ' + blocking.length + ' blokerende (CRITICAL/HIGH)')

// ── Phase 9: Fix-loop — én bunden iteration ───────────────────────────────
if (blocking.length > 0) {
  phase('Fix')
  log('Retter ' + blocking.length + ' blokerende fund...')

  function routeFixAgent(file) {
    if (/\.axaml(\.cs)?$/.test(file) || file.includes('AiSalesCoach.Desktop')) return 'desktop-developer'
    if (file.includes('AiSalesCoach.Web') || /\.(tsx|ts)$/.test(file) && !file.includes('extension')) return 'react-developer'
    if (file.includes('extension')) return 'extension-developer'
    return 'dotnet-developer'
  }

  // Gruppér blokerende fund per fix-agent så hver agent får ét samlet kald
  const byAgent = {}
  for (const b of blocking) {
    const a = routeFixAgent(b.finding.file || '')
    if (!byAgent[a]) byAgent[a] = []
    byAgent[a].push(b)
  }

  await parallel(Object.keys(byAgent).map(agentType => () => agent(
    `Du er ${agentType} for AiSalesCoach. Ret disse blokerende review-fund for feature "${feature}".

Fund (fra ${byAgent[agentType].map(b => b.reviewer).join(', ')}):
${JSON.stringify(byAgent[agentType].map(b => b.finding), null, 2)}

Regler:
- Ret KUN de listede fund — ingen scope-udvidelse
- Følg suggested_fix hvor den findes, medmindre den er forkert
- Kør relevant build/test efter rettelserne og bekræft grøn`,
    { label: 'fix-' + agentType, phase: 'Fix', schema: BUILD_REPORT_SCHEMA, agentType: agentType }
  )))

  // Re-review: kun de reviewers der fandt blokerende fund
  const reReviewerNames = [...new Set(blocking.map(b => b.reviewer))]
  const reDefs = reviewerDefs.filter(d => reReviewerNames.includes(d[0]))
  log('Re-review med: ' + reReviewerNames.join(', '))
  const reResults = await parallel(reDefs.map(d => reviewerTask(d[0], d[1], d[2] + '\nDette er et RE-REVIEW efter rettelser — verificér specifikt at de tidligere CRITICAL/HIGH fund er løst.')))

  const stillBlocking = []
  for (let i = 0; i < reResults.length; i++) {
    const r = reResults[i]
    if (!r || !r.findings) continue
    for (const f of r.findings) {
      if (f.severity === 'CRITICAL' || f.severity === 'HIGH') {
        stillBlocking.push({ reviewer: reDefs[i][0], finding: f })
      }
    }
  }

  if (stillBlocking.length > 0) {
    log('🛑 ' + stillBlocking.length + ' blokerende fund består efter fix-runden. Featuren er IKKE done — kræver manuel stillingtagen.')
    return {
      status: 'blocked',
      feature: feature,
      summary: plan.summary,
      blocking_findings: stillBlocking,
      non_blocking_findings: allFindings.filter(f => f.severity === 'MEDIUM' || f.severity === 'LOW'),
    }
  }

  // Rettelserne ændrede kode → verificér igen at hele solutionen stadig er grøn
  phase('Verifikation')
  verify = await runFullVerification()
  if (!verify || !verify.build_succeeded || !verify.tests_succeeded) {
    return failResult('Verifikation efter fix', { errors: (verify && (verify.errors || verify.failed_tests)) || [], summary: verify ? verify.summary : '' })
  }
  log('✅ Solution stadig grøn efter rettelser')
}

// ── Phase 10: Retro ────────────────────────────────────────────────────────
phase('Retro')
log('Opdaterer lessons-learned.md med mønstre fra denne build...')
await workflow('retro', { context: `Feature bygget: "${feature}". Summary: ${plan.summary}. Risks: ${(plan.risks || []).join(', ') || 'none'}.` })

log('✅ Feature done: alle gates grønne (build, tests, review, arkitektur' + (plan.needs_compliance_review ? ', compliance' : '') + (plan.needs_ai_safety_review ? ', ai-safety' : '') + ')')
return {
  status: 'done',
  feature: feature,
  summary: plan.summary,
  gates: {
    build: true,
    tests: true,
    review_blocking_findings: 0,
    compliance_reviewed: !!plan.needs_compliance_review,
    ai_safety_reviewed: !!plan.needs_ai_safety_review,
  },
  non_blocking_findings: allFindings.filter(f => f.severity === 'MEDIUM' || f.severity === 'LOW'),
}
