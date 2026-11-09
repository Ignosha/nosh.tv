// Client finder: professional prospects from free public sources.
//  1. OpenStreetMap (Overpass API, Nominatim fallback): law offices in a city, with website/phone/email tags.
//  2. CourtListener (Free Law Project): court opinions and dockets that mention crypto in estate, divorce or
//     bankruptcy matters, with the counsel named on them. Needs a free API token (COURTLISTENER_TOKEN).
//  3. The firm's own website: public contact email, phone and practice areas.
// Every lead keeps where it came from. Nothing is invented: a field we could not find stays empty.

export type Segment = "estate" | "divorce" | "bankruptcy";

export type LeadDraft = {
  source: "osm" | "courtlistener" | "import";
  source_ref: string | null;
  name: string | null;
  firm: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  segment: Segment;
  practice: string[];
  evidence: string | null;
  score: number;
};

const UA = { "User-Agent": "TraceSworn-finder/1.0 (+https://tracesworn.com)", Accept: "application/json" };

async function json<T>(url: string, init?: RequestInit, timeout = 25000): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...UA, ...(init?.headers ?? {}) }, cache: "no-store", signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`${new URL(url).host} replied ${res.status}`);
  return (await res.json()) as T;
}

// ---------- practice detection ----------

const PRACTICE: { tag: string; segment: Segment | null; re: RegExp }[] = [
  { tag: "probate", segment: "estate", re: /\bprobate\b/i },
  { tag: "estate planning", segment: "estate", re: /\bestate (planning|administration|litigation)\b|\bwills?\b.{0,20}\btrusts?\b/i },
  { tag: "trusts", segment: "estate", re: /\btrust (administration|litigation)\b|\btrustees?\b|\bfiduciar(y|ies)\b/i },
  { tag: "elder law", segment: "estate", re: /\belder law\b|\bguardianship\b/i },
  { tag: "family law", segment: "divorce", re: /\bfamily law\b|\bmatrimonial\b/i },
  { tag: "divorce", segment: "divorce", re: /\bdivorce\b|\bdissolution of marriage\b|\bequitable distribution\b/i },
  { tag: "bankruptcy", segment: "bankruptcy", re: /\bbankruptcy\b|\bchapter (7|11|13)\b|\bdebtor\b/i },
  { tag: "crypto", segment: null, re: /\bcrypto(currency|currencies)?\b|\bbitcoin\b|\bdigital assets?\b|\bblockchain\b/i },
  { tag: "personal injury", segment: null, re: /\bpersonal injury\b|\bcar accident\b|\bauto accident\b|\bslip and fall\b/i },
  { tag: "criminal", segment: null, re: /\bcriminal defen[cs]e\b|\bdui\b/i },
  { tag: "immigration", segment: null, re: /\bimmigration\b/i },
];

export function detectPractice(text: string): string[] {
  return PRACTICE.filter((p) => p.re.test(text)).map((p) => p.tag);
}

export function segmentOf(practice: string[], fallback: Segment = "estate"): Segment {
  const counts: Record<Segment, number> = { estate: 0, divorce: 0, bankruptcy: 0 };
  for (const t of practice) {
    const p = PRACTICE.find((x) => x.tag === t);
    if (p?.segment) counts[p.segment]++;
  }
  const best = (Object.entries(counts) as [Segment, number][]).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : fallback;
}

/** 0–100. Fit with the work (estate, family, bankruptcy), crypto signals, court evidence, and a way to reach them. */
export function scoreLead(l: Pick<LeadDraft, "practice" | "email" | "phone" | "source" | "evidence">): number {
  let s = 0;
  const p = new Set(l.practice);
  if (p.has("probate") || p.has("estate planning") || p.has("trusts")) s += 30;
  if (p.has("family law") || p.has("divorce")) s += 30;
  if (p.has("bankruptcy")) s += 25;
  if (p.has("elder law")) s += 10;
  if (p.has("crypto")) s += 20;
  if (l.source === "courtlistener") s += 30; // already handled a matter with crypto in it
  if (l.email) s += 15;
  else if (l.phone) s += 5;
  const fit = ["probate", "estate planning", "trusts", "family law", "divorce", "bankruptcy", "elder law"].some((t) => p.has(t));
  if (!fit && (p.has("personal injury") || p.has("criminal") || p.has("immigration"))) s -= 40;
  return Math.max(0, Math.min(100, s));
}

// ---------- website enrichment ----------

const BAD_EMAIL = /(example\.|sentry|wixpress|godaddy|domain\.com|email\.com|yourdomain|\.png|\.jpg|\.gif|\.webp|\.svg|@2x|noreply|no-reply|^you@|^name@|^user@|^your|^email@|^info@example)/i;

export function extractEmails(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/mailto:([^"'?\s>]+)/gi)) found.add(decodeURIComponent(m[1]).toLowerCase());
  for (const m of html.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}\b/gi)) found.add(m[0].toLowerCase());
  return [...found].filter((e) => !BAD_EMAIL.test(e) && e.length < 80);
}

