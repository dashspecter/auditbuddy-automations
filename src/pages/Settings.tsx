import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, KeyRound, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { AvatarUpload } from "@/components/AvatarUpload";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordSchema = z.object({
    currentPassword: z.string().min(6, t('settings.passwordMinChars')),
    newPassword: z.string().min(6, t('settings.passwordMinChars')),
    confirmPassword: z.string().min(6, t('settings.passwordMinChars')),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: t('settings.passwordsDontMatch'),
    path: ["confirmPassword"],
  });

  // Fetch user profile for avatar
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, full_name, email')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      const validated = passwordSchema.parse({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setLoading(true);

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: validated.currentPassword,
      });

      if (signInError) {
        setErrors({ currentPassword: t('settings.currentPasswordIncorrect') });
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: validated.newPassword,
      });

      if (updateError) throw updateError;

      toast({
        title: t('settings.passwordUpdated'),
        description: t('settings.passwordChangedSuccess'),
      });

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: t('errors.generic'),
          description: t('settings.failedUpdatePassword'),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('settings.back')}
            </Button>
          </div>

          <div>
            <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
            <p className="text-muted-foreground">
              {t('settings.manageAccount')}
            </p>
          </div>

          <div className="max-w-2xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.profileAvatar')}</CardTitle>
                <CardDescription>
                  {t('settings.uploadProfilePicture')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <AvatarUpload 
                  currentAvatarUrl={profile?.avatar_url}
                  onAvatarUpdate={() => refetchProfile()}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  {t('settings.changePassword')}
                </CardTitle>
                <CardDescription>
                  {t('settings.updatePasswordDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">{t('settings.currentPassword')}</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={loading}
                    />
                    {errors.currentPassword && (
                      <p className="text-sm text-destructive">{errors.currentPassword}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t('settings.newPassword')}</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                    />
                    {errors.newPassword && (
                      <p className="text-sm text-destructive">{errors.newPassword}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('settings.confirmNewPassword')}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>

              <Button type="submit" disabled={loading} className="min-h-[48px]">
                {loading ? t('settings.updating') : t('settings.updatePassword')}
              </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  {t('settings.gettingStartedTutorial')}
                </CardTitle>
                <CardDescription>
                  {t('settings.reviewOnboardingDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('settings.revisitTutorialDesc')}
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setShowOnboarding(true)}
                  className="min-h-[48px]"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  {t('settings.restartTutorial')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      
      <OnboardingDialog open={showOnboarding} onOpenChange={setShowOnboarding} />
    </div>
  );
}
