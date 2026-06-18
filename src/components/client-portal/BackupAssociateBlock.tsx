import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const sb = supabase as any;

const TIME_SLOTS = [
  { value: "09:00-10:00", label: "09:00 - 10:00" },
  { value: "10:00-11:00", label: "10:00 - 11:00" },
  { value: "11:00-12:00", label: "11:00 - 12:00" },
  { value: "12:00-13:00", label: "12:00 - 13:00" },
  { value: "13:00-14:00", label: "13:00 - 14:00" },
  { value: "14:00-15:00", label: "14:00 - 15:00" },
  { value: "15:00-16:00", label: "15:00 - 16:00" },
  { value: "16:00-17:00", label: "16:00 - 17:00" },
  { value: "17:00-18:00", label: "17:00 - 18:00" },
  { value: "18:00-19:00", label: "18:00 - 19:00" },
  { value: "19:00-20:00", label: "19:00 - 20:00" },
  { value: "20:00-21:00", label: "20:00 - 21:00" },
];

export interface BackupSlot {
  date: Date | undefined;
  timeSlot: string;
}

export interface BackupCandidate {
  id: string;
  first_name: string;
  last_name: string;
  university?: string | null;
  university_2?: string | null;
  master_program?: string | null;
  company_name?: string | null;
  company_2?: string | null;
  sector?: string | null;
  sector_2?: string | null;
}

export interface BackupSelection {
  associateId: string | null;
  slots: BackupSlot[];
}

interface BackupAssociateBlockProps {
  primaryAssociateId: string;
  serviceItemId: string;
  serviceLabel: string;
  serviceCategory?: string | null;
  serviceSector?: string | null;
  minDate: Date;
  value: BackupSelection;
  onChange: (next: BackupSelection) => void;
  onCandidatesLoaded?: (count: number) => void;
}

const norm = (s?: string | null) => (s || "").trim().toLowerCase();

const sharesCompany = (primary: BackupCandidate, candidate: BackupCandidate) => {
  const a = [primary.company_name, primary.company_2].map(norm).filter(Boolean);
  const b = [candidate.company_name, candidate.company_2].map(norm).filter(Boolean);
  return a.some((x) => b.includes(x));
};

const sharesSector = (sector: string | null | undefined, candidate: BackupCandidate) => {
  const target = norm(sector);
  if (!target) return false;
  return [candidate.sector, candidate.sector_2].map(norm).includes(target);
};

const sharesUniOrMaster = (primary: BackupCandidate, candidate: BackupCandidate) => {
  const pUni = [primary.university, primary.university_2].map(norm).filter(Boolean);
  const cUni = [candidate.university, candidate.university_2].map(norm).filter(Boolean);
  const pMaster = norm(primary.master_program);
  const cMaster = norm(candidate.master_program);
  return pUni.some((u) => cUni.includes(u)) || (!!pMaster && pMaster === cMaster);
};

const BackupAssociateBlock = ({
  primaryAssociateId,
  serviceItemId,
  serviceLabel,
  serviceCategory,
  serviceSector,
  minDate,
  value,
  onChange,
  onCandidatesLoaded,
}: BackupAssociateBlockProps) => {
  const [candidates, setCandidates] = useState<BackupCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  const isAltitude = (serviceCategory || "").toLowerCase() === "altitude";

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const { data: primary } = await sb
          .from("profiles")
          .select("id, first_name, last_name, university, university_2, master_program, company_name, company_2, sector, sector_2")
          .eq("id", primaryAssociateId)
          .maybeSingle();

        if (!primary) {
          if (!cancelled) {
            setCandidates([]);
            onCandidatesLoaded?.(0);
          }
          return;
        }

        const { data: all } = await sb
          .from("profiles")
          .select("id, first_name, last_name, university, university_2, master_program, company_name, company_2, sector, sector_2")
          .eq("role", "ASSOCIATE")
          .eq("status", "approved");

        const others = (all || []).filter((a: BackupCandidate) => a.id !== primaryAssociateId);

        let filtered: BackupCandidate[] = [];
        if (isAltitude) {
          // Prefer associates in the same company AND matching sector
          const sameCompany = others.filter((a: BackupCandidate) => sharesCompany(primary, a));
          const companyAndSector = serviceSector
            ? sameCompany.filter((a: BackupCandidate) => sharesSector(serviceSector, a))
            : [];

          if (companyAndSector.length > 0) {
            filtered = companyAndSector;
          } else if (sameCompany.length > 0) {
            // Fallback: same company, any sector
            filtered = sameCompany;
          } else if (serviceSector) {
            // Fallback: any associate matching the sector
            filtered = others.filter((a: BackupCandidate) => sharesSector(serviceSector, a));
          }
          // Final fallback: any approved associate
          if (filtered.length === 0) filtered = others;
        } else {
          filtered = others.filter((a: BackupCandidate) => sharesUniOrMaster(primary, a));
        }

        if (!cancelled) {
          setCandidates(filtered);
          onCandidatesLoaded?.(filtered.length);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryAssociateId, isAltitude, serviceSector]);

  const updateSlot = (i: number, field: "date" | "timeSlot", v: any) => {
    const slots = [...value.slots];
    slots[i] = { ...slots[i], [field]: v };
    onChange({ ...value, slots });
  };

  const usedDateKeys = useMemo(
    () => value.slots.map((s) => (s.date ? format(s.date, "yyyy-MM-dd") : null)),
    [value.slots]
  );

  if (loading) return null;
  if (candidates.length === 0) return null;

  const candidateLabel = (c: BackupCandidate) => {
    if (isAltitude) {
      const co = c.company_name || c.company_2;
      const sec = c.sector || c.sector_2;
      if (co) return ` — ${co}${sec ? ` (${sec})` : ""}`;
      if (sec) return ` — ${sec}`;
      return "";
    }
    if (c.university) return ` — ${c.university}`;
    if (c.master_program) return ` — ${c.master_program}`;
    return "";
  };

  return (
    <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 mt-3 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h5 className="font-medium text-sm">Backup Associate (required) — {serviceLabel}</h5>
      </div>
      <p className="text-xs text-muted-foreground">
        {isAltitude
          ? "Choose a backup associate working in the same sector in case the primary one is unavailable. If none in the chosen sector is available, associates from other sectors may be shown."
          : "Choose a backup associate from the same university, master or company in case the primary one is unavailable."}{" "}
        Pick 3 time slots, each on a different day. <span className="font-medium text-foreground">Weekend slots (Sat/Sun) are strongly recommended</span> — Associates work on Take Off, Summit and Layover services during the week.
      </p>

      <div className="space-y-2">
        <Label className="text-xs">Backup associate</Label>
        <Select
          value={value.associateId || ""}
          onValueChange={(v) => onChange({ ...value, associateId: v })}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select a backup associate" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.first_name} {c.last_name}{candidateLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => {
          const slot = value.slots[i];
          return (
            <div key={i} className="space-y-2">
              <Label className="text-xs font-medium">Backup Slot {i + 1}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left font-normal text-xs",
                      !slot?.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {slot?.date ? format(slot.date, "dd/MM") : "Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={slot?.date}
                    onSelect={(d) => updateSlot(i, "date", d)}
                    disabled={(date) => {
                      if (date < minDate) return true;
                      const k = format(date, "yyyy-MM-dd");
                      return usedDateKeys.some((u, idx) => idx !== i && u === k);
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Select
                value={slot?.timeSlot || ""}
                onValueChange={(v) => updateSlot(i, "timeSlot", v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <Clock className="mr-1 h-3 w-3" />
                  <SelectValue placeholder="Time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BackupAssociateBlock;
