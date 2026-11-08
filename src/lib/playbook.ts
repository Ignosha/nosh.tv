// The operating playbook: every stage of a case, what to do, and exactly what to say.
// Placeholders in scripts and emails: {{name}}, {{first}}, {{package}}, {{price}}, {{portal}}, {{pay}}, {{you}}.

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
  followupDays: number | null; // automatic reminder cadence while a case sits in this stage
};

export const STAGES: Stage[] = [
  {
    id: "new",
    name: "New request",
    goal: "Reach the family within one business day, by phone if they gave a number.",
    checklist: [
      "Read what they wrote: date of death, what they know, devices, court letters",
      "Call first; if no answer, leave the voicemail below and send the email",
      "Log the attempt in the case notes",
    ],
    say: `Hi {{first}}, this is {{you}} from Kin Ledger. You reached out about crypto your family member may have left. First, I'm sorry for your loss.

I'd like to ask a few quick questions so I can tell you honestly what's possible and what isn't. Is now a good time? It takes about ten minutes.

(Voicemail) Hi {{first}}, it's {{you}} from Kin Ledger, returning your request about the crypto. There's no rush and no cost to talk. I've also sent you an email with a private link to your case page. Please don't send any passwords or recovery phrases by email or text. Talk soon.`,
    email: {
      subject: "Your Kin Ledger case: next steps",
      body: `Hi {{first}},

Thank you for reaching out, and I'm sorry for your loss.

I've opened a private page for your case: {{portal}}

When you have a moment, you can run the free estate scan there. It reads emails, statements and notes on your own computer (nothing is uploaded) and sends us only the exchanges and wallet addresses it finds.

I'd also like to have a short call to understand the situation. Just reply with a good time, or call me back.

One important thing: never send passwords or recovery phrases to anyone, including us. Legitimate help never needs them by email or text.

Warmly,
{{you}}
Kin Ledger`,
    },
    avoid: [
      "Promising a result before you know what exists",
      "Asking for a recovery phrase, password or private key",
      "Quoting a price before you understand the case",
    ],
    followupDays: 2,
  },
  {
    id: "contacted",
    name: "First call done",
    goal: "Understand the situation, explain honestly what's possible, and recommend one package.",
    checklist: [
      "Ask: who has legal authority (executor), and are court letters issued?",
      "Ask: which exchanges, apps or devices do they know about?",
      "Ask: is there a hardware wallet, a notebook, or a written phrase anywhere?",
      "Explain the realistic outcome (see the honest-answers list)",
      "Recommend one package and send the payment link",
    ],
    say: `Here's what I'm hearing: (summarize what they told you).

The honest picture: exchange accounts can almost always be claimed by the executor, it just takes paperwork and patience. A self-custody wallet depends on whether we can find the device, a backup, or part of the recovery phrase. If the phrase is completely gone and there's no device, nobody can open it, and I won't take your money for that.

For a situation like yours I'd recommend {{package}}. It's a fixed price, {{price}}, agreed in writing before we start. We never take a percentage of the estate. That covers (list what's included).

Does that sound right for you? I can send the engagement letter and payment link today.`,
    email: {
      subject: "Your Kin Ledger recommendation: {{package}}",
      body: `Hi {{first}},

Thank you for talking with me today. Here's what we discussed.

Recommended: {{package}}, {{price}} fixed. No percentage of the estate, ever.

Payment link: {{pay}}

Once that's done, I'll send the engagement letter and the short list of documents we need (death certificate and court letters, or a letter from your attorney).

Your private case page: {{portal}}

Any questions, just reply.

{{you}}
Kin Ledger`,
    },
    avoid: [
      "Guaranteeing recovery of self-custody wallets",
      "Giving legal or tax advice (say: 'that's a question for your attorney')",
      "Pressuring them to decide on the call",
    ],
    followupDays: 3,
  },
  {
    id: "engaged",
    name: "Engaged and paid",
    goal: "Engagement letter signed, payment received, documents requested.",
    checklist: [
      "Confirm payment shows in /admin (the Stripe webhook marks it paid)",
      "Send the engagement letter: scope, fixed price, no custody, no phrase online",
      "Request documents: death certificate, court letters or attorney letter, executor ID",
    ],
    say: `Thank you, {{first}}. You're all set. Here's what happens next:

1. I'll email the engagement letter. It confirms the fixed price and that we never hold the estate's funds.
2. I need three documents: the death certificate, the court letters naming the executor (or a letter from your attorney), and the executor's photo ID.
3. Meanwhile, please keep any phones, computers or hardware wallets turned off and exactly as they are.`,
    email: {
      subject: "Welcome to Kin Ledger: what we need from you",
      body: `Hi {{first}},

Thank you. Your case is confirmed.

To get started, please send these through your case page or reply to this email:
1. A copy of the death certificate
2. The court letters naming the executor (or a letter from the estate's attorney)
3. A photo ID for the executor

Please keep any phones, computers or hardware wallets turned off and unchanged until we speak. Don't reset or update them.

Case page: {{portal}}

{{you}}
Kin Ledger`,
    },
    avoid: ["Starting recovery work before authority is confirmed"],
    followupDays: 4,
  },
  {
    id: "authority",
    name: "Authority verified",
    goal: "Confirm the person you're helping is legally entitled to act for the estate.",
    checklist: [
      "Death certificate received",
      "Court letters (or attorney letter / small-estate affidavit) received and names match",
      "Executor ID matches the letters",
      "Note any limits in the letters",
    ],
    say: `Thank you for the documents, {{first}}. Everything matches, so we can act on behalf of the estate now. Next I'll start the discovery: going through what you've sent and reading every address on the public ledger.`,
    email: {
      subject: "Documents received: discovery is starting",
      body: `Hi {{first}},

Thank you. The documents check out, and discovery is starting now.

I'll update your case page as I go: {{portal}}

{{you}}
Kin Ledger`,
    },
    avoid: ["Proceeding if names don't match. Ask for corrected documents"],
    followupDays: null,
  },
  {
    id: "discovery",
    name: "Discovery",
    goal: "Find every exchange, wallet and address, and read them on the ledger.",
    checklist: [
      "Run the estate scan on documents (or check the family's portal findings)",
      "Scan any hardware wallet xpub/zpub with the wallet-key tool",
      "Press 'Run analysis' on the case page to read every address and value it",
      "Draft exchange letters for every exchange found",
    ],
    say: `Quick update, {{first}}: I'm partway through. So far I've found (exchanges / wallets). I'll have the full findings report to you by (date).`,
    email: {
      subject: "Discovery update on your case",
      body: `Hi {{first}},

A quick update: discovery is underway. I'll send the full findings report soon, with every balance and the value on the date of death, each with its public source.

Case page: {{portal}}

{{you}}
Kin Ledger`,
    },
    avoid: ["Sharing partial numbers as final", "Estimating values that weren't read"],
    followupDays: 5,
  },
  {
    id: "findings",
    name: "Findings delivered",
    goal: "Walk the family through what exists, what can be reached, and what it was worth.",
    checklist: [
      "Approve the report on the case page so it appears in their portal",
      "Schedule a findings call (include the attorney if they want)",
      "Explain each item: reachable, needs a claim, or not recoverable",
    ],
    say: `I've finished the findings, {{first}}. Here's the summary: (total found, where it is).

Some of this we can reach: (exchange accounts, wallets with devices).
(If any) Some of it, honestly, we can't: (reason). I'm sorry. I'd rather tell you straight than give false hope.

The full report with sources is on your case page now. Your attorney can use it for the estate. Next, I'll file the exchange claims.`,
    email: {
      subject: "Your findings report is ready",
      body: `Hi {{first}},

Your findings report is ready on your case page: {{portal}}

It lists every holding we found, the balance on the date of death and today, and the public source for every figure. Your attorney and accountant can rely on it.

I'd like to walk you through it. Reply with a good time for a call.

{{you}}
Kin Ledger`,
    },
    avoid: ["Delivering bad news only by email. Call first"],
    followupDays: 3,
  },
  {
    id: "claims",
    name: "Claims filed",
    goal: "File every exchange claim and keep them moving until resolved.",
    checklist: [
      "Send each exchange letter through the exchange's official help center",
      "Record each exchange's ticket or case number in the notes",
      "Follow up with each exchange every 7 days",
      "Update the family weekly, even if nothing changed",
    ],
    say: `Weekly update, {{first}}: (exchange A) has acknowledged the claim and is reviewing. (Exchange B) asked for (document). Nothing is needed from you this week. These usually take several weeks, so no news is normal.`,
    email: {
      subject: "Weekly update on your exchange claims",
      body: `Hi {{first}},

Here's this week's update on the exchange claims:

(status for each exchange)

Nothing is needed from you right now. Exchange reviews usually take several weeks, so a quiet week is normal.

Case page: {{portal}}

{{you}}
Kin Ledger`,
    },
    avoid: ["Contacting exchanges through anything but their official channels"],
    followupDays: 7,
  },
  {
    id: "recovered",
    name: "Recovered",
    goal: "Confirm assets reached the estate's own account or wallet, never yours.",
    checklist: [
      "Confirm with the executor that funds arrived in the estate's account",
      "Read final balances and prepare the close-out valuation",
      "Securely return or destroy anything you were given",
    ],
    say: `Good news, {{first}}: (exchange) has released the funds to the estate's account. Please confirm you can see them. I'll prepare the final valuation file for your attorney.`,
    email: {
      subject: "Funds released to the estate",
      body: `Hi {{first}},

Good news: the funds have been released to the estate's account. Please confirm you can see them.

I'm preparing the final valuation file for your attorney and accountant.

{{you}}
Kin Ledger`,
    },
    avoid: ["Ever receiving estate funds into your own account"],
    followupDays: 3,
  },
  {
    id: "closed",
    name: "Closed",
    goal: "Deliver the close-out file and ask for a testimonial and referral.",
    checklist: [
      "Send the final valuation and evidence file",
      "Confirm disposal of any copies or devices",
      "Ask for a short testimonial and if they know an attorney who'd benefit",
    ],
    say: `Thank you for trusting us, {{first}}. Everything is wrapped up and the final file is on your case page.

If we helped, a few sentences about your experience would mean a lot. It helps other families trust us. And if your attorney found this useful, I'd be grateful for an introduction.`,
    email: {
      subject: "Your case is complete. Thank you",
      body: `Hi {{first}},

Your case is complete. The final valuation and evidence file is on your case page: {{portal}}

If we helped, would you share a few sentences about your experience? Just reply to this email. It helps other families trust us.

Thank you again.

{{you}}
Kin Ledger`,
    },
    avoid: [],
    followupDays: null,
  },
  {
    id: "declined",
    name: "Declined",
    goal: "Close kindly when there's nothing recoverable or it isn't a fit.",
    checklist: ["Explain why, kindly and plainly", "Point them to the free tools", "Refund anything owed"],
    say: `{{first}}, I've looked carefully, and I don't think we can recover this. (Reason: e.g. the phrase is fully lost and there's no device.) I'm not going to charge you for work that can't succeed. If anything new turns up, a device or a note, please come back to me.`,
    email: {
      subject: "About your case",
      body: `Hi {{first}},

Thank you for trusting us with this. After looking carefully, I don't believe we can recover these assets, and I won't charge you for work that can't succeed.

If anything new turns up, like a device, a notebook or a backup, please reach out again. The free tools on our site are always available.

I'm sorry it isn't better news.

{{you}}
Kin Ledger`,
    },
    avoid: ["Leaving them without a clear answer"],
    followupDays: null,
  },
];

