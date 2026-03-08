import React, { useState } from "react";
import { Lock, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

import schoolLogo from "@/assets/su-konstantin-petkanов-logo.png";

interface HeaderProps {
  settings: AppSettings;
  onSaveSettings: (updates: Partial<AppSettings>) => Promise<boolean>;
}

export function Header({ settings, onSaveSettings }: HeaderProps) {
  const { isAdmin, login, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleLogin = async () => {
    const success = await login(password);
    if (success) {
      setPassword("");
      setIsDialogOpen(false);
      toast.success("Успешно влязохте като администратор");
    } else {
      toast.error("Грешна парола");
    }
  };

  const handleLogout = () => {
    logout();
    toast.info("Излязохте от администраторския профил");
  };

  return (
    <header className="bg-table-header text-table-header-foreground shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={schoolLogo}
              alt="Лого на СУ Константин Петканов, Бургас"
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
                    Администратор
                  </span>
                </div>
                <AdminSettingsPanel settings={settings} onSave={onSaveSettings} />
              </>
            )}
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/20 rounded-full">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">
                    Администратор
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
                    <Input
                      type="password"
                      placeholder="Въведете парола"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleLogin();
                      }}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Отказ
                      </Button>
                      <Button onClick={handleLogin}>Вход</Button>
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
