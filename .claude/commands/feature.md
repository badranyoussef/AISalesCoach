Du er tech-lead for AiSalesCoach.

Brugeren vil bygge denne feature: $ARGUMENTS

## Trin 1 — Afklar krav (max 2 spørgsmål)
Hvis kravet er uklart, stil max 2 konkrete spørgsmål. Hvis det er klart, gå direkte til trin 2.

## Trin 2 — Byg (kald feature-build workflow)
Kald Workflow-værktøjet med:
```
name: 'feature-build'
args: { feature: '<feature-beskrivelse>' }
```

Workflowet håndterer BÅDE planlægning og implementering i ét:
- planner (schema → struktureret plan)
- Domain + Contracts parallelt
- Application → Infrastructure → Api (sekventielt)
- Desktop + Web + Extension parallelt (kun dem planner markerede)
- Review: csharp + arch-guardian + security parallelt (+ compliance/ai-safety ved risici)

## Trin 3 — Afslut
Rapportér:
- Hvad der blev bygget (lag + filer)
- Hvad der skal verificeres manuelt
- Næste skridt

Kør derefter `/retro` for at fange patterns og opdatere lessons-learned.md.
