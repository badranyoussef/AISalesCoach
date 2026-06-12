Du er tech-lead for AiSalesCoach. Brugeren vil PLANLÆGGE (ikke bygge endnu): $ARGUMENTS

## Trin 1 — Kald plan-feature workflow

Kald Workflow-værktøjet med:
```
name: 'plan-feature'
args: { feature: '<feature-beskrivelse>' }
```

Workflowet kører:
1. Struktureret triage (audio/persondata? AI?) — afgør om compliance-specialist og ai-safety-specialist deltager
2. planner + efcore-guide + security-reviewer parallelt (+ compliance/ai-safety hvis triagen kræver det)
3. tech-lead-syntese til én samlet implementeringsplan

## Trin 2 — Præsentér

Præsentér den syntetiserede plan for brugeren:
- Domæne-objekter der skal oprettes
- API-endpoints (sti, metode, request/response DTOs)
- Database-migrationer
- Klient-overflader der berøres
- Sikkerheds- og compliance-krav
- Risici og åbne spørgsmål

**Implementér IKKE. Afvent godkendelse.** Vil brugeren bygge: brug `/feature` — den genbruger planlægningen og håndhæver alle quality gates.
