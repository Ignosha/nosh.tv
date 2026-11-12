"use client";

import { useFormStatus } from "react-dom";

export function SampleProgramButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "Creating…" : "Create sample program"}
    </button>
  );
}
