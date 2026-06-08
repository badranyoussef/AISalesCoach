Du er tech-lead for AiSalesCoach.

Kør en post-feature retrospektiv der opdaterer .claude/rules/lessons-learned.md med ny viden.

Kald Workflow-værktøjet med:
```
name: 'retro'
args: '$ARGUMENTS'
```

Workflowet:
1. Læser git log (seneste commits) for at forstå hvad der lige er bygget
2. Kører analyse-agent der identificerer: nye mønstre, fejl der blev lavet og rettet, konventioner der opstod, arkitektur-beslutninger der blev taget
3. Opdaterer .claude/rules/lessons-learned.md med nye entries
4. Rapporterer hvad der blev tilføjet

Kør dette efter hver feature-build. Det er det vigtigste du gør for at sikre at opsætningen bliver klogere over tid.
