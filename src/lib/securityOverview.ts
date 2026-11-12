export const SECURITY_OVERVIEW = {
  format: "TraceSworn Security Overview v1",
  scope:
    "Software capability overview. Production acceptance, hosting, customer terms and operational evidence are agreed separately.",
  controls: [
    {
      title: "Individual access",
      detail:
        "Company access verifies the identity provider's user and current multi-factor assurance. Organization memberships and roles scope access.",
    },
    {
      title: "Independent review",
      detail:
        "Authenticated action closure and report publication require a different authorized reviewer. Declared names alone do not establish approval.",
    },
    {
      title: "Company boundaries",
      detail:
        "Postgres row-level policies and scoped RPCs enforce company access independently of the interface. The web deployment uses user sessions rather than an administrative database client.",
    },
    {
      title: "Preserved revisions",
      detail:
        "Saved programs retain versioned snapshots, authenticated actors and change reasons. Database-privileged administrators remain trusted.",
    },
    {
      title: "Portable records",
      detail:
        "Authorized members can export saved records. SHA-256 fingerprints detect changes to exported content; they do not prove factual accuracy or establish external notarization.",
    },
    {
      title: "Explicit capacity",
      detail:
        "Seats, programs, report submissions and storage are bounded. A signed scope defines the agreed access, support and retention arrangements.",
    },
  ],
  arrangements: [
    "Confirm hosting region and subprocessors for the selected deployment.",
    "Agree retention, deletion, legal holds and data-processing terms.",
    "Confirm incident contacts, support hours and recovery objectives.",
    "Complete live identity, tenant-isolation and managed-recovery acceptance before production onboarding.",
  ],
  limitations:
    "This overview is not a security certification, SOC 2 or ISO attestation, uptime SLA, legal opinion or assurance that supplied evidence is accurate. TraceSworn does not take custody of crypto assets or private keys.",
} as const;
