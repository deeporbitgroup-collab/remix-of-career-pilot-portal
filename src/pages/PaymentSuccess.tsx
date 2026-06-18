import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { fulfillClientOrder, type PendingClientOrder } from "@/lib/fulfillClientOrder";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const kind = params.get("kind"); // client_order | kb_order | talent_pool_subscription
  const [status, setStatus] = useState<"verifying" | "ok" | "fail">("verifying");
  const [info, setInfo] = useState<any>(null);
  // Guard so the order is fulfilled at most once even if the effect re-runs
  // (React strict mode double-invoke, refreshes, etc.).
  const fulfilledRef = useRef(false);

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

        // Client order: the order/projects/slots were intentionally NOT created
        // before payment. Now that Stripe confirmed it, take an atomic claim on the
        // staged payload and create everything. The Stripe webhook does the exact
        // same claim server-side, so whichever runs first wins and the order is
        // created EXACTLY once — even if the user closed this tab.
        if (kind === "client_order" && !fulfilledRef.current) {
          fulfilledRef.current = true;
          // claim_pending_order flips pending → processing and returns the row only
          // to the winner (these RPCs aren't in the generated types yet → cast).
          const { data: claim } = await (supabase.rpc as any)("claim_pending_order", {
            _session_id: sessionId,
          });
          if (claim?.status === "processing" && claim?.payload) {
            try {
              const payload = claim.payload as PendingClientOrder;
              const { orderId } = await fulfillClientOrder(payload);
              await (supabase.rpc as any)("complete_pending_order", {
                _session_id: sessionId,
                _order_id: orderId,
              });
              // Fire confirmation emails only after the order/projects exist.
              await Promise.allSettled([
                supabase.functions.invoke("send-client-order-notification", { body: { orderId } }),
                payload.clientId
                  ? supabase.functions.invoke("send-client-payment-confirmation", {
                      body: { orderId, clientId: payload.clientId },
                    })
                  : Promise.resolve(null),
              ]);
            } catch (fulfillErr) {
              // Release the claim so the Stripe webhook retry can recover it.
              console.error("[payment-success] fulfillment error", fulfillErr);
              await (supabase.rpc as any)("release_pending_order", { _session_id: sessionId });
            }
          }
          // If we didn't win the claim, the webhook is handling (or already did) it.
          localStorage.removeItem("guest_cart");
        }

        setInfo(data);
        setStatus("ok");

        // Cleanup local carts
        if (kind === "kb_order") localStorage.removeItem("kb_cart");
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
