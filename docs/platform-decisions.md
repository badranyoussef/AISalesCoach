# AiSalesCoach — Platformsbeslutninger

Disse spørgsmål skal besvares inden den tekniske opbygning kan færdiggøres.
Svarene bestemmer hele platformens struktur og er svære at ændre bagefter.

---

## 1. Hvem er kunden?

**1.1** Sælger vi til **enkeltpersoner** (én sælger køber adgang til sig selv), **teams** (en salgschef køber adgang til sit team) eller **virksomheder** (IT/ledelse køber adgang til hele salgsafdelingen)?

**1.2** Kan det være alle tre — dvs. en enkeltperson kan starte alene og senere invitere kolleger ind?

**1.3** Hvad kalder vi den primære enhed? Eksempler:
- "Organisation" (Salesforce-model)
- "Workspace" (Notion/Slack-model)
- "Team" (simpel model)

---

## 2. Organisationsstruktur

**2.1** Er der ét niveau (virksomhed → brugere) eller to niveauer (virksomhed → teams → brugere)?

Eksempel på to niveauer: Acme A/S har "Team DK" og "Team SE" — hvert team har sine egne frameworks og opkald, men betaler under samme virksomhedskonto.

**2.2** Skal en sælger kunne være medlem af **flere** virksomheder/workspaces med ét login? Fx en freelance-konsulent der coacher hos to kunder.

**2.3** Skal en salgschef kunne administrere **flere** teams under samme konto?

---

## 3. Roller og adgang

**3.1** Hvilke roller skal eksistere? Eksempler:
- **Ejer**: den der betaler og har fuld adgang
- **Admin**: kan administrere brugere og frameworks, men betaler ikke
- **Sælger**: kan kun se sine egne opkald og hints
- **Salgschef**: kan se alle sælgeres opkald i sit team

Er disse fire dækkende, eller mangler der roller?

**3.2** Skal en **salgschef** kunne se en sælgers live session i realtid (mens opkaldet pågår)?

**3.3** Skal en salgschef kunne se **alle** sælgeres historiske opkald, eller kun dem i sit eget team?

**3.4** Skal der være en platform-administratorrolle (os — til support og fejlfinding)?

---

## 4. Frameworks og projekter

**4.1** Hvad er et "projekt" præcis i jeres forretningsmodel? Eksempler:
- Et **produkt** man sælger (fx "Enterprise-produkt" vs. "SMB-produkt" med forskellig salgstilgang)
- Et **team** eller **afdeling**
- En **kampagne** eller **kvartal**
- Noget helt andet?

**4.2** Er frameworks (salgsmetodologi + regler) delt på tværs af **hele virksomheden**, eller kan hvert team have sit eget framework?

**4.3** Skal det være muligt at bruge et **standardframework** (fx en SPIN-skabelon vi leverer) som udgangspunkt, som kunden derefter tilpasser?

**4.4** Skal frameworks kunne **deles** mellem virksomheder — fx hvis to kunder vil bruge samme metodologi?

---

## 5. Sessioner og opkald

**5.1** Ejer en session **sælgeren** eller **virksomheden**? Dvs.: hvis en sælger forlader virksomheden, hvem ejer så optagelserne?

**5.2** Skal det være muligt at **uploade** en lydfil fra et opkald der ikke blev optaget live (fx et Zoom-opkald der allerede er sket)?

**5.3** Skal coaching-hints vises for **én sælger ad gangen**, eller kan to sælgere dele et opkald (fx et demo-opkald med sælger + salgsspecialist)?

---

## 6. Analyse og rapportering

**6.1** Skal salgschefer have et **team-dashboard** med aggregerede tal — fx "Teamets gennemsnitlige coverage-score denne uge"?

**6.2** Skal salgschefer kunne **sammenligne sælgere** — fx se en rangliste over hvem der scorer højest på "Lukning"?

**6.3** Skal individuelle sælgere kunne se **deres egne** fremskridt over tid — fx "Din discovery-score er steget 15% den seneste måned"?

**6.4** Skal der være en **rapport der kan eksporteres** (PDF/CSV) — fx til en ugentlig team-briefing?

---

## 7. Deals og pipeline

**7.1** Skal der være en **deal pipeline** (ligesom et mini-CRM) inde i produktet, eller er det meningen at produktet skal integrere med et eksisterende CRM (HubSpot, Salesforce etc.)?

**7.2** Hvis der er en pipeline: er deals knyttet til **sælgeren**, **teamet** eller **virksomheden**?

**7.3** Skal et opkald kunne kobles til et specifikt deal — fx "Dette opkald var med Acme A/S, deal-stadie: Proposal"?

---

## 8. Abonnement og betaling

**8.1** Hvad er betalingsmodellen?
- Per **sæde/bruger** per måned
- Per **virksomhed** (fast pris uanset antal brugere)
- Per **opkald/session** (forbrugsbaseret)
- Hybrid (fx: basis per virksomhed + ekstra per bruger over X)

**8.2** Skal der være en **gratis prøveperiode** eller **freemium-plan**? Hvis ja — hvad er begrænsningerne?

**8.3** Skal der være **feature-forskel** mellem abonnementsplaner? Fx: Gratis = ingen teamfunktioner, Pro = op til 5 sælgere, Enterprise = ubegrænset + SSO.

---

## 9. Data, GDPR og compliance

**9.1** I hvilke **lande** forventes produktet primært brugt? (Danmark, Norden, resten af EU, USA?)

**9.2** Skal data ligge på **EU-servere** (krav fra mange danske virksomheder)?

**9.3** Skal brugere kunne **eksportere alle deres data** (GDPR ret til dataportabilitet)?

**9.4** Skal brugere/virksomheder kunne **slette alle deres data** (GDPR ret til sletning)?

**9.5** Hvad skal gemmes, og hvad må slettes?
- Rå lydfil fra opkaldet
- Transskription (tekst)
- Coaching hints der blev vist
- Analyse-resultater

**9.6** Skal deltageren i et opkald (kunden/prospektet) **informeres og give samtykke** inden optagelse starter — eller er det sælgerens/virksomhedens ansvar at indhente samtykke udenfor produktet?

---

## 10. Login og adgangsstyring

**10.1** Skal det være muligt at logge ind med **Google eller Microsoft-konto** (SSO) — i stedet for email + kodeord?

**10.2** Skal virksomheder kunne tilslutte deres eget **Active Directory / Azure AD** (enterprise SSO)?

**10.3** Skal der være **to-faktor autentificering (2FA)**?

---

## 11. Fremtid og integrationer

**11.1** Skal der på sigt være en **API** som kunder kan bruge til at trække data ud til deres egne systemer?

**11.2** Skal der være **webhooks** — fx "send en notifikation til vores Slack når en analyse er færdig"?

**11.3** Skal der være en **white-label mulighed** — dvs. at en partner kan sælge produktet under sit eget navn og logo?

**11.4** Er der specifikke **CRM-integrationer** der er vigtige fra start (HubSpot, Salesforce, Pipedrive)?

---

## Prioritering

Disse spørgsmål **skal besvares inden vi kan bygge videre** (blokerer databasedesign):
- 1.1, 1.2, 1.3 — hvem er kunden
- 2.1, 2.2 — organisationsstruktur
- 3.1 — roller
- 4.1, 4.2 — hvad er et projekt
- 5.1 — ejerskab af sessioner

Disse kan besvares **undervejs** (blokerer ikke den første build):
- 6, 7, 8, 10, 11

Disse skal besvares **inden produktet tages i brug af rigtige kunder**:
- 9 (GDPR) — men compliance-krav til samtykke (9.6) skal på plads inden første optagelse
