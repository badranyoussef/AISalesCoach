# AiSalesCoach — Tilladelser og hooks

Oversigt over alle tilladelser og automatiske hooks konfigureret i `.claude/`.

---

## Tilladelser (`settings.local.json`)

### .NET / dotnet CLI

| Tilladelse | Beskrivelse |
|-----------|-------------|
| `dotnet build*` | Byg hele solutionen eller enkeltprojekter |
| `dotnet test*` | Kør test-suite med valgfrie flags (coverage, filter, osv.) |
| `dotnet run*` | Start API eller Desktop lokalt |
| `dotnet restore*` | Gendan NuGet-pakker |
| `dotnet format*` | Formatér C#-kode |
| `dotnet new*` | Opret nye projekter og filer fra skabeloner |
| `dotnet add*` | Tilføj NuGet-pakker eller projektreference |
| `dotnet sln*` | Administrér solution-filen |
| `dotnet ef*` | EF Core migrations og database-opdateringer |
| `dotnet --version` | Tjek installeret .NET-version |
| `dotnet --list-sdks` | List installerede .NET SDKs |

### Git

| Tilladelse | Beskrivelse |
|-----------|-------------|
| `git status` | Vis arbejdstræets status |
| `git diff*` | Vis diff (staged, unstaged, mellem commits) |
| `git log*` | Vis commit-historik |
| `git branch*` | List og administrér branches |
| `git stash list` | Vis gemte stashes |
| `git add *` | Stage filer til commit |

> **Bemærk:** `git commit*` er IKKE i allow-listen — det kræver altid manuel godkendelse og trigger pre-commit hook.

### Node.js / npm

| Tilladelse | Beskrivelse |
|-----------|-------------|
| `npm run*` | Kør scripts fra package.json (dev, build, test, typecheck) |
| `npm install*` | Installér pakker |
| `npm ci` | Clean install fra package-lock.json |
| `npx*` | Kør npm-pakker direkte (prettier, eslint, osv.) |

### Filsystem

| Tilladelse | Beskrivelse |
|-----------|-------------|
| `find . *` | Søg i projektmappen |
| `find /Users/youssef.badran/Dev/AiSalesCoach*` | Søg med absolut sti |
| `ls*` | List filer og mapper |
| `cat*` | Læs filindhold til terminal |
| `wc*` | Tæl linjer/ord/tegn |
| `open *` | Åbn filer eller URLs i macOS |
| `Read(/Users/youssef.badran/.claude/**)` | Læs Claude-konfigurationsfiler på tværs af projekter |

### Hooks og scripts

| Tilladelse | Beskrivelse |
|-----------|-------------|
| `chmod +x .../pre-commit-check.py` | Gør pre-commit hook eksekverbar |
| `python3 .../pre-commit-check.py` | Kør arkitektur-check manuelt |

---

## Automatiske hooks (`settings.json`)

### PreToolUse — kører inden et tool

| Trigger | Script | Effekt |
|---------|--------|--------|
| `Bash` (alle shell-kald) | `hooks/pre-commit-check.py` | Scriptet filtrerer selv: kun kommandoer der indeholder `git commit` udløser scanningen (hook-matchere kan kun matche tool-NAVNE, ikke kommando-indhold). Scanner kodebasen for Clean Architecture violations. **Exit 2 blokerer committet** hvis violations findes i Domain, Application eller Desktop. Alle andre Bash-kald passerer uberørt (exit 0). |

> **Historik**: En PostToolUse-hook (`check-read-token.py`) tjekkede tidligere subagent-svar for et read-token. Fjernet 2026-06-11 sammen med FILETOKEN-systemet — tokenværdien stod hardcodet i agent-prompterne og beviste derfor intet. Se `docs/how-the-setup-works.md` § 6.

---

## Hvad der IKKE er tilladt uden godkendelse

- `git commit` — kræver godkendelse + klarer pre-commit hook
- `git push` — kræver altid eksplicit godkendelse
- `git reset --hard` / `git checkout .` — destruktive operationer, aldrig auto-tilladt
- `rm -rf` — aldrig tilladt
- `dotnet ef database drop` — aldrig tilladt
