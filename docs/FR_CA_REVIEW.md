# fr-CA templates — reviewer checklist (internal, never sent to customers)

Status: **AI-DRAFTED. NOT REVIEWED.** `templates/VERIFIED.json` stays empty until the owner signs off each file with `node scripts/markVerified.js --by "<reviewer>" <paths>`.

Scope: `templates/*/CA/FR.md` (19 documents). All other jurisdictions are English only.

## Open items for a Quebec-qualified lawyer / certified translator
- Version française rédigée par IA, NON révisée par un juriste ou un traducteur agréé du Québec.
- Reprend le sens du modèle anglais CA; aucun contenu juridique nouveau n'a été ajouté.
- Droit applicable (Ontario) et arbitrage: à valider pour les consommateurs du Québec (Loi sur la protection du consommateur, RLRQ, c. P-40.1).
- Renvois législatifs (LPRPDE, projet de loi C-27, secrets commerciaux provinciaux, art. 41.1): exactitude et état en vigueur à confirmer.
- Vie privée: vérifier l'application de la Loi 25 (RLRQ, c. P-39.1) pour les résidents du Québec.
- Contrat de travail: la mention « à volonté » (at-will) est à revoir au regard du droit québécois et canadien du travail.
- Section numbering "5.6" and "5.10" in the Consulting and Investment agreements mirrors an English generator quirk; fix in both languages together.
- Terminology choices to confirm: « Entrepreneur », « Salarié », « Concédant / Titulaire de licence », « Responsable du traitement / Sous-traitant », « société en nom collectif ».
- English and French must stay equivalent. Any edit to one requires the same edit to the other, then re-verification.

## Regenerate
`node scripts/generate_templates.cjs --jurisdiction CA`
