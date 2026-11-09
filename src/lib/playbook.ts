// The operating playbook: every stage of a matter, what to do, and exactly what to say.
// Written for professional clients (attorneys, fiduciaries, trustees) in estate, divorce and bankruptcy matters.
// Placeholders: {{name}}, {{first}}, {{package}}, {{price}}, {{portal}}, {{pay}}, {{you}}.

export type StageId =
  | "new"
  | "contacted"
  | "engaged"
  | "authority"
  | "discovery"
  | "findings"
  | "claims"
  | "recovered"
  | "closed"
  | "declined";

export type Stage = {
  id: StageId;
  name: string;
  goal: string;
  checklist: string[];
  say: string; // call script
  email: { subject: string; body: string };
  avoid: string[];
  followupDays: number | null;
};

export const STAGES: Stage[] = [
  {
    id: "new",
    name: "New matter",
    goal: "Respond within one business day and book a 15-minute scoping call.",
    checklist: [
      "Read the intake: matter type, valuation date, what's known or suspected, records available",
      "Call if a number was given; otherwise send the email below",
      "Log the attempt in the notes",
    ],
    say: `Hi {{first}}, this is {{you}} from TraceSworn, following up on the matter you opened.

I'd like 15 minutes to scope it: what's known or suspected about the crypto, which records you have (bank statements, tax returns, emails, devices), the valuation date, and who we'd be acting for. Then I can give you a fixed fee in writing. Is now a good time?

(Voicemail) Hi {{first}}, {{you}} from TraceSworn returning your request. I've emailed a secure link for the matter and some times for a short scoping call. Talk soon.`,
    email: {
      subject: "Your TraceSworn matter: scoping call",
      body: `Hi {{first}},

Thank you for opening a matter with TraceSworn.

A 15-minute scoping call lets me confirm the valuation date, the records available and who we act for, and then quote a fixed fee in writing. Reply with a good time, or call me.

Secure matter page: {{portal}}
Your client can run the statement and document scans there. Files are read on their own device and only the findings (exchange names and addresses) are sent.

Please don't send passwords, private keys or recovery phrases by email.

{{you}}
TraceSworn`,
    },
    avoid: ["Quoting before scoping", "Promising what an exchange will produce", "Asking for keys or recovery phrases"],
    followupDays: 2,
  },
  {
    id: "contacted",
    name: "Scoped",
    goal: "Confirm scope, valuation date(s) and client, and recommend one fixed-fee package.",
    checklist: [
      "Matter type and valuation date(s): death, separation, trial or petition",
      "Who we act for, and any opposing party or counsel",
      "Records available: statements (which banks, which years), tax returns, emails, devices, wallet keys",
      "Deadline: inventory due date, disclosure deadline, hearing date",
      "Recommend one package and send the payment link",
    ],
    say: `To confirm scope: (matter type), valued as of (date), acting for (client). Records: (list).

What TraceSworn will deliver: every exchange and wallet we can trace from those records, every address read on the public ledger and valued on (date), and a sealed record with a SHA-256 fingerprint so the other side can verify nothing was changed.

What it won't show: balances inside exchange accounts are private, so for each exchange we find we'll draft the records request or claim for you to send.

For this I'd recommend {{package}} at {{price}}, a fixed fee and never a percentage. I can send the engagement letter and payment link today.`,
    email: {
      subject: "TraceSworn scope and fixed fee: {{package}}",
      body: `Hi {{first}},

Thank you for the call. To confirm:

Package: {{package}}, {{price}} (fixed fee, never a percentage of the estate, settlement or recovery)
Payment link: {{pay}}

On payment I'll send the engagement letter confirming scope, valuation date and turnaround.

Matter page: {{portal}}

{{you}}
TraceSworn`,
    },
    avoid: ["Giving legal or tax advice. Defer to counsel", "Estimating values before discovery", "Fees tied to amounts found"],
    followupDays: 3,
  },
  {
    id: "engaged",
    name: "Engaged and paid",
    goal: "Engagement letter signed, payment received, records requested.",
    checklist: [
      "Confirm payment in /admin (the Stripe webhook marks it paid)",
      "Send the engagement letter: scope, fee, valuation date(s), read-only and no-custody terms",
      "Request records: statements for the agreed period, tax returns, wallet public keys, device access arrangements",
    ],
    say: `Thanks, {{first}}. Next steps: I'll send the engagement letter today. Please send the bank and card statements for (period), any tax returns showing crypto, and any wallet public keys. For devices, we'll agree how they're preserved and examined; nothing gets reset or updated in the meantime.`,
    email: {
      subject: "TraceSworn engagement and records request",
      body: `Hi {{first}},

Your matter is confirmed. To begin discovery, please provide through the matter page or by reply:

1. Bank and card statements for the agreed period (CSV exports are best; PDFs are fine)
2. Any tax returns or exchange 1099s mentioning digital assets
3. Any wallet public keys (xpub/zpub) or addresses known
4. Proof of authority where relevant (court letters, order or engagement by counsel)

Devices should be preserved, powered off and unchanged.

Matter page: {{portal}}

{{you}}
TraceSworn`,
    },
    avoid: ["Starting work before authority and scope are in writing"],
    followupDays: 4,
  },
  {
    id: "authority",
    name: "Authority confirmed",
    goal: "Confirm who we act for and that they may instruct us on these assets.",
    checklist: [
      "Estate: letters testamentary/administration or attorney engagement",
      "Divorce/bankruptcy: engagement by counsel or trustee; note any protective order",
      "Record any limits on scope or confidentiality",
    ],
    say: `Thanks, {{first}}. The documents are in order, so discovery starts now. I'll update the matter page as findings come in.`,
    email: {
      subject: "Authority confirmed: discovery under way",
      body: `Hi {{first}},

Thank you. Authority is confirmed and discovery is under way. Progress will be on the matter page: {{portal}}

{{you}}
TraceSworn`,
    },
    avoid: ["Acting where authority or a protective order is unclear. Ask counsel first"],
    followupDays: null,
  },
  {
    id: "discovery",
    name: "Discovery",
    goal: "Trace every exchange, wallet and address, then read and value them.",
    checklist: [
      "Run the statement scan on every statement provided",
      "Run the document scan; scan any wallet keys",
      "Press 'Run analysis' to read every address and value it on the agreed date(s)",
      "Draft exchange records requests or claims for each exchange found",
    ],
    say: `Update for {{first}}: so far the statements show transfers to (exchanges), and we've read (n) addresses. The full sealed report will be with you by (date).`,
    email: {
      subject: "Discovery update",
      body: `Hi {{first}},

A short update: discovery is under way. The sealed findings report will follow with every holding, its value on the agreed date and the source of every figure.

Matter page: {{portal}}

{{you}}
TraceSworn`,
    },
    avoid: ["Sharing partial numbers as final", "Filling gaps with estimates"],
    followupDays: 5,
  },
  {
    id: "findings",
    name: "Findings delivered",
    goal: "Deliver the sealed report and walk counsel through it.",
    checklist: [
      "Review every row; edit the summary; approve and publish to the matter page",
      "Download the sealed record and keep the fingerprint in the notes",
      "Walk counsel through what's proven, what needs exchange records, and the limits",
    ],
    say: `The sealed report is on the matter page. In short: (total) across (n) holdings as of (date). (Exchanges) need records requests; the drafts are ready for you to send.

The record's SHA-256 fingerprint is (first 8 characters). If anyone challenges a figure, they can verify the record themselves at tracesworn.com/verify.`,
    email: {
      subject: "Sealed findings report",
      body: `Hi {{first}},

The findings report is on the matter page: {{portal}}

It lists every holding traced, its balance and value on the agreed date, and the public source of each figure. The downloadable record is sealed with a SHA-256 fingerprint that anyone, including opposing counsel or the court, can verify at /verify.

Draft exchange requests are ready for your review. Happy to walk you through it on a call.

{{you}}
TraceSworn`,
    },
    avoid: ["Characterising intent (e.g. 'hidden') in the report; state facts and sources only"],
    followupDays: 3,
  },
  {
    id: "claims",
    name: "Exchange requests out",
    goal: "Get every exchange to produce records or release assets.",
    checklist: [
      "Counsel sends each request or subpoena; record reference numbers in the notes",
      "Follow up with each exchange every 7 days",
      "Add produced statements to the matter and re-run the analysis",
    ],
    say: `Weekly update, {{first}}: (exchange A) acknowledged and is processing; (exchange B) asked for (item). Nothing needed from you this week.`,
    email: {
      subject: "Weekly update on exchange requests",
      body: `Hi {{first}},

This week's status on the exchange requests:

(status for each exchange)

Nothing is needed from you right now.

{{you}}
TraceSworn`,
    },
    avoid: ["Contacting an exchange other than through its official channels or as counsel directs"],
    followupDays: 7,
  },
  {
    id: "recovered",
    name: "Records produced",
    goal: "Fold produced exchange records into a final sealed report.",
    checklist: [
      "Confirm with counsel which records were produced and where assets were transferred",
      "Re-run analysis and issue the final sealed report",
      "Return or securely destroy materials as agreed",
    ],
    say: `{{first}}, (exchange) has produced its records. I'll issue the final sealed report including them by (date).`,
    email: {
      subject: "Exchange records received: final report next",
      body: `Hi {{first}},

The exchange records have been produced. I'm preparing the final sealed report now and will send it shortly.

{{you}}
TraceSworn`,
    },
    avoid: ["Ever receiving client assets into our own accounts"],
    followupDays: 3,
  },
  {
    id: "closed",
    name: "Closed",
    goal: "Deliver the final record, close cleanly, and ask for a referral.",
    checklist: [
      "Final sealed report delivered; fingerprint recorded",
      "Materials returned or destroyed as agreed",
      "Ask whether colleagues handle matters with crypto, and mention the Firm Plan",
    ],
    say: `Thank you, {{first}}. Everything is delivered and the final record is sealed. If colleagues in your firm see crypto in their matters, I'd be grateful for an introduction. The Firm Plan includes two reports a month.`,
    email: {
      subject: "Matter closed: final sealed record",
      body: `Hi {{first}},

The matter is complete. The final sealed record is on the matter page: {{portal}}

If colleagues see crypto in their matters, I'd be grateful for an introduction. The Firm Plan covers two reports a month at a fixed fee.

Thank you.

{{you}}
TraceSworn`,
    },
    avoid: [],
    followupDays: null,
  },
  {
    id: "declined",
    name: "Declined",
    goal: "Close clearly when the records can't support a finding or it isn't a fit.",
    checklist: ["Explain why plainly", "Point to the free tools", "Refund anything owed"],
    say: `{{first}}, having looked at the records, I don't think we can trace anything reliable here. (Reason.) I won't charge for work that can't produce evidence. If new records turn up, statements, a device or a wallet key, I'm glad to look again.`,
    email: {
      subject: "About your matter",
      body: `Hi {{first}},

Thank you for the opportunity. Having reviewed the records, I don't believe they can support a reliable finding, and I won't charge for work that can't produce evidence.

If further records become available, please get in touch. The free tools on our site remain available.

{{you}}
TraceSworn`,
    },
    avoid: ["Leaving the client without a clear answer"],
    followupDays: null,
  },
];

