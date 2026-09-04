import React, { useState } from "react";
import { Lock, LogOut, Shield, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AdminSettingsPanel } from "@/components/AdminSettingsPanel";
import { AppSettings } from "@/hooks/useAppSettings";

import defaultLogo from "@/assets/su-konstantin-petkanов-logo.png";

interface HeaderProps {
  settings: AppSettings;
  onSaveSettings: (updates: Partial<AppSettings>) => Promise<boolean>;
}

export function Header({ settings, onSaveSettings }: HeaderProps) {
  const { isAdmin, login, logout, user, isSuperAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const logoSrc = settings.logo_url || defaultLogo;

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Моля, въведете имейл и парола");
      return;
    }
    setIsLoggingIn(true);
    const result = await login(email, password);
    setIsLoggingIn(false);
    if (!result.error) {
      setEmail("");
      setPassword("");
      setIsDialogOpen(false);
      toast.success("Успешно влязохте като администратор");
    } else {
      toast.error(result.error);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.info("Излязохте от администраторския профил");
  };

  return (
    <header className="bg-table-header text-table-header-foreground shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoSrc}
              alt="Лого на училището"
              className="w-12 h-12 md:w-14 md:h-14 object-contain"
              loading="eager"
            />
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold truncate">
                {settings.header_title}
              </h1>
              <p className="text-sm opacity-90 truncate">
                {settings.header_subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/20 rounded-full">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">
                    {isSuperAdmin ? "Главен админ" : "Администратор"}
                  </span>
                </div>
                <AdminSettingsPanel settings={settings} onSave={onSaveSettings} />
              </>
            )}

            {isAdmin ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2 bg-transparent border-white/30 hover:bg-white/10"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Изход</span>
              </Button>
            ) : (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent border-white/30 hover:bg-white/10"
                  >
                    <Lock className="w-4 h-4" />
                    <span className="hidden sm:inline">Вход за админ</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Вход за администратор</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Потребителско име</Label>
                      <Input
                        id="login-email"
                        type="text"
                        autoCapitalize="none"
                        placeholder="admin"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleLogin();
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Парола</Label>
                      <PasswordInput
                        id="login-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleLogin();
                        }}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Отказ
                      </Button>
                      <Button onClick={handleLogin} disabled={isLoggingIn}>
                        {isLoggingIn ? "Влизане..." : "Вход"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
