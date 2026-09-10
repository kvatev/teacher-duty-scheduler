import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateAdminPassword } from "@/lib/auth";
import { localDB } from "@/lib/localDB";
import { PasswordInput } from "@/components/PasswordInput";
import { toast } from "sonner";

export default function SetupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@school.bg");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // If admin is already logged in or session is active, go home
    if (localDB.getAdminSession()) {
      navigate("/", { replace: true });
    }
    setIsChecking(false);
  }, [navigate]);

  const handleSetup = async () => {
    if (!password) {
      toast.error("Моля, въведете парола");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Паролите не съвпадат");
      return;
    }
    if (password.length < 6) {
      toast.error("Паролата трябва да е поне 6 символа");
      return;
    }

    setIsLoading(true);
    const result = await updateAdminPassword(password);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    localDB.setAdminSession(true);
    toast.success("Главният администратор е конфигуриран успешно!");
    navigate("/", { replace: true });
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Зареждане...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Първоначална настройка</CardTitle>
          <CardDescription>
            Създайте главен администраторски акаунт за системата за дежурства.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="setup-email">Имейл адрес</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="setup-email"
                type="email"
                className="pl-10"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-password">Парола</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <PasswordInput
                id="setup-password"
                className="pl-10"
                placeholder="Мин. 6 символа"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-confirm">Потвърдете паролата</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <PasswordInput
                id="setup-confirm"
                className="pl-10"
                placeholder="Повторете паролата"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSetup();
                }}
              />
            </div>
          </div>
          <Button className="w-full" onClick={handleSetup} disabled={isLoading}>
            {isLoading ? "Създаване..." : "Създай главен администратор"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