function extractPhone(html: string): string | null {
  const tel = html.match(/tel:([+\d().\s-]{10,20})/i);
  if (tel) return tel[1].trim();
  const m = html.replace(/<[^>]+>/g, " ").match(/\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/);
  return m ? m[0] : null;
}

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;/g, " ")
    .replace(/\s+/g, " ");

async function page(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA["User-Agent"], Accept: "text/html" }, redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(9000) });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
    const body = await res.text();
    return body.slice(0, 600_000);
  } catch {
    return null;
  }
}

/** Reads the firm's home page, then its contact/about pages until an email turns up. */
export async function enrichWebsite(website: string): Promise<{ emails: string[]; phone: string | null; practice: string[]; title: string | null; reachable: boolean }> {
  let base: URL;
  try {
    base = new URL(/^https?:\/\//i.test(website) ? website : "https://" + website);
  } catch {
    return { emails: [], phone: null, practice: [], title: null, reachable: false };
  }
  const home = await page(base.toString());
  if (!home) return { emails: [], phone: null, practice: [], title: null, reachable: false };
  let emails = extractEmails(home);
  let phone = extractPhone(home);
  let all = text(home);
  const title = home.match(/<title[^>]*>([^<]{2,120})<\/title>/i)?.[1]?.trim() ?? null;
  // Follow the site's own contact/about/practice links (same host only).
  const links = [...home.matchAll(/href=["']([^"'#]+)["']/gi)]
    .map((m) => {
      try {
        return new URL(m[1], base);
      } catch {
        return null;
      }
    })
    .filter((u): u is URL => !!u && u.host === base.host && /contact|about|practice|team|attorney|people/i.test(u.pathname))
    .map((u) => u.toString());
  const candidates = [...new Set([...links, new URL("/contact", base).toString(), new URL("/contact-us", base).toString()])].slice(0, 4);
  for (const url of candidates) {
    const html = await page(url);
    if (!html) continue;
    emails = [...new Set([...emails, ...extractEmails(html)])];
    phone ??= extractPhone(html);
    all += " " + text(html);
    if (emails.length && all.length > 4000) break;
  }
  // Prefer an address on the firm's own domain.
  const host = base.host.replace(/^www\./, "");
  emails.sort((a, b) => Number(b.endsWith("@" + host)) - Number(a.endsWith("@" + host)));
  return { emails: emails.slice(0, 5), phone, practice: detectPractice(all), title, reachable: true };
}

// ---------- OpenStreetMap ----------

type OsmEl = { type: string; id: number; tags?: Record<string, string> };

export async function geocode(city: string, state: string): Promise<[number, number, number, number] | null> {
  const q = new URLSearchParams({ city, state, country: "United States", format: "json", limit: "1" });
  const r = await json<{ boundingbox: string[] }[]>(`https://nominatim.openstreetmap.org/search?${q}`).catch(() => []);
  if (!r.length) return null;
  const [s, n, w, e] = r[0].boundingbox.map(Number);
  return [s, w, n, e];
}

export async function osmLawyers(city: string, state: string): Promise<{ leads: LeadDraft[]; source: string }> {
  const bbox = await geocode(city, state);
  if (!bbox) throw new Error(`Could not find ${city}, ${state} on OpenStreetMap.`);
  let els: OsmEl[] = [];
  let source = "";
  const q = `[out:json][timeout:25];(nwr["office"="lawyer"](${bbox.join(",")});nwr["amenity"="lawyer"](${bbox.join(",")}););out tags 400;`;
  for (const server of ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]) {
    try {
      const r = await json<{ elements: OsmEl[] }>(server, { method: "POST", body: new URLSearchParams({ data: q }), headers: { "Content-Type": "application/x-www-form-urlencoded" } }, 40000);
      els = r.elements;
      source = `OpenStreetMap via Overpass API (${new URL(server).host})`;
      break;
    } catch {
      // try the next public server
    }
  }
  if (!els.length) {
    source = "OpenStreetMap via Nominatim (Overpass was unavailable)";
    const vb = `${bbox[1]},${bbox[2]},${bbox[3]},${bbox[0]}`;
    const r = await json<{ osm_type: string; osm_id: number; name: string; extratags?: Record<string, string> }[]>(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent("[lawyer]")}&format=jsonv2&extratags=1&limit=40&bounded=1&viewbox=${vb}`,
    ).catch(() => []);
    els = r.map((x) => ({ type: x.osm_type, id: x.osm_id, tags: { name: x.name, ...(x.extratags ?? {}) } }));
  }
  const leads: LeadDraft[] = [];
  for (const el of els) {
    const t = el.tags ?? {};
    if (!t.name) continue;
    const website = t.website || t["contact:website"] || t.url || null;
    const email = (t.email || t["contact:email"] || "").toLowerCase() || null;
    const practice = detectPractice([t.name, t.description ?? "", t["lawyer"] ?? ""].join(" "));
    const lead: LeadDraft = {
      source: "osm",
      source_ref: `${el.type}/${el.id}`,
      name: null,
      firm: t.name,
      email: email && !BAD_EMAIL.test(email) ? email : null,
      phone: t.phone || t["contact:phone"] || null,
      website,
      city: t["addr:city"] || city,
      state: t["addr:state"] || state,
      segment: segmentOf(practice),
      practice,
      evidence: `Listed as a law office on OpenStreetMap (${el.type}/${el.id}).`,
      score: 0,
    };
    lead.score = scoreLead(lead);
    leads.push(lead);
  }
  return { leads, source };
}

// ---------- CourtListener ----------

export const COURT_QUERIES: Record<Segment, string> = {
  estate: '(cryptocurrency OR bitcoin OR "digital assets") AND (probate OR "personal representative" OR executor OR decedent)',
  divorce: '(cryptocurrency OR bitcoin OR "digital assets") AND ("dissolution of marriage" OR divorce OR "marital estate" OR "equitable distribution")',
  bankruptcy: '(cryptocurrency OR bitcoin OR "digital assets") AND (debtor OR "chapter 7" OR "chapter 13" OR trustee) AND (concealment OR undisclosed OR "failed to disclose" OR turnover)',
};

type ClResult = {
  caseName?: string;
  court?: string;
  dateFiled?: string;
  absolute_url?: string;
  docketNumber?: string;
  attorney?: string | string[];
  firm?: string | string[];
  cluster_id?: number;
  docket_id?: number;
};

export function courtListenerEnabled() {
  return !!process.env.COURTLISTENER_TOKEN;
}

/** Splits CourtListener's "counsel" text into one entry per lawyer or firm. */
export function parseCounsel(raw: string): { name: string; firm: string | null; role: string | null }[] {
  return raw
    .replace(/\s+/g, " ")
    .split(/;|\.\s(?=[A-Z][a-z]+ [A-Z])|\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 4 && part.length < 260 && /[A-Z][a-z]+/.test(part))
    .map((part) => {
      const role = part.match(/\bfor (the )?([a-z -]+?)\.?$/i)?.[2] ?? null;
      const firmM = part.match(/,? (?:of|with) ([^,]+?(?:P\.A\.|PLLC|LLP|LLC|P\.C\.|Law Firm|Law Group|& [A-Z][a-z]+[^,]*))/);
      const name = part.split(/,| of | for /)[0].trim();
      return { name: name.slice(0, 120), firm: firmM ? firmM[1].trim() : null, role };
    })
    .filter((x) => x.name.split(" ").length >= 2 && x.name.split(" ").length <= 6);
}

export async function courtListenerLeads(segment: Segment, opts: { state?: string; since?: string } = {}): Promise<{ leads: LeadDraft[]; cases: number }> {
  const token = process.env.COURTLISTENER_TOKEN;
  if (!token) throw new Error("Add a free CourtListener API token (COURTLISTENER_TOKEN) to search court records.");
  const params = new URLSearchParams({ q: COURT_QUERIES[segment], type: "o", order_by: "dateFiled desc" });
  if (opts.since) params.set("filed_after", opts.since);
  const r = await json<{ results: ClResult[] }>(`https://www.courtlistener.com/api/rest/v4/search/?${params}`, { headers: { Authorization: `Token ${token}` } });
  const leads: LeadDraft[] = [];
  for (const c of r.results.slice(0, 40)) {
    const counsel = Array.isArray(c.attorney) ? c.attorney.join("; ") : c.attorney ?? "";
    const url = c.absolute_url ? `https://www.courtlistener.com${c.absolute_url}` : null;
    for (const p of parseCounsel(counsel)) {
      const lead: LeadDraft = {
        source: "courtlistener",
        source_ref: `${c.cluster_id ?? c.docket_id ?? c.absolute_url}:${p.name.toLowerCase()}`,
        name: p.name,
        firm: p.firm,
        email: null,
        phone: null,
        website: null,
        city: null,
        state: opts.state ?? null,
        segment,
        practice: [segment === "estate" ? "probate" : segment === "divorce" ? "family law" : "bankruptcy", "crypto"],
        evidence: `Counsel${p.role ? ` for ${p.role}` : ""} in ${c.caseName ?? "a case"} (${c.court ?? "court"}, ${c.dateFiled?.slice(0, 10) ?? "date unknown"}), which involves cryptocurrency.${url ? ` ${url}` : ""}`,
        score: 0,
      };
      lead.score = scoreLead(lead);
      leads.push(lead);
    }
  }
  return { leads, cases: r.results.length };
}

// ---------- import ----------

/** One lead per line: name, firm, email, website, city, state (any may be blank). */
export function parseImport(csv: string, segment: Segment): LeadDraft[] {
  return csv
    .split(/\r?\n/)
    .map((l) => l.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((x) => x.replace(/^"|"$/g, "").trim()))
    .filter((cols) => cols.some(Boolean) && !/^name$/i.test(cols[0] ?? ""))
    .map((cols) => {
      const [name, firm, email, website, city, state] = cols;
      const lead: LeadDraft = {
        source: "import",
        source_ref: null,
        name: name || null,
        firm: firm || null,
        email: email && /@/.test(email) ? email.toLowerCase() : null,
        phone: null,
        website: website || null,
        city: city || null,
        state: state || null,
        segment,
        practice: [],
        evidence: "Imported by you.",
        score: 0,
      };
      lead.score = scoreLead(lead);
      return lead;
    });
}