export const STAGE_IDS = STAGES.map((s) => s.id);

export function stage(id: string | null | undefined): Stage {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}

/** Straight answers to the questions attorneys and fiduciaries ask most. */
export const OBJECTIONS: { q: string; a: string }[] = [
  {
    q: "Will this hold up if it's challenged?",
    a: "Every figure names its public source and the time it was read, and the record is sealed with a SHA-256 fingerprint. The other side can re-read the same addresses and recompute the fingerprint themselves. Testimony arrangements are agreed separately.",
  },
  {
    q: "Can you see what's in the exchange account?",
    a: "No one can from public data. We identify which exchanges were used and draft the records request or claim for you to send; the exchange produces the balance.",
  },
  {
    q: "A forensic accountant quoted us far more. What's the catch?",
    a: "No catch: the tracing and reading are done in software, so the work is faster and the fee is fixed. Where a matter needs more, such as contested tracing or many parties, the Complex Matter package covers it.",
  },
  {
    q: "Why not a percentage?",
    a: "So no one can say we had a stake in the number. The fee is the same whatever we find.",
  },
  {
    q: "Do you need the private keys?",
    a: "Never. Public addresses and hardware-wallet public keys are enough to trace and value. Any device work happens offline with proper authority.",
  },
  {
    q: "How fast?",
    a: "Usually 5-10 business days for a Discovery Report once records are in; rush delivery in 5 business days is available.",
  },
];

export function fill(text: string, v: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ?? `{{${k}}}`);
}
