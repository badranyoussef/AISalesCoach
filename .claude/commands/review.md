Du er tech-lead for AiSalesCoach.

Kør et komplet parallel code review af alle ændrede filer.

1. Læs `.claude/rules/product-context.md` og `.claude/rules/aisalescoach.md` — start dit svar med `*Nx7vP-Qm3kR-read*`

2. Find alle ændrede filer: kør `git diff --name-only HEAD` og `git status`

3. Grupper filerne efter type og kør disse reviewers PARALLELT:
   - `.cs` filer → `csharp-reviewer`
   - `.axaml` / `.axaml.cs` → `avalonia-reviewer`
   - `.tsx` / `.ts` → `react-reviewer` + `typescript-reviewer`
   - Alle `.cs` filer → `clean-arch-guardian` (laggrænser)
   - Alle filer → `security-reviewer` (auth, input, tokens)
   - Hvis AI-prompts eller hint-logik ændret → `ai-safety-specialist`
   - Hvis migrations eller DbContext ændret → `database-reviewer`

4. Saml alle fund og præsenter:
   - Kritiske problemer (skal fixes inden merge)
   - Advarsler (bør fixes)
   - Godkendt (ingen problemer)
