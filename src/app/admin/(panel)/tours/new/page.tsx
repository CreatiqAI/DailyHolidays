import { requireAdmin } from "@/lib/admin";
import { PdfImport } from "./pdf-import";
import { BlankTourForm } from "./blank-tour-form";

// AI extraction of a long PDF can take a minute or two
export const maxDuration = 300;

export default async function NewTourPage() {
  const { supabase } = await requireAdmin();
  const { data: destinations } = await supabase.from("destinations").select("id, name, parent_id").order("name");

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-navy-900">New tour</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <PdfImport />
        <BlankTourForm destinations={destinations ?? []} />
      </div>
    </div>
  );
}
