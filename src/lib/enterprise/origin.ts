import { headers } from "next/headers";
import { appOrigin } from "./config";
export async function requireMutationOrigin() {
  const origin = (await headers()).get("origin");
  if (origin !== appOrigin()) throw new Error("Request origin denied");
}
