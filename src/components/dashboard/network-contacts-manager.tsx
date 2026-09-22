"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { addNetworkContact, removeNetworkContact } from "@/app/dashboard/actions";
import { X } from "lucide-react";

type Contact = { name: string; linkedin_url?: string };

export function NetworkContactsManager({
  initialContacts,
}: {
  initialContacts: Contact[];
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [name, setName] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    if (!name.trim()) return;
    setError(null);
    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("linkedin_url", linkedinUrl.trim());
    startTransition(async () => {
      try {
        const updated = await addNetworkContact(formData);
        setContacts(updated);
        setName("");
        setLinkedinUrl("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add contact");
      }
    });
  }

  function handleRemove(contactName: string) {
    setError(null);
    const previous = contacts;
    setContacts((c) => c.filter((contact) => contact.name !== contactName));
    startTransition(async () => {
      try {
        await removeNetworkContact(contactName);
      } catch (e) {
        setContacts(previous);
        setError(e instanceof Error ? e.message : "Failed to remove contact");
      }
    });
  }

  return (
    <Card className="mt-4">
      <CardContent className="pt-6">
        <p className="text-sm font-medium">Your contacts ({contacts.length}/5)</p>

        {contacts.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {contacts.map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-1.5 text-sm"
              >
                {c.linkedin_url ? (
                  <a
                    href={c.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {c.name}
                  </a>
                ) : (
                  <span>{c.name}</span>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${c.name}`}
                  disabled={isPending}
                  onClick={() => handleRemove(c.name)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {contacts.length < 5 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Input
              placeholder="Contact name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-40"
            />
            <Input
              placeholder="LinkedIn URL (optional)"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="w-56"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={isPending || !name.trim()}
              onClick={handleAdd}
            >
              Add contact
            </Button>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
