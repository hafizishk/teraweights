/**
 * A row of radio buttons drawn as one control. Uncontrolled: it is a form
 * field, so wrap it in a form and read `name` on the server.
 */
export function Segmented({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange?: (value: string) => void;
}) {
  return (
    <div className="grid gap-1 rounded-md border border-ink-3 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={o.value}
            defaultChecked={value === o.value}
            onChange={onChange ? () => onChange(o.value) : undefined}
            className="peer sr-only"
          />
          <span className="display block rounded px-2 py-2 text-center text-base leading-none tracking-wide text-muted peer-checked:bg-brand peer-checked:text-on-brand peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}