export const STAGE_IDS = STAGES.map((s) => s.id);

export function stage(id: string | null | undefined): Stage {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}

/** Honest answers to the questions families and attorneys ask most. */
export const OBJECTIONS: { q: string; a: string }[] = [
  {
    q: "Why should I trust you?",
    a: "That's the right question. We never ask for recovery phrases online, we never hold the estate's money, and every price is agreed in writing before we start. You can check every number in our report yourself; each one names its public source.",
  },
  {
    q: "That's expensive.",
    a: "I understand. It's a fixed price because the work is the same whether a wallet holds $5,000 or $500,000, and we never take a percentage. If the estate is small, the free tools may be enough, and I'll tell you honestly if that's the case.",
  },
  {
    q: "Can you guarantee you'll recover it?",
    a: "No one honest can. Exchange accounts are very likely to be claimable with the right paperwork. Self-custody wallets depend on finding a device, a backup or part of the phrase. I'll tell you where you stand after discovery, before any recovery work.",
  },
  {
    q: "Can I just send you the recovery phrase?",
    a: "Please don't send it to anyone by email, text or form, including us. If a phrase is needed, we handle it offline, in person or on the estate's own device.",
  },
  {
    q: "Do I need a lawyer?",
    a: "Exchanges need proof you can act for the estate, usually court letters. Most families work with an estate attorney. We're happy to work alongside yours. We don't give legal advice ourselves.",
  },
  {
    q: "How long will it take?",
    a: "Discovery and the findings report usually take one to three weeks. Exchange claims depend on the exchange and commonly take several weeks to a few months.",
  },
];

export function fill(text: string, v: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ?? `{{${k}}}`);
}
