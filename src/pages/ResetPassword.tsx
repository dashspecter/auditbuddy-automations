import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ClipboardCheck, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const ResetPassword = () => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValidSession, setIsValidSession] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordSchema = z.object({
    password: z.string().min(6, { message: t('auth.passwordMinLength') }),
    confirmPassword: z.string().min(6, { message: t('auth.passwordMinLength') }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.passwordsDontMatch'),
    path: ["confirmPassword"],
  });

  useEffect(() => {
    // Check if we have a valid recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidSession(true);
      } else {
        toast({
          title: t('auth.invalidLink'),
          description: t('auth.requestNewLink'),
          variant: "destructive",
        });
        navigate('/forgot-password');
      }
    });
  }, [navigate, toast, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const validated = passwordSchema.parse({ password, confirmPassword });

      const { error: updateError } = await supabase.auth.updateUser({
        password: validated.password,
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: t('auth.passwordResetSuccess'),
        description: t('auth.canSignInNow'),
      });

      // Sign out to clear the recovery session
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('auth.failedResetPassword'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 px-safe py-safe">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">{t('auth.validatingLink')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 px-safe py-safe">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-primary rounded-full p-3">
            <ClipboardCheck className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Dashspect</h1>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">{t('auth.setNewPassword')}</h2>
          <p className="text-muted-foreground">
            {t('auth.enterNewPassword')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.newPassword')}</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('auth.confirmNewPassword')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? t('auth.resetting') : t('auth.resetPassword')}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
