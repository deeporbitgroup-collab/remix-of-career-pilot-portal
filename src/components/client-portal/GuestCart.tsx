import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Trash2, ShoppingCart, CreditCard } from "lucide-react";

interface Service {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  requires_university: boolean;
  requires_sector: boolean;
  requires_associate: boolean;
}

interface GuestCartItem {
  id: string;
  service: Service;
  associate?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  university?: string;
  sector?: string;
  specificRequest?: string;
}

interface GuestCartProps {
  cartItems: GuestCartItem[];
  onRemoveItem: (itemId: string) => void;
  onCheckout: () => void;
}

const GuestCart = ({ cartItems, onRemoveItem, onCheckout }: GuestCartProps) => {
  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.service.price), 0);
    return { subtotal, discountPercentage: 0, discountAmount: 0, total: subtotal };
  };

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
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mt-2">Browse our services and add items to your cart</p>
            </div>
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
                    {item.specificRequest && (
                      <div className="mt-2 p-2 bg-muted border border-border rounded text-xs">
                        <span className="font-medium text-foreground">Session focus: </span>
                        <span className="text-muted-foreground">{item.specificRequest}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold">€{Number(item.service.price).toFixed(2)}</span>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => onRemoveItem(item.id)}
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
        <Button onClick={onCheckout} className="w-full" size="lg">
          <CreditCard className="h-4 w-4 mr-2" />
          Proceed to Checkout
        </Button>
      )}
    </div>
  );
};

export default GuestCart;
