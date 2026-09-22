import { getUserAndProfile, getPromotionCases } from "@/lib/dashboard-data";
import { PromotionCaseSection } from "@/components/dashboard/promotion-case-section";

export default async function PromotionPage() {
  const { supabase, user } = await getUserAndProfile();
  if (!user) return null;

  const promotionCases = await getPromotionCases(supabase, user.id);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Promotion Case</h1>
      <p className="mt-1 text-muted-foreground">
        Build a readiness case for an internal move — grounded in your real
        achievements, with a manager email ready to send.
      </p>
      <div className="mt-6">
        <PromotionCaseSection initialCases={promotionCases} />
      </div>
    </div>
  );
}
