import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function UserMenu() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile?.full_name]);

  // Load avatar URL
  useEffect(() => {
    if (!user?.id) return;
    const { data } = supabase.storage.from("avatars").getPublicUrl(`${user.id}/avatar`);
    // Check if file exists by trying to fetch with cache bust
    const url = `${data.publicUrl}?t=${Date.now()}`;
    fetch(url, { method: "HEAD" }).then(res => {
      if (res.ok) setAvatarUrl(url);
      else setAvatarUrl(null);
    }).catch(() => setAvatarUrl(null));
  }, [user?.id, uploadingAvatar]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const getPlanLabel = () => {
    const isMentorado = profile?.is_mentorado;
    const isW3Client = profile?.is_w3_client;
    if (isMentorado) return "Plano Mentorado";
    if (isW3Client) return "Plano W3";
    if (profile?.plan_type === "paid") return "Plano Pago";
    if (profile?.plan_type === "manual") return "Acesso Manual";
    return "Plano Free";
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem deve ter no máximo 2MB", variant: "destructive" });
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Erro", description: "Formato aceito: JPG, PNG ou WebP", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    const { error } = await supabase.storage
      .from("avatars")
      .upload(`${user.id}/avatar`, file, { upsert: true });

    if (error) {
      toast({ title: "Erro", description: "Erro ao enviar foto", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Foto atualizada!" });
    }
    setUploadingAvatar(false);
  };

  const handleSaveAccount = async () => {
    setIsLoading(true);
    try {
      if (fullName !== profile?.full_name) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ full_name: fullName })
          .eq("user_id", user?.id);
        if (profileError) throw profileError;
      }

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          toast({ title: "Erro", description: "As senhas não coincidem", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        if (newPassword.length < 6) {
          toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
        if (passwordError) throw passwordError;
      }

      toast({ title: "Sucesso", description: "Informações atualizadas com sucesso" });
      await refreshProfile();
      setAccountDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao atualizar informações", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-center rounded-full ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Avatar className="h-9 w-9 cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarImage src={avatarUrl || ""} alt={profile?.full_name || "Usuário"} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 z-50 bg-popover">
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={avatarUrl || ""} alt={profile?.full_name || "Usuário"} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {profile?.full_name || "Usuário"}
                </p>
                <p className="text-xs leading-none text-muted-foreground truncate max-w-[140px]">
                  {user?.email}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAccountDialogOpen(true)} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Conta
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5">
            <p className="text-xs text-muted-foreground">{getPlanLabel()}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Configurações da Conta</DialogTitle>
            <DialogDescription>
              Atualize suas informações pessoais e senha.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl || ""} alt={profile?.full_name || "Usuário"} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <Upload className="h-3 w-3" />
                {uploadingAvatar ? "Enviando..." : "Alterar foto"}
              </Button>
              <p className="text-[10px] text-muted-foreground">JPG, PNG ou WebP • Máx 2MB</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Deixe em branco para manter" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirme a nova senha" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAccount} disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
