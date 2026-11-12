import { seal, type SealedRecord } from "./fingerprint";

export const REPORT_TEMPLATES = [
  {
    id: "asset-review",
    name: "Asset review",
    title: "Digital asset review",
    guidance:
      "Document supplied addresses, observed balances, key dates and coverage gaps.",
  },
  {
    id: "financial-evidence",
    name: "Financial evidence",
    title: "Financial evidence report",
    guidance:
      "Document financial observations with references to the original records. Keep interpretation separate.",
  },
  {
    id: "chronology",
    name: "Investigation chronology",
    title: "Investigation chronology",
    guidance:
      "Record dated events and their sources. State what each source establishes and what remains unknown.",
  },
] as const;
export type StudioTemplate = (typeof REPORT_TEMPLATES)[number]["id"];
export type EvidenceSource = {
  id: string;
  title: string;
  reference: string;
  observedAt: string;
  sha256: string;
  note: string;
};
export type StudioFinding = {
  id: string;
  date: string;
  observation: string;
  sourceIds: string[];
};
export type ReportDocument = {
  template: StudioTemplate;
  title: string;
  organization: string;
  accent: string;
  matterReference: string;
  preparedFor: string;
  author: string;
  reviewer: string;
  scope: string;
  methodology: string;
  limitations: string;
  conclusion: string;
  sources: EvidenceSource[];
  findings: StudioFinding[];
  checks: { sources: boolean; limitations: boolean; conclusions: boolean };
};
export function newDocument(): ReportDocument {
  return {
    template: "asset-review",
    title: "Digital asset review",
    organization: "",
    accent: "#244c45",
    matterReference: "",
    preparedFor: "",
    author: "",
    reviewer: "",
    scope: "",
    methodology: "",
    limitations: "",
    conclusion: "",
    sources: [],
    findings: [],
    checks: { sources: false, limitations: false, conclusions: false },
  };
}
const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
export function parseDocument(input: unknown): ReportDocument {
  if (!input || typeof input !== "object")
    throw new Error("Expected a report document");
  const d = input as Record<string, unknown>;
  const template = REPORT_TEMPLATES.find((t) => t.id === d.template)?.id;
  if (!template) throw new Error("Choose a supported template");
  if (
    !Array.isArray(d.sources) ||
    !Array.isArray(d.findings) ||
    d.sources.length > 100 ||
    d.findings.length > 200
  )
    throw new Error("Limit reports to 100 sources and 200 findings");
  const sources = d.sources.map((value): EvidenceSource => {
    if (!value || typeof value !== "object") throw new Error("Invalid source");
    const s = value as Record<string, unknown>;
    const reference = text(s.reference, 2000);
    if (reference) {
      let url: URL;
      try {
        url = new URL(reference);
      } catch {
        throw new Error("Source links must be complete HTTPS URLs");
      }
      if (url.protocol !== "https:" || url.username || url.password)
        throw new Error("Source links must use HTTPS without credentials");
    }
    const sha256 = text(s.sha256, 64).toLowerCase();
    if (sha256 && !/^[a-f0-9]{64}$/.test(sha256))
      throw new Error("File fingerprint must be 64 hexadecimal characters");
    return {
      id: text(s.id, 80),
      title: text(s.title, 200),
      reference,
      sha256,
      observedAt: text(s.observedAt, 40),
      note: text(s.note, 2000),
    };
  });
  const ids = sources.map((s) => s.id);
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length)
    throw new Error("Source identifiers must be unique");
  const findings = d.findings.map((value): StudioFinding => {
    if (!value || typeof value !== "object") throw new Error("Invalid finding");
    const f = value as Record<string, unknown>;
    if (!Array.isArray(f.sourceIds))
      throw new Error("Finding citations must be an array");
    const refs = [...new Set(f.sourceIds.map((id) => text(id, 80)))];
    if (refs.some((id) => !ids.includes(id)))
      throw new Error("A finding cites a missing source");
    return {
      id: text(f.id, 80),
      date: text(f.date, 10),
      observation: text(f.observation, 6000),
      sourceIds: refs,
    };
  });
  if (
    findings.some((f) => !f.id) ||
    new Set(findings.map((f) => f.id)).size !== findings.length
  )
    throw new Error("Finding identifiers must be unique");
  const checks = (d.checks ?? {}) as Record<string, unknown>;
  return {
    template,
    title: text(d.title, 200),
    organization: text(d.organization, 120),
    accent: /^#[a-f0-9]{6}$/i.test(String(d.accent))
      ? String(d.accent)
      : "#244c45",
    matterReference: text(d.matterReference, 120),
    preparedFor: text(d.preparedFor, 200),
    author: text(d.author, 120),
    reviewer: text(d.reviewer, 120),
    scope: text(d.scope, 8000),
    methodology: text(d.methodology, 8000),
    limitations: text(d.limitations, 8000),
    conclusion: text(d.conclusion, 8000),
    sources,
    findings,
    checks: {
      sources: checks.sources === true,
      limitations: checks.limitations === true,
      conclusions: checks.conclusions === true,
    },
  };
}
export function publicationIssues(d: ReportDocument): string[] {
  const issues: string[] = [];
  for (const field of [
    "title",
    "organization",
    "matterReference",
    "preparedFor",
    "author",
    "reviewer",
    "scope",
    "methodology",
    "limitations",
    "conclusion",
  ] as const)
    if (!d[field].trim()) issues.push(`Complete ${field}`);
  if (d.author.trim().toLowerCase() === d.reviewer.trim().toLowerCase())
    issues.push("Name a reviewer distinct from the author");
  if (!d.sources.length) issues.push("Add at least one evidence source");
  for (const s of d.sources) {
    if (
      !s.title ||
      (!s.reference && !s.sha256) ||
      !s.observedAt ||
      !Number.isFinite(Date.parse(s.observedAt))
    )
      issues.push(
        `Source ${s.id}: title, source link or file hash, and valid observation date required`,
      );
  }
  if (
    !d.findings.length ||
    d.findings.some((f) => !f.observation || !f.sourceIds.length)
  )
    issues.push(
      "Every finding needs an observation and at least one source citation",
    );
  if (!Object.values(d.checks).every(Boolean))
    issues.push("Complete all three review checks");
  return issues;
}
export async function sealDocument(
  input: unknown,
  revision: number,
): Promise<
  SealedRecord<{
    format: string;
    revision: number;
    issuedAt: string;
    document: ReportDocument;
    reviewIdentity: string;
    integrityNote: string;
  }>
