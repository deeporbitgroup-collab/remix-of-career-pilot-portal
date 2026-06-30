import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Lock, CheckCircle, XCircle } from "lucide-react";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [resetRole, setResetRole] = useState<"company" | "student">("student");
  const token = searchParams.get("token");
  const loginPath = `/talent-pool/${resetRole}/auth`;

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }

    const validateToken = async () => {
      const roleFromUrl = searchParams.get("role");
      if (roleFromUrl === "company" || roleFromUrl === "student") {
        setResetRole(roleFromUrl);
      }

      try {
        const { data, error } = await supabase.rpc('talent_pool_get_reset_token_info', {
          _token: token
        });

        if (error || !data?.valid) {
          setTokenValid(false);
          return;
        }

        if (data.role === "company" || data.role === "student") {
          setResetRole(data.role);
        }

        setTokenValid(true);
      } catch {
        const roleFromUrl = searchParams.get("role");
        if (roleFromUrl === "company" || roleFromUrl === "student") {
          setResetRole(roleFromUrl);
          setTokenValid(true);
        } else {
          setTokenValid(false);
        }
      }
    };

    validateToken();
  }, [token, searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast({
        title: "Invalid Link",
        description: "The password reset link is invalid or expired.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast({
        title: "Weak Password",
        description: "Use at least one uppercase letter and one number.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.trim() !== newPassword || confirmPassword.trim() !== confirmPassword) {
      toast({
        title: "Invalid Password",
        description: "Password cannot start or end with spaces.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords match.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('talent_pool_reset_password', {
        _token: token,
        _new_password: newPassword.trim()
      });

      if (error) throw error;

      if (data === true) {
        toast({
          title: "Password Reset Successful",
          description: "Your password has been reset. You can now log in with your new password."
        });
        setTimeout(() => navigate(loginPath), 2000);
      } else {
        toast({
          title: "Reset Failed",
          description: "The reset link is invalid or has expired. Please request a new one.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Reset error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Validating reset link...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => navigate(loginPath)}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate(loginPath)}
            >
              Back to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
