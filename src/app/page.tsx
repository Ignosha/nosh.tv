import Studio from "@/components/Studio";

export default function Home() {
  return (
    <main className="shell">
      <header className="top">
        <h1>nosh.tv</h1>
        <span className="tag">open-weight video · preset driven</span>
      </header>
      <p className="sub">
        Pick a shot, describe the subject, get a clip. The presets carry the craft — camera move,
        prompt language, negatives, LoRA stack and sampler settings — so the user never touches a
        sampler config.
      </p>
      <Studio />
    </main>
  );
}
