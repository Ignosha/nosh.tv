import { requireOrganization } from "./session";
import {
  companyPortfolio,
  PORTFOLIO_PAGE_SIZE,
  type PortfolioProgram,
} from "../companyPortfolio";

export async function loadCompanyPortfolio(org: string, page: number) {
  const { client, role, user } = await requireOrganization(org);
  const offset = (page - 1) * PORTFOLIO_PAGE_SIZE;
  const [organization, programs, directory] = await Promise.all([
    client
      .from("kl_organizations")
      .select("id,name,entitlement,access_until,max_members,max_programs")
      .eq("id", org)
      .single(),
    client
      .from("kl_assurance_programs")
      .select("id,revision,workspace,updated_at", { count: "exact" })
      .eq("organization_id", org)
      .order("id", { ascending: true })
      .range(offset, offset + PORTFOLIO_PAGE_SIZE - 1),
    client.rpc("kl_org_directory", { p_org: org }),
  ]);
  if (
    organization.error ||
    programs.error ||
    directory.error ||
    programs.count === null
  )
    throw new Error("Portfolio data unavailable");
  const members = (
    directory.data as { user_id: string; email: string; active: boolean }[]
  ).map((member) => ({
    id: member.user_id,
    label: member.email,
    active: member.active,
  }));
  const result = companyPortfolio(
    programs.data as PortfolioProgram[],
    members,
    new Date().toISOString().slice(0, 10),
  );
  return {
    organization: organization.data,
    role,
    userId: user.id,
    page,
    totalPrograms: programs.count,
    members,
    result,
  };
}
