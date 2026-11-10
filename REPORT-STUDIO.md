# Report Studio: higher-value software features

The software pilot is separate from investigation services. Proposed prices are $199/month for an individual and $499/month for a practice; these are pricing hypotheses, not enabled subscriptions or verified willingness to pay.

## Working preview

Open `/report-builder`. No Supabase, AI provider or email credentials are needed. Original files stay local; only their SHA-256 fingerprints enter the report. Reports support:

- Organization name, cover information and accent color.
- Three starting templates: asset review, financial evidence, investigation chronology.
- Source registry with references, observation dates, file fingerprints and notes.
- Findings linked to supporting sources, with explicit scope, methodology, limitations and conclusion.
- Three review checks and distinct declared author/reviewer names before issuance.
- Downloadable drafts, reimport as reusable templates, printable PDF layouts and sealed issued JSON.
- Issued version history for the current browser session, preserving older content when the draft changes.

Nothing is saved automatically. Download drafts and issued files before closing or refreshing the page. Imported issued records must match their fingerprint; imports return to draft with review checks cleared. Content edits also clear checks. This is not a multi-user collaboration system: author and reviewer names are operator declarations, not authenticated signatures.

## Case-linked archive

Apply `supabase/schema.sql`, configure Supabase and `ADMIN_PASSWORD`, and open a matter's **Issued report archive** link. Upload an issued Report Studio JSON smaller than 900 KB. Confirm it belongs to the selected matter. The server verifies its fingerprint, validates the document and review requirements, then archives it through a service-role-only function.

Archive numbering is local to each case and may differ from the revision number in an imported document. Duplicate fingerprints return the existing archive version. Case row locking serializes archive numbering; update/delete triggers preserve issued versions, and every new archive creates a case event. The archive is append-only at the application/database-trigger level, not external notarization or protection against a privileged database administrator. Existing cases cannot be deleted while archive references exist without an intentional retention workflow.

Each version has a printable page and JSON download. The archive renders stored records without rereading live balances. It is restricted to the existing administrator workspace, not accessible through client bearer links and not automatically emailed or published to clients.

## Product boundary

Practice pricing proposes managed archive access in a pilot deployment. Self-service subscriptions, payment entitlements, separate user accounts, seat limits, organization isolation, authenticated reviewer signatures, live collaboration and automatic client delivery are not implemented. Do not sell those capabilities as existing features. The browser preview remains free and unmetered while the pilot is validated.

Report fingerprints establish whether exported content changed. They do not establish source authenticity, factual accuracy, chain of custody, ownership or legal admissibility.

## Validation

`npm test` covers issuance requirements, missing citations, unsafe links, exact fingerprint verification, tampering, snapshot independence, and database archive numbering, deduplication and update/delete rejection. Run `npm run typecheck` and `npm run build`. Chromium acceptance verifies drafting, local hashing, citations, review gates, issuance/download, print output and invalidation after edits. Production Supabase and client onboarding still require a configured deployment and acceptance checks.

To rerun browser acceptance, start the app with `npm start`, install Chromium with `npx playwright install chromium` if needed, then run `npm run test:browser`. Set `REPORT_STUDIO_URL` to a different local origin, `BROWSER_EXECUTABLE` to a system Chromium path, or `REPORT_STUDIO_ARTIFACTS` to an output directory as needed. Tests use clearly labeled fictional data.