> {
  const document = parseDocument(input);
  const issues = publicationIssues(document);
  if (issues.length) throw new Error(issues.join(". "));
  if (!Number.isSafeInteger(revision) || revision < 1)
    throw new Error("Invalid revision");
  return seal({
    format: "TraceSworn Report Studio v1",
    revision,
    issuedAt: new Date().toISOString(),
    document,
    reviewIdentity:
      "Author and reviewer names are operator declarations, not authenticated signatures.",
    integrityNote:
      "The fingerprint detects changes to this record. It does not prove source authenticity, accuracy, ownership or legal admissibility.",
  });
}

/** Validate downloaded records before accepting them into the case archive. */
export async function validateIssuedRecord(input: unknown) {
  const { verifySealed, canonical } = await import("./fingerprint");
  const checked = await verifySealed(input);
  if (!checked.ok) throw new Error("The record fingerprint does not match");
  const issued = input as Awaited<ReturnType<typeof sealDocument>>;
  if (
    issued.fingerprint.algorithm !== "SHA-256" ||
    issued.fingerprint.canonicalization !== "sorted-keys-json"
  )
    throw new Error("Unsupported fingerprint format");
  if (
    issued.record.format !== "TraceSworn Report Studio v1" ||
    !Number.isSafeInteger(issued.record.revision) ||
    issued.record.revision < 1 ||
    !Number.isFinite(Date.parse(issued.record.issuedAt))
  )
    throw new Error("Unsupported issued report");
  const document = parseDocument(issued.record.document);
  if (canonical(document) !== canonical(issued.record.document))
    throw new Error("The document contains unsupported or invalid fields");
  const issues = publicationIssues(document);
  if (issues.length) throw new Error(issues.join(". "));
  return issued;
}
