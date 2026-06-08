"use server";

import { revalidatePath } from "next/cache";
import { LeadStatus, SubscriptionTier } from "@aegis/db";
import { db } from "@/lib/db";
import { provisionCustomer } from "@/lib/provisioning";
import { requireRole } from "@/lib/auth";
import { PlatformRole } from "@aegis/db";

function parseTier(value: FormDataEntryValue | null): SubscriptionTier {
  const v = String(value ?? "");
  return (Object.values(SubscriptionTier) as string[]).includes(v)
    ? (v as SubscriptionTier)
    : SubscriptionTier.SOLO;
}

export async function addLead(formData: FormData) {
  await requireRole(PlatformRole.ADMIN);

  const company = String(formData.get("company") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const salesRepId = String(formData.get("salesRepId") ?? "");
  if (!company || !contactEmail || !salesRepId) throw new Error("Missing required lead fields");

  await db.lead.create({
    data: {
      company,
      contactName: String(formData.get("contactName") ?? "").trim() || null,
      contactEmail,
      mrr: Number(formData.get("mrr") ?? 0) || 0,
      tier: parseTier(formData.get("tier")),
      salesRepId,
      status: LeadStatus.NEW,
    },
  });

  revalidatePath("/admin");
}

/** Convert a lead into a real customer tenant the customer can log into. */
export async function convertLead(formData: FormData) {
  await requireRole(PlatformRole.ADMIN);

  const leadId = String(formData.get("leadId") ?? "");
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.organizationId) return; // already converted or missing

  const org = await provisionCustomer({
    orgName: lead.company,
    ownerEmail: lead.contactEmail,
    ownerName: lead.contactName ?? lead.company,
    tier: lead.tier ?? SubscriptionTier.SOLO,
    // a representative first snapshot so the new customer has something to see
    accounts: [
      {
        externalId: `act_${lead.id.slice(-8)}`,
        displayName: `${lead.company} — Main`,
        raw: { account_status: 1, disapproved_active_ad_count: 1, business_verification_incomplete: true },
      },
    ],
  });

  await db.lead.update({
    where: { id: lead.id },
    data: { status: LeadStatus.CONVERTED, organizationId: org.id },
  });

  revalidatePath("/admin");
}
