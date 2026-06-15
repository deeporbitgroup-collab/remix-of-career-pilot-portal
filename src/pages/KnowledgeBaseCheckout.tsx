import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CreditCard, MessageCircle, Mail } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const sb = supabase as any;

const KnowledgeBaseCheckout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const clientUser = JSON.parse(localStorage.getItem("client_user") || "null");

  useEffect(() => {
    if (!clientUser) {
      navigate("/client-portal/auth");
      return;
    }
    const items = JSON.parse(localStorage.getItem("kb_cart") || "[]");
    if (items.length === 0) {
      navigate("/knowledge-base");
      return;
    }
    setCartItems(items);
  }, []);

  const totalAmount = cartItems.reduce((sum: number, p: any) => sum + Number(p.price), 0);

  const handleStripeCheckout = async () => {
    if (!termsAccepted) {
      toast({ title: "Please accept the terms", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      // 1. Create order with payment_status='pending'
      const { data: order, error: orderError } = await sb
        .from("kb_orders")
        .insert({
          client_id: clientUser.id,
          total_amount: totalAmount,
          payment_status: "pending",
        })
        .select()
        .single();
      if (orderError) throw orderError;

      // 2. Create order items
      const orderItems = cartItems.map((item: any) => ({
        order_id: order.id,
        product_id: item.id,
        price: item.price,
      }));
      const { error: itemsError } = await sb.from("kb_order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // 3. Create client access entries (will be marked usable once paid)
      const accessEntries = cartItems.map((item: any) => ({
        client_id: clientUser.id,
        product_id: item.id,
        order_id: order.id,
      }));
      await sb.from("kb_client_access").upsert(accessEntries, { onConflict: "client_id,product_id" });

      // 4. Create Stripe Checkout session
      const origin = window.location.origin;
      const { data: session, error: stripeError } = await supabase.functions.invoke(
        "create-payment",
        {
          body: {
            customer_email: clientUser.email,
            success_url: `${origin}/payment-success?kind=kb_order&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/payment-canceled?kind=kb_order`,
            items: cartItems.map((item: any) => ({
              name: item.title,
              amount: Number(item.price),
              quantity: 1,
            })),
            metadata: {
              kind: "kb_order",
              order_id: order.id,
              client_id: clientUser.id,
            },
          },
        }
      );
      if (stripeError) throw stripeError;
      if (!session?.url) throw new Error("Stripe session URL missing");

      // 5. Send notification email (async, don't block)
      sb.functions
        .invoke("send-kb-order-notification", {
          body: {
            clientName: `${clientUser.first_name} ${clientUser.last_name}`,
            clientEmail: clientUser.email,
            clientPhone: clientUser.phone,
            products: cartItems.map((i: any) => ({ title: i.title, price: i.price })),
            totalAmount,
            orderId: order.id,
          },
        })
        .catch((e: any) => console.error("Notification error:", e));

      // 6. Redirect to Stripe
      window.location.href = session.url;
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onOpenBooking={() => {}} />
      <main className="pt-20 pb-16">
        <div className="max-w-2xl mx-auto px-4">
          <Button variant="ghost" onClick={() => navigate("/knowledge-base")} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Knowledge Base
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base Checkout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Order Summary */}
              <div className="space-y-2">
                <h3 className="font-semibold">Order Summary</h3>
                {cartItems.map((item: any) => (
                  <div key={item.id} className="flex justify-between py-2 border-b border-border">
                    <span>{item.title}</span>
                    <span className="font-semibold">€{Number(item.price).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">€{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Stripe info */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Secure Payment by Stripe
                </h3>
                <p className="text-sm text-muted-foreground">
                  You will be redirected to Stripe to complete your payment securely. Once paid, your materials will be available immediately in your dashboard.
                </p>
              </div>

              {/* Contact Section */}
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  Need Help? Contact Us
                </h3>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://wa.me/447826932893"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-green-50 hover:border-green-500 hover:text-green-600 transition-colors"
                  >
                    <FaWhatsapp className="h-5 w-5 text-green-500" />
                    +44 7826 932893
                  </a>
                  <a
                    href="mailto:CareerPilot.team@gmail.com"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-primary/5 hover:border-primary transition-colors"
                  >
                    <Mail className="h-5 w-5 text-primary" />
                    CareerPilot.team@gmail.com
                  </a>
                </div>
              </div>

              {/* Terms Acceptance */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="kb-terms"
                  checked={termsAccepted}
                  onCheckedChange={(v) => setTermsAccepted(!!v)}
                />
                <label htmlFor="kb-terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                  I accept the <strong>no-sharing policy</strong>: it is strictly forbidden to share these materials with third parties or publish them externally. All content is personal and confidential.
                </label>
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={!termsAccepted || processing}
                onClick={handleStripeCheckout}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                {processing ? "Redirecting…" : `Pay €${totalAmount.toFixed(2)} with Stripe`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default KnowledgeBaseCheckout;
