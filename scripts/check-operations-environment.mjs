import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function verifyOperationsEnvironment(environment, branches, ref) {
  const allowed = new Set(["feat/firm-premier", "refs/pull/10/merge"]);
  const target = ref?.startsWith("refs/heads/") ? ref.slice("refs/heads/".length) : ref;
  const policies = branches.branch_policies;
  if (!allowed.has(target)
    || !environment.protection_rules?.some(rule => rule.type === "required_reviewers" && rule.reviewers?.length > 0)
    || environment.deployment_branch_policy?.custom_branch_policies !== true
    || !Array.isArray(policies) || policies.length < 1 || policies.length > 2
    || !policies.every(rule => rule.type === "branch" && allowed.has(rule.name))
    || !policies.some(rule => rule.name === target)) {
    throw Error("Require environment reviewers and explicit deployment rules for this staging branch or PR ref");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    verifyOperationsEnvironment(JSON.parse(readFileSync("/tmp/environment.json")), JSON.parse(readFileSync("/tmp/branches.json")), process.env.GITHUB_REF);
    console.log("Protected staging operations environment verified");
  } catch {
    console.error("Staging environment must require a reviewer and restrict deployments to feat/firm-premier and/or refs/pull/10/merge, including the current ref.");
    process.exitCode = 1;
  }
}
