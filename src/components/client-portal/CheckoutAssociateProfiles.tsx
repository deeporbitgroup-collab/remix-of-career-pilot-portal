import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

interface AssociateProfile {
  id: string;
  first_name: string;
  last_name: string;
  university?: string | null;
  master_program?: string | null;
  company_name?: string | null;
  cv_url?: string | null;
  overview_url?: string | null;
}

export interface CheckoutProfilesEntry {
  serviceItemId: string;
  serviceLabel: string;
  primaryId: string;
  backupId?: string | null;
}

interface Props {
  entries: CheckoutProfilesEntry[];
}

const triggerBlobDownload = async (url: string, filename: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
};

const downloadAssociateDocument = async (
  associateId: string,
  type: "overview" | "cv",
  filename: string,
) => {
  try {
    const { data, error } = await supabase.functions.invoke("get-associate-overview-url", {
      body: { associateId, type },
    });
    if (error) throw error;
    if (!data?.url) throw new Error("Missing document URL");
    await triggerBlobDownload(data.url, filename);
  } catch (e) {
    console.error(e);
    toast.error(`Failed to download ${type === "overview" ? "Overview" : "CV"}`);
  }
};

const ProfileRow = ({
  associate,
  role,
}: {
  associate: AssociateProfile;
  role: "primary" | "backup";
}) => {
  const subtitle = [associate.university, associate.master_program, associate.company_name]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-md border bg-background">
      <div className="flex items-start gap-2 min-w-0">
        {role === "primary" ? (
          <User className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        ) : (
          <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">
              {associate.first_name} {associate.last_name}
            </p>
            <Badge variant={role === "primary" ? "default" : "secondary"} className="text-[10px] h-5">
              {role === "primary" ? "Primary Associate" : "Backup Associate"}
            </Badge>
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {associate.cv_url && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => downloadAssociateDocument(associate.id, "cv", `${associate.first_name}_${associate.last_name}_CV.pdf`)}
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            CV
            <Download className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
        {associate.overview_url && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => downloadAssociateDocument(associate.id, "overview", `${associate.first_name}_${associate.last_name}_Overview.pdf`)}
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            Overview
            <Download className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
        {!associate.cv_url && !associate.overview_url && (
          <span className="text-xs text-muted-foreground italic">No profile available</span>
        )}
      </div>
    </div>
  );
};

const CheckoutAssociateProfiles = ({ entries }: Props) => {
  const [profiles, setProfiles] = useState<Record<string, AssociateProfile>>({});
  const [loading, setLoading] = useState(false);

  // Collect unique IDs (skip composite IDs from comparative services that contain commas)
  const idsKey = entries
    .flatMap((e) => [e.primaryId, e.backupId])
    .filter((id): id is string => !!id && !id.includes(","))
    .sort()
    .join("|");

  useEffect(() => {
    const ids = idsKey ? idsKey.split("|") : [];
    if (ids.length === 0) {
      setProfiles({});
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await sb
          .from("profiles")
          .select(
            "id, first_name, last_name, university, master_program, company_name, cv_url, overview_url"
          )
          .in("id", ids);
        if (error) throw error;
        if (!cancelled) {
          const map: Record<string, AssociateProfile> = {};
          (data || []).forEach((p: AssociateProfile) => {
            map[p.id] = p;
          });
          setProfiles(map);
        }
      } catch (e) {
        console.error("Failed to load associate profiles", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Associate Profiles
        </h4>
        <p className="text-xs text-muted-foreground">
          Download the CV / overview of the associates assigned to each service.
        </p>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => {
          const primary = profiles[entry.primaryId];
          const backup = entry.backupId ? profiles[entry.backupId] : null;
          return (
            <div
              key={entry.serviceItemId}
              className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {entry.serviceLabel}
              </p>
              {primary ? (
                <ProfileRow associate={primary} role="primary" />
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  {loading ? "Loading primary associate…" : "Primary associate unavailable"}
                </p>
              )}
              {backup && <ProfileRow associate={backup} role="backup" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CheckoutAssociateProfiles;
