import { NextResponse } from "next/server";
import { MODELS } from "@/lib/models";
import { PACKS, PRESETS } from "@/lib/presets";
import { providerStatus } from "@/lib/providers";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    presets: PRESETS,
    packs: PACKS,
    models: MODELS,
    providers: providerStatus(),
  });
}
