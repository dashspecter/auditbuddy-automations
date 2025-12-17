import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ClipboardCheck, ArrowLeft, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const emailSchema = z.object({
    email: z.string().email({ message: t('auth.invalidEmail') }),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const validated = emailSchema.parse({ email });

      // Call edge function to send password reset email
      const { error: functionError } = await supabase.functions.invoke('send-password-reset', {
        body: { email: validated.email },
      });

      if (functionError) {
        throw functionError;
      }

      setEmailSent(true);
      toast({
        title: t('auth.emailSent'),
        description: t('auth.checkInbox'),
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('auth.failedSendReset'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 px-safe py-safe">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-primary rounded-full p-3">
            <ClipboardCheck className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Dashspect</h1>
        </div>

        {!emailSent ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">{t('auth.resetPasswordTitle')}</h2>
              <p className="text-muted-foreground">
                {t('auth.resetPasswordDesc')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                  <Mail className="h-5 w-5 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? t('auth.sending') : t('auth.sendResetLink')}
              </Button>

              <div className="text-center">
                <Link 
                  to="/auth" 
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  {t('auth.backToSignIn')}
                </Link>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="bg-success/10 border border-success/20 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-semibold">{t('auth.checkYourEmail')}</h2>
            <p className="text-muted-foreground">
              {t('auth.resetLinkSent')} <strong>{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              {t('auth.linkExpires')}
            </p>
            <div className="pt-4">
              <Link to="/auth">
                <Button variant="outline" className="w-full">
                  {t('auth.backToSignIn')}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ForgotPassword;
