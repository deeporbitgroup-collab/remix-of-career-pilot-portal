import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const kind = params.get("kind"); // client_order | kb_order | talent_pool_subscription
  const [status, setStatus] = useState<"verifying" | "ok" | "fail">("verifying");
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    const verify = async () => {
      if (!sessionId) {
        setStatus("fail");
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });
        if (error || !data?.paid) {
          setStatus("fail");
          return;
        }
        setInfo(data);
        setStatus("ok");

        // Cleanup local carts
        if (kind === "kb_order") localStorage.removeItem("kb_cart");
        if (kind === "client_order") localStorage.removeItem("guest_cart");
      } catch (e) {
        setStatus("fail");
      }
    };
    verify();
  }, [sessionId, kind]);

  const goToDashboard = () => {
    if (kind === "kb_order") return navigate("/client-portal/dashboard");
    if (kind === "client_order") return navigate("/client-portal/dashboard");
    if (kind === "talent_pool_subscription") return navigate("/talent-pool/student/dashboard");
    return navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 text-center space-y-4">
          {status === "verifying" && (
            <>
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
              <h2 className="text-2xl font-bold">Verifying your payment…</h2>
              <p className="text-muted-foreground">Please wait a moment.</p>
            </>
          )}
          {status === "ok" && (
            <>
              <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-2xl font-bold">Payment successful!</h2>
              <p className="text-muted-foreground">
                Thank you for your purchase. A confirmation email is on its way.
              </p>
              <div className="flex gap-3 justify-center pt-4">
                <Button onClick={goToDashboard}>Go to Dashboard</Button>
                <Button variant="outline" onClick={() => navigate("/")}>Home</Button>
              </div>
            </>
          )}
          {status === "fail" && (
            <>
              <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
              <h2 className="text-2xl font-bold">Verification failed</h2>
              <p className="text-muted-foreground">
                We couldn't verify your payment. If you were charged, contact our support.
              </p>
              <div className="flex gap-3 justify-center pt-4">
                <Button onClick={() => navigate("/")}>Home</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
