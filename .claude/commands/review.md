Du er tech-lead for AiSalesCoach.

Kør et komplet parallel code review af alle ændrede filer.

## Trin 1 — Kald review workflow

Kald Workflow-værktøjet med:
```
name: 'review'
args: { scope: '<valgfrit scope, ellers alle aktuelle ændringer>' }
```

Workflowet:
1. Detekterer ændrede filer (git diff + git status) og sætter strukturerede flags
2. Kører alle relevante reviewers parallelt:
   - `.cs` → csharp-reviewer + clean-arch-guardian + security-reviewer
   - `.axaml` / `.axaml.cs` → avalonia-reviewer
   - `.tsx` / `.ts` → react-reviewer + typescript-reviewer
   - Migrations/DbContext → database-reviewer
   - AI-prompts/hint-logik → ai-safety-specialist

## Trin 2 — Saml og præsentér

Saml alle fund og præsentér efter severity:
- **CRITICAL/HIGH** — skal fixes inden merge (bloker featuren indtil løst)
- **MEDIUM** — bør fixes
- **LOW** — valgfrit
- **Godkendt** — ingen problemer

Tilbyd at rette CRITICAL/HIGH fund med det samme via den relevante developer-agent.
