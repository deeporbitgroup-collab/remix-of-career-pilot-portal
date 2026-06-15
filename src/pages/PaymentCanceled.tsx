import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";

const PaymentCanceled = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const kind = params.get("kind");

  const retry = () => {
    if (kind === "kb_order") return navigate("/knowledge-base/checkout");
    if (kind === "client_order") return navigate("/client-portal/checkout");
    if (kind === "talent_pool_subscription") return navigate("/talent-pool/student/dashboard");
    return navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 text-center space-y-4">
          <XCircle className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold">Payment canceled</h2>
          <p className="text-muted-foreground">
            No charge was made. You can try again whenever you're ready.
          </p>
          <div className="flex gap-3 justify-center pt-4">
            <Button onClick={retry}>Try again</Button>
            <Button variant="outline" onClick={() => navigate("/")}>Home</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCanceled;
