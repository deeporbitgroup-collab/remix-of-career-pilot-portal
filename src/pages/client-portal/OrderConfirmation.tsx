import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Package, Calendar, ArrowRight, Home } from "lucide-react";
import { format } from "date-fns";
import bgImage from "@/assets/client-portal-bg.jpeg";

interface OrderItem {
  serviceName: string;
  price: number;
  associateName?: string;
}

interface OrderData {
  orderId: string;
  items: OrderItem[];
  subtotal: number;
  discountPercentage: number;
  total: number;
  createdAt: Date;
  hasReceipt: boolean;
}

const OrderConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // Get order data from location state
    if (location.state?.orderData) {
      setOrderData(location.state.orderData);
    } else {
      // If no order data, redirect to dashboard
      navigate('/client-portal/dashboard');
    }
  }, [location.state, navigate]);

  useEffect(() => {
    // Auto-redirect countdown
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      navigate('/client-portal/dashboard');
    }
  }, [countdown, navigate]);

  if (!orderData) {
    return null;
  }

  return (
    <div 
      className="min-h-screen p-4 md:p-6 relative flex items-center justify-center"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      
      <div className="relative z-10 w-full max-w-2xl">
        <Card className="backdrop-blur-md bg-background/95 shadow-2xl border-0 overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center text-white">
            <div className="flex justify-center mb-4">
              <div className="bg-white/20 rounded-full p-4 backdrop-blur-sm">
                <CheckCircle2 className="h-16 w-16" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
            <p className="text-white/90">Thank you for your purchase</p>
          </div>

          <CardContent className="p-6 md:p-8">
            {/* Order Number */}
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="text-lg font-mono font-semibold text-foreground">
                #{orderData.orderId.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(orderData.createdAt), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>

            <Separator className="my-6" />

            {/* Order Items */}
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold flex items-center gap-2 text-foreground">
                <Package className="h-5 w-5 text-primary" />
                Your Services
              </h3>
              <div className="space-y-3">
                {orderData.items.map((item, index) => (
                  <div 
                    key={index} 
                    className="flex justify-between items-start p-4 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.serviceName}</p>
                      {item.associateName && (
                        <p className="text-sm text-muted-foreground">
                          Mentor: {item.associateName}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold text-foreground">€{item.price}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Order Total */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>€{orderData.subtotal.toFixed(2)}</span>
              </div>
              {orderData.discountPercentage > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({orderData.discountPercentage}%)</span>
                  <span>-€{((orderData.subtotal * orderData.discountPercentage) / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-foreground pt-2">
                <span>Total</span>
                <span>€{orderData.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Status */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">
                    {orderData.hasReceipt ? "Payment Receipt Uploaded" : "Payment Pending"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {orderData.hasReceipt 
                      ? "Your payment is being verified. We'll notify you once confirmed."
                      : "Please upload your payment receipt from your dashboard to complete the order."}
                  </p>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold mb-3 text-foreground">What's Next?</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Your order has been received
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Your availability slots have been saved
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-primary" />
                  Our team will review and confirm your booking
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  You'll receive confirmation via email
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="flex-1"
                onClick={() => navigate('/client-portal/dashboard')}
              >
                <Home className="h-4 w-4 mr-2" />
                Go to My Flight Plan
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate('/client-portal/services')}
              >
                Continue Shopping
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            {/* Auto-redirect notice */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Redirecting to your dashboard in {countdown} seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderConfirmation;
