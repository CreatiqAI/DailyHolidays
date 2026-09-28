import { requireAdmin } from "@/lib/admin";
import { DestinationRow, NewDestination } from "./destination-forms";

export default async function DestinationsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: destinations }, { data: tours }] = await Promise.all([
    supabase.from("destinations").select("*").order("name"),
    supabase.from("tours").select("destination_id"),
  ]);
  const all = destinations ?? [];
  const counts = new Map<string, number>();
  for (const t of tours ?? []) if (t.destination_id) counts.set(t.destination_id, (counts.get(t.destination_id) ?? 0) + 1);

  const countries = all.filter((d) => !d.parent_id);
  const options = all.map(({ id, name, parent_id }) => ({ id, name, parent_id }));

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Destinations</h1>
        <p className="text-sm text-navy-500">Countries and the areas inside them (e.g. China → Hainan). Used for filters and the homepage.</p>
      </div>
      <NewDestination destinations={options} />
      <div className="space-y-2">
        {countries.map((c) => (
          <div key={c.id} className="space-y-2">
            <DestinationRow d={c} destinations={options} count={counts.get(c.id) ?? 0} />
            {all
              .filter((a) => a.parent_id === c.id)
              .map((a) => (
                <div key={a.id} className="pl-8">
                  <DestinationRow d={a} destinations={options} count={counts.get(a.id) ?? 0} />
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
