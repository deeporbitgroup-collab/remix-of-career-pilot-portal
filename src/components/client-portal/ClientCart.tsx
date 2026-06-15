import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, ShoppingCart, Send } from "lucide-react";
import AssociateAvailabilityRequest from "./AssociateAvailabilityRequest";
const sb = supabase as any;

interface CartItem {
  id: string;
  service: any;
  associate: any;
  university: string;
  sector: string;
}

interface ClientCartProps {
  clientId: string;
  clientName: string;
  onCartUpdate?: () => void;
}

const ClientCart = ({ clientId, clientName, onCartUpdate }: ClientCartProps) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAvailabilityRequest, setShowAvailabilityRequest] = useState(false);

  useEffect(() => {
    fetchCart();
  }, [clientId]);

  const fetchCart = async () => {
    try {
      const { data, error } = await sb
        .from('client_cart')
        .select(`
          id,
          university,
          sector,
          service:client_services(*),
          associate:profiles(id, first_name, last_name)
        `)
        .eq('client_id', clientId);

      if (error) throw error;
      setCartItems(data || []);
      onCartUpdate?.();
    } catch (error: any) {
      console.error('Error fetching cart:', error);
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const { error } = await sb
        .from('client_cart')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast.success("Item removed from cart");
      fetchCart();
      onCartUpdate?.();
    } catch (error: any) {
      console.error('Error removing item:', error);
      toast.error("Failed to remove item");
    }
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.service.price), 0);
    return { subtotal, discountPercentage: 0, discountAmount: 0, total: subtotal };
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setIsProcessing(true);

    try {
      const { subtotal, discountPercentage, total } = calculateTotals();

      // Upload receipt if provided
      let receiptUrl = null;
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${clientId}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await sb.storage
          .from('documents')
          .upload(`client-receipts/${fileName}`, receiptFile);

        if (uploadError) throw uploadError;
        receiptUrl = uploadData.path;
      }

      // Create order
      const { data: order, error: orderError } = await sb
        .from('client_orders')
        .insert({
          client_id: clientId,
          total_amount: subtotal,
          discount_percentage: discountPercentage,
          final_amount: total,
          payment_status: receiptUrl ? 'uploaded' : 'pending',
          receipt_url: receiptUrl,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      for (const item of cartItems) {
        const { error: itemError } = await sb
          .from('client_order_items')
          .insert({
            order_id: order.id,
            service_id: item.service.id,
            associate_id: item.associate?.id,
            university: item.university,
            sector: item.sector,
            price: Number(item.service.price),
          });

        if (itemError) throw itemError;
      }

      // Clear cart
      const { error: deleteError } = await sb
        .from('client_cart')
        .delete()
        .eq('client_id', clientId);

      if (deleteError) throw deleteError;

      // Send notification to admin
      await sb.functions.invoke('send-client-order-notification', {
        body: { orderId: order.id },
      });

      toast.success(receiptUrl 
        ? "Order placed successfully! Your payment will be verified shortly."
        : "Order created! Please upload your payment receipt or transfer funds to complete the order.");
      
      fetchCart();
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || "Failed to complete checkout");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <div>Loading cart...</div>;
  }

  const { subtotal, discountPercentage, discountAmount, total } = calculateTotals();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Your Cart ({cartItems.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cartItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start border-b pb-4">
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.service.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Category: {item.service.category}
                    </p>
                    {item.associate && (
                      <p className="text-sm mt-1">
                        Associate: {item.associate.first_name} {item.associate.last_name}
                      </p>
                    )}
                    {item.university && (
                      <Badge variant="secondary" className="mt-2">
                        {item.university}
                      </Badge>
                    )}
                    {item.sector && (
                      <Badge variant="outline" className="mt-2 ml-2">
                        {item.sector}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold">€{Number(item.service.price).toFixed(2)}</span>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>€{subtotal.toFixed(2)}</span>
                </div>
                {discountPercentage > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discountPercentage}%):</span>
                    <span>-€{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span>€{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {cartItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="font-semibold">Bank Transfer Details:</p>
              <p>Account Holder: Eric Petersen</p>
              <p>IBAN: IT123456789765</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please include your name in the transfer reference
              </p>
            </div>

            <div>
              <Label>Upload Payment Receipt (Optional)</Label>
              <Input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                If you don't upload now, you can upload later. We'll wait to receive your payment.
              </p>
            </div>

            {cartItems.some(item => item.associate) ? (
              <Button 
                onClick={() => setShowAvailabilityRequest(true)}
                className="w-full"
                size="lg"
              >
                <Send className="h-4 w-4 mr-2" />
                Request Availability from Associates
              </Button>
            ) : (
              <Button 
                onClick={handleCheckout} 
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? "Processing..." : "Complete Order"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {showAvailabilityRequest && (
        <AssociateAvailabilityRequest
          cartItems={cartItems}
          clientId={clientId}
          clientName={clientName}
          onClose={() => setShowAvailabilityRequest(false)}
          onSuccess={fetchCart}
        />
      )}
    </div>
  );
};

export default ClientCart;