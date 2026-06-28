import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Landing page for the "Pay now" button (payment-due email + dashboard banner).
 * It creates a Stripe Checkout session for the given order and redirects there.
 */
const PayOrder = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get("order");
  const [status, setStatus] = useState<"starting" | "alreadyPaid" | "fail">("starting");
  const [message, setMessage] = useState<string>("");
  const startedRef = useRef(false);

  useEffect(() => {
    const start = async () => {
      if (!orderId) {
        setStatus("fail");
        setMessage("Missing order reference.");
        return;
      }
      if (startedRef.current) return;
      startedRef.current = true;
      try {
        const { data, error } = await supabase.functions.invoke("create-order-payment", {
          body: { orderId, origin: window.location.origin },
        });
        if (error) throw error;
        if (data?.alreadyPaid) {
          setStatus("alreadyPaid");
          return;
        }
        if (!data?.url) throw new Error(data?.error || "Could not start the payment.");

        // Redirect to Stripe — break out of any iframe (Lovable preview, etc.).
        try {
          if (window.top && window.top !== window.self) {
            window.top.location.href = data.url;
          } else {
            window.location.href = data.url;
          }
        } catch {
          window.open(data.url, "_blank", "noopener,noreferrer");
        }
      } catch (e: any) {
        setStatus("fail");
        setMessage(e?.message || "Could not start the payment.");
      }
    };
    start();
  }, [orderId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 text-center space-y-4">
          {status === "starting" && (
            <>
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
              <h2 className="text-2xl font-bold">Opening secure payment…</h2>
              <p className="text-muted-foreground">Redirecting you to Stripe.</p>
            </>
          )}
          {status === "alreadyPaid" && (
            <>
              <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-2xl font-bold">Already paid</h2>
              <p className="text-muted-foreground">This order has already been paid. Thank you!</p>
              <Button onClick={() => navigate("/client-portal/dashboard")}>Go to Dashboard</Button>
            </>
          )}
          {status === "fail" && (
            <>
              <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
              <h2 className="text-2xl font-bold">We couldn't open the payment</h2>
              <p className="text-muted-foreground">{message}</p>
              <div className="flex gap-3 justify-center pt-2">
                <Button onClick={() => navigate("/client-portal/dashboard")}>Go to Dashboard</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayOrder;
