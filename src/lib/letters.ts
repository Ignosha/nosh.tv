// Shared deceased-account letter text, used by the letter tool and the case pipeline.
export const REQUESTS = {
  transfer: "transfer all assets held in the account to an account in the name of the estate",
  liquidate: "liquidate the assets in the account and remit the proceeds to the estate's bank account",
  statement: "provide a statement of the account's holdings and their value as of the date of death",
} as const;

export type LetterFields = {
  exchange: string;
  decedent: string;
  dod: string; // YYYY-MM-DD or ""
  accountEmail?: string;
  accountId?: string;
  rep: string;
  role: string;
  repEmail?: string;
  repPhone?: string;
  repAddress?: string;
  court?: string;
  caseNo?: string;
  request: keyof typeof REQUESTS;
  docs: string[];
};

const long = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export function buildLetter(f: LetterFields): string {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const dod = f.dod ? long(f.dod) : "[date of death]";
  const decedent = f.decedent || "[full legal name of the deceased]";
  const req = REQUESTS[f.request];
  return `${today}

To: ${f.exchange || "[Exchange name]"} — Deceased Account / Estate Services Team

Re: Request regarding the account of ${decedent}, deceased ${dod}
${f.accountEmail ? `Account email: ${f.accountEmail}\n` : ""}${f.accountId ? `Account or user ID: ${f.accountId}\n` : ""}
To whom it may concern,

I am writing as the ${f.role.toLowerCase()} of the estate of ${decedent}, who passed away on ${dod}.${f.court ? ` My authority was granted by the ${f.court}${f.caseNo ? `, case number ${f.caseNo}` : ""}.` : ""} I believe the deceased held an account with ${f.exchange || "[Exchange name]"}.

On behalf of the estate, I respectfully request that you:

1. Confirm whether an account exists in the name of the deceased${f.accountEmail ? ` or under the email ${f.accountEmail}` : ""};
2. Restrict the account to prevent any further access or withdrawals; and
3. ${req.charAt(0).toUpperCase() + req.slice(1)}, following your deceased-account procedure.

Please also provide a statement of the account's holdings as of ${dod}, which the estate needs for valuation.

Enclosed are:
${f.docs.map((d) => `  • ${d}`).join("\n") || "  • [list of enclosed documents]"}

Please tell me if you require any further documents or a specific form. I can be reached at the contact details below.

Sincerely,

${f.rep || "[Your full name]"}
${f.role}, Estate of ${decedent}
${f.repEmail || "[email]"}${f.repPhone ? ` · ${f.repPhone}` : ""}
${f.repAddress || "[mailing address]"}`;
}
