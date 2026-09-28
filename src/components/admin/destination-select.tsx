import { input } from "./styles";

type D = { id: string; name: string; parent_id: string | null };

/** Countries with their areas indented underneath. */
export function DestinationSelect({
  name,
  destinations,
  defaultValue,
  emptyLabel = "— None —",
  onlyCountries = false,
}: {
  name: string;
  destinations: D[];
  defaultValue?: string | null;
  emptyLabel?: string;
  onlyCountries?: boolean;
}) {
  const countries = destinations.filter((d) => !d.parent_id);
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className={input}>
      <option value="">{emptyLabel}</option>
      {countries.map((c) => [
        <option key={c.id} value={c.id}>{c.name}</option>,
        ...(onlyCountries
          ? []
          : destinations
              .filter((d) => d.parent_id === c.id)
              .map((d) => <option key={d.id} value={d.id}>{`   ${d.name}`}</option>)),
      ])}
    </select>
  );
}
