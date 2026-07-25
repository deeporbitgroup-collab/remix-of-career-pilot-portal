import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CvEntry } from "@/lib/cvBuilder/types";
import { Plus, Trash2 } from "lucide-react";

const EMPTY_ENTRY: CvEntry = { org: "", location: "", role: "", dateRange: "", bullets: [] };

export function CvEntryListEditor({
  entries,
  onChange,
  orgLabel,
  roleLabel,
}: {
  entries: CvEntry[];
  onChange: (entries: CvEntry[]) => void;
  orgLabel: string;
  roleLabel: string;
}) {
  const update = (i: number, patch: Partial<CvEntry>) =>
    onChange(entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const add = () => onChange([...entries, { ...EMPTY_ENTRY }]);

  return (
    <div className="space-y-4">
      {entries.map((e, i) => (
        <div key={i} className="border rounded-md p-3 space-y-2 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => remove(i)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <div className="grid grid-cols-2 gap-2 pr-8">
            <Input placeholder={orgLabel} value={e.org} onChange={(ev) => update(i, { org: ev.target.value })} />
            <Input placeholder="Location" value={e.location} onChange={(ev) => update(i, { location: ev.target.value })} />
            <Input placeholder={roleLabel} value={e.role} onChange={(ev) => update(i, { role: ev.target.value })} />
            <Input
              placeholder="Date range (e.g. Jan 2024 – Present)"
              value={e.dateRange}
              onChange={(ev) => update(i, { dateRange: ev.target.value })}
            />
          </div>
          <Textarea
            placeholder="Bullet points, one per line"
            rows={3}
            value={e.bullets.join("\n")}
            onChange={(ev) => update(i, { bullets: ev.target.value.split("\n") })}
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add entry
      </Button>
    </div>
  );
}
