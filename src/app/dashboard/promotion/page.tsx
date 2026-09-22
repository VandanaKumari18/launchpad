import { getUserAndProfile, getPromotionCases } from "@/lib/dashboard-data";
import { PromotionCaseSection } from "@/components/dashboard/promotion-case-section";

export default async function PromotionPage() {
  const { supabase, user } = await getUserAndProfile();
  if (!user) return null;

  const promotionCases = await getPromotionCases(supabase, user.id);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold">Promotion Case</h1>
      <p className="mt-1 text-muted-foreground">
        A full, evidence-based promotion document — pulled from every
        achievement and Friday log on file, not a quick summary.
      </p>
      <div className="mt-6">
        <PromotionCaseSection initialCases={promotionCases} />
      </div>
    </div>
  );
}
