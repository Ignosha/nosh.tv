"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Job, ModelId, PackId, Preset, ProviderId } from "@/lib/types";

interface ModelSpecLite {
  label: string;
  license: string;
  maxDurationSec: number;
}

interface CatalogResponse {
  presets: Preset[];
  packs: { id: PackId; label: string; blurb: string }[];
  models: Record<ModelId, ModelSpecLite>;
  providers: { id: ProviderId; label: string; configured: boolean }[];
}

export default function Studio() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [pack, setPack] = useState<PackId>("camera");
  const [presetId, setPresetId] = useState<string>("crash-zoom");
  const [subject, setSubject] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [intensity, setIntensity] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/presets")
      .then((r) => r.json())
      .then((d: CatalogResponse) => setCatalog(d))
      .catch(() => setError("Couldn't load the preset catalog."));
  }, []);

  const refreshJobs = useCallback(async () => {
    try {
      const r = await fetch("/api/jobs", { cache: "no-store" });
      const d = (await r.json()) as { jobs: Job[] };
      setJobs(d.jobs);
    } catch {
      /* transient — the next tick will retry */
    }
  }, []);

  // Poll while anything is in flight, back off to idle otherwise.
  useEffect(() => {
    void refreshJobs();
    const anyActive = jobs.some((j) => j.status === "queued" || j.status === "running");
    const id = setInterval(refreshJobs, anyActive ? 1000 : 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshJobs, jobs.some((j) => j.status === "queued" || j.status === "running")]);

  const preset = useMemo(
    () => catalog?.presets.find((p) => p.id === presetId) ?? null,
    [catalog, presetId],
  );

  // Reset overrides whenever the preset changes — its defaults are the point.
  useEffect(() => {
    setIntensity(null);
    setDuration(null);
  }, [presetId]);

  const needsImage = preset ? !preset.modality.includes("t2v") : false;
  const effIntensity = intensity ?? preset?.motion.intensity ?? 0.7;
  const effDuration = duration ?? preset?.motion.durationSec ?? 5;

  const previewPrompt = useMemo(() => {
    if (!preset) return "";
    const clean = subject.trim().replace(/\.$/, "") || "the subject";
    let p = preset.promptTemplate.replace(/\{\{subject\}\}/g, clean);
    if (effIntensity >= 0.85) p += ", extremely pronounced camera movement";
    else if (effIntensity <= 0.3) p += ", very subtle restrained camera movement";
    return p;
  }, [preset, subject, effIntensity]);

  async function generate() {
    if (!preset) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetId: preset.id,
          subject,
          imageUrl: imageUrl.trim() || undefined,
          overrides: { intensity: effIntensity, durationSec: effDuration },
        }),
      });
      const data = (await res.json()) as { job?: Job; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      await refreshJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!catalog) return <p className="sub">Loading catalog…</p>;

  const visible = catalog.presets.filter((p) => p.pack === pack);

  return (
    <div className="layout">
      <div>
        <div className="panel">
          <h2>Shot library</h2>
          <div className="tabs">
            {catalog.packs.map((p) => (
              <button
                key={p.id}
                className="tab"
                data-active={pack === p.id}
                onClick={() => setPack(p.id)}
                title={p.blurb}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid">
            {visible.map((p) => (
              <button
                key={p.id}
                className="card"
                data-selected={p.id === presetId}
                onClick={() => setPresetId(p.id)}
              >
                <div
                  className="thumb"
                  style={{ background: `linear-gradient(135deg, ${p.swatch[0]}, ${p.swatch[1]})` }}
                />
                <div className="body">
                  <div className="name">{p.name}</div>
                  <div className="blurb">{p.blurb}</div>
                  <div className="meta">
                    <span>{p.motion.cameraMove}</span>
                    <span>{p.modality.join("/")}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Renders</h2>
          {jobs.length === 0 && <p className="hint">Nothing yet. Pick a shot and hit Generate.</p>}
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </div>

      <aside>
        <div className="panel">
          <h2>{preset ? preset.name : "Compose"}</h2>

          <div className="field">
            <label htmlFor="subject">Subject</label>
            <textarea
              id="subject"
              value={subject}
              placeholder="a matte black espresso machine on a marble counter"
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="img">
              Source image URL {needsImage ? "(required)" : "(optional)"}
            </label>
            <input
              id="img"
              type="url"
              value={imageUrl}
              placeholder="https://…/frame.jpg"
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="int">Intensity · {effIntensity.toFixed(2)}</label>
              <input
                id="int"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={effIntensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="dur">Duration · {effDuration}s</label>
              <input
                id="dur"
                type="range"
                min={2}
                max={preset ? (catalog.models[preset.preferredModel]?.maxDurationSec ?? 5) : 5}
                step={1}
                value={effDuration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
          </div>

          <button
            className="primary"
            disabled={submitting || !subject.trim() || (needsImage && !imageUrl.trim())}
            onClick={generate}
          >
            {submitting ? "Queueing…" : "Generate"}
          </button>

          {error && <p className="err">{error}</p>}

          {preset && (
            <p className="hint">
              {catalog.models[preset.preferredModel]?.label} ·{" "}
              {catalog.models[preset.preferredModel]?.license}
              {preset.loras.length > 0 && ` · ${preset.loras.length} LoRA`}
            </p>
          )}
        </div>

        <div className="panel">
          <h2>Resolved prompt</h2>
          <code className="prompt">{previewPrompt || "—"}</code>
          <p className="hint">
            This is what the model actually sees. The user never writes it, and never sees it unless
            they go looking.
          </p>
        </div>

        <div className="panel">
          <h2>Compute</h2>
          <div className="providers">
            {catalog.providers.map((p) => (
              <span key={p.id} className="badge" data-on={p.configured}>
                {p.label}
                {p.configured ? " ✓" : " —"}
              </span>
            ))}
          </div>
          <p className="hint">
            Nothing configured means every job runs on the mock provider: full lifecycle, zero spend.
            Add keys in <code>.env.local</code> to hit real GPUs.
          </p>
        </div>
      </aside>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const isSvg = job.outputUrl?.includes("/api/mock/");
  return (
    <div className="job">
      {job.outputUrl ? (
        isSvg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="media" src={job.outputUrl} alt={job.presetName} />
        ) : (
          <video className="media" src={job.outputUrl} controls loop muted playsInline />
        )
      ) : (
        <div className="bar">
          <span style={{ width: `${Math.round(job.progress * 100)}%` }} />
        </div>
      )}
      <div className="info">
        <div className="title">
          <span>{job.presetName}</span>
          <span className="badge" data-s={job.status}>
            {job.status === "running" ? `${Math.round(job.progress * 100)}%` : job.status}
          </span>
        </div>
        <div className="desc">{job.subject}</div>
        <div className="desc">
          {job.provider} · {job.model} · ~${job.estCostUsd.toFixed(3)}
        </div>
        {job.error && <div className="err">{job.error}</div>}
      </div>
    </div>
  );
}
