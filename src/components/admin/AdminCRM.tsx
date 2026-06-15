import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, AlertTriangle, Loader2, FileCode } from "lucide-react";

// The CRM is the standalone Client Email Tracker (Flask app) running locally.
// Override the URL with VITE_CRM_URL if it runs on a different host/port.
const CRM_URL = (import.meta.env.VITE_CRM_URL as string | undefined) ?? "http://localhost:5001";

type Reachability = "checking" | "online" | "offline";

const AdminCRM = () => {
  const [status, setStatus] = useState<Reachability>("checking");
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const checkReachable = async () => {
    setStatus("checking");
    try {
      // no-cors: we can't read the response, but a resolved promise means the
      // server accepted the connection; a network failure (server down) rejects.
      await fetch(`${CRM_URL}/health`, { mode: "no-cors", cache: "no-store" });
      setStatus("online");
    } catch {
      setStatus("offline");
    }
  };

  useEffect(() => {
    checkReachable();
  }, []);

  const handleReload = () => {
    checkReachable();
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <FileCode className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">CRM — Client Email Tracker</h2>
          {status === "online" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Connected
            </span>
          )}
          {status === "offline" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              Offline
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReload}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={CRM_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open full screen
            </a>
          </Button>
        </div>
      </div>

      {status === "checking" && (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Connecting to the CRM server…
          </CardContent>
        </Card>
      )}

      {status === "offline" && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-5 w-5" />
              CRM server not reachable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              The CRM runs as a local app. Start it, then click <strong>Reload</strong>.
            </p>
            <pre className="rounded-md bg-muted p-3 text-xs text-foreground overflow-x-auto">
              cd client_tracker{"\n"}python3 app.py
            </pre>
            <p>
              Expected at{" "}
              <a
                href={CRM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {CRM_URL}
              </a>
              . Set <code className="text-foreground">VITE_CRM_URL</code> to change it.
            </p>
            <Button variant="outline" size="sm" onClick={handleReload}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "online" && (
        <Card className="overflow-hidden">
          <iframe
            key={reloadKey}
            ref={iframeRef}
            src={CRM_URL}
            title="CRM — Client Email Tracker"
            className="w-full border-0"
            style={{ height: "calc(100vh - 220px)", minHeight: 600 }}
          />
        </Card>
      )}
    </div>
  );
};

export default AdminCRM;
