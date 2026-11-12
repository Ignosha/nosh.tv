import { POLICY_PACKS } from "@/lib/assurance";
import { createPlaybookProgram } from "@/app/workspace/actions";

const errors: Record<string, string> = {
  invalid: "Choose a playbook and enter a program name up to 200 characters.",
  quota:
    "Your company has reached its program or audit capacity. Open existing programs or contact your organization owner.",
  read_only:
    "Your company is read-only. Contact your organization owner before creating programs.",
  unavailable:
    "The program could not be created. Refresh and retry, or contact your organization owner.",
};
export function CompanyPlaybooks({
  org,
  error,
}: {
  org: string;
  error?: string;
}) {
  return (
    <section id="playbooks" className="form-card company-playbooks">
      <p className="kicker">Guided setup</p>
      <h2>Start with a playbook</h2>
      <p>
        Create a linked risk register, staged tasks and a recurring review in
        one step. You become the initial owner; assign colleagues after
        creation.
      </p>
      {error && errors[error] ? (
        <p className="company-notice" role="alert">
          {errors[error]}
        </p>
      ) : null}
      <form action={createPlaybookProgram.bind(null, org)}>
        <label htmlFor="playbook-name">Program or matter name</label>
        <input
          id="playbook-name"
          name="name"
          required
          maxLength={200}
          placeholder="For example, Matter 204 · source review"
        />
        <label htmlFor="playbook-template">Playbook</label>
        <select
          id="playbook-template"
          name="playbook"
          required
          defaultValue="crypto-matter"
        >
          {POLICY_PACKS.map((pack) => (
            <option key={pack.id} value={pack.id}>
              {pack.name}
            </option>
          ))}
        </select>
        <p className="fine">
          Playbooks start unassessed, with no evidence or approvals. Review
          dates use calendar days.
        </p>
        <button className="btn btn-primary" type="submit">
          Create playbook program
        </button>
      </form>
    </section>
  );
}
