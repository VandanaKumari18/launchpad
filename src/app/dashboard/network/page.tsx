import { getUserAndProfile, getNetworkNudges } from "@/lib/dashboard-data";
import { generateNetworkNudges } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { NetworkNudgeRow } from "@/components/dashboard/network-nudge-row";
import { NetworkContactsManager } from "@/components/dashboard/network-contacts-manager";
import { Users } from "lucide-react";

export default async function NetworkPage() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) return null;

  const networkNudges = await getNetworkNudges(supabase, user.id);
  const contacts = Array.isArray(profile?.network_contacts)
    ? profile.network_contacts
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your Network</h1>
          <p className="mt-1 text-muted-foreground">
            AI-drafted messages to help you stay in touch with the people who
            can help your career.
          </p>
        </div>
        {contacts.length > 0 && (
          <form action={generateNetworkNudges}>
            <Button type="submit">Draft outreach</Button>
          </form>
        )}
      </div>

      <NetworkContactsManager initialContacts={contacts} />

      {networkNudges.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            {contacts.length === 0
              ? "Add a contact above, then click \"Draft outreach\" to get AI-drafted reconnect messages."
              : "No outreach drafted yet. Click \"Draft outreach\" above to generate reconnect messages."}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {networkNudges.map((n) => (
            <NetworkNudgeRow
              key={n.id}
              nudgeId={n.id}
              contactName={n.contact_name}
              contactUrl={n.contact_url}
              suggestedMessage={n.suggested_message ?? ""}
              status={n.status}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
