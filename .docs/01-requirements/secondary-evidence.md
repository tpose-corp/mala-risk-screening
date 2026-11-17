# SECONDARY evidence: is the problem real?

**Label: SECONDARY.** The team has 1 formal real-user interview (INT-01), 2 hospital documents
(DOC-01, DOC-02) and 1 real-user test session with 5 users (S01, 17 Nov 2026). The pain itself
comes mostly from 1 interview, fewer than the 5 the course asks for, so this file adds published evidence. It supports the problem; it
does not replace talking to รพ.สต. staff.

Sources were found with web search on 18 Nov 2026. Read the full papers before quoting exact
figures in a report; some numbers below come from abstracts.

## 1. MALA is rare but often deadly

| Source | What it says |
|---|---|
| StatPearls, "Metformin-Associated Lactic Acidosis (MALA)", NCBI Bookshelf: https://www.ncbi.nlm.nih.gov/books/NBK580485/ (PubMed https://pubmed.ncbi.nlm.nih.gov/35593810/) | Mortality up to 50 percent; worse with deeper acidosis and higher lactate |
| Critical Care review (2010), "Outcome of severe lactic acidosis associated with metformin accumulation": https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3220003/ | Mortality reported at 30 to 50 percent |
| PLOS ONE (2022), "Metformin-associated lactic acidosis and factors associated with 30-day mortality": https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9426915/ | 105 patients, 30-day mortality 36.2 percent; early dialysis linked to lower mortality |

**Proves:** the 30 to 50 percent figure on slide 2 has a published source, and fast referral
matters (early treatment lowers deaths). **Does not prove:** how many MALA cases happen in
Chiang Rai. That number comes only from the hospital's own review (DOC-01, 58 percent from
primary-care units).

## 2. The dose rules depend on kidney function (eGFR)

| Source | What it says |
|---|---|
| US FDA Drug Safety Communication, 8 Apr 2016: https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-fda-revises-warnings-regarding-use-diabetes-medicine-metformin-certain | Metformin is contraindicated below eGFR 30; starting it at eGFR 30 to 45 is not recommended; reassess when eGFR falls below 45 |

**Proves:** the eGFR cut-offs 30 and 45 in the hospital's outline (DOC-02) match a public
regulator's guidance. **Does not prove:** the exact Thai dose limits (2000 mg and 1000 mg per
day). Those come from the hospital's CPG table and stay the hospital's decision.

## 3. Front-line prescribing often does not follow kidney-based rules

| Source | What it says |
|---|---|
| Wood et al., British Journal of General Practice (2018), 70,900 patients in 70 UK general practices: https://eprints.whiterose.ac.uk/133425/ | Prescribing advice for reduced kidney function was often not applied, even when an eGFR was on record |
| Australian general practice study, Primary Care Diabetes (2019), 9,624 people with type 2 diabetes (summary via https://www.ausdoc.com.au/news/diabetes-prescribing-odds-guidelines-study/) | Metformin had the most prescriptions not matching guidelines, mostly at eGFR 30 to 59 |

**Proves:** the pain INT-01 described (front-line staff judging risk without a standard tool)
also happens in other countries' primary care. **Does not prove:** the rate at Thai รพ.สต.;
those studies are UK and Australian general practices with doctors, not Thai health workers.

## 4. Rule-based checks can help

| Source | What it says |
|---|---|
| Tawadrous et al., "Use of clinical decision support systems for kidney-related drug prescribing: a systematic review", American Journal of Kidney Diseases (2011), PubMed 21944664: https://pubmed.ncbi.nlm.nih.gov/21944664/ | 32 studies; all 11 computerised systems that measured prescribing reported a significant improvement in appropriate dosing; patient outcomes improved in only 2 of 7 |

**Proves:** a deterministic check of dose against kidney function is a reasonable design.
**Does not prove:** that MALA Screening itself improves dosing or saves lives. That needs the
real-user test in `test/no-real-user-test.md` and, later, hospital outcome data.

## How this links to the backlog

| Evidence | Backlog link |
|---|---|
| 1 | Problem overview in `backlog.md`; PBI-08 (fast alert to the hospital) |
| 2 | PBI-06 rule engine, Part 1 (dose vs eGFR) |
| 3 | Epic C pain source (staff need a guided form, not personal judgement) |
| 4 | PBI-06 is plain rules, not AI |
