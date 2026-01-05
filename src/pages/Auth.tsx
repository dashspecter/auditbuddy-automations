import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const Auth = () => {
  const { t } = useTranslation();
  
  const authSchema = z.object({
    email: z.string().email({ message: t('auth.invalidEmail') }),
    password: z.string().min(6, { message: t('auth.passwordMinLength') }),
    fullName: z.string().min(2, { message: t('auth.nameMinLength') }).optional(),
  });

  const signUpSchema = authSchema.extend({
    fullName: z.string().min(2, { message: t('auth.nameMinLength') }),
    companyName: z.string().min(2, { message: t('auth.companyNameMinLength') }),
    companySlug: z.string()
      .min(2, { message: t('auth.slugMinLength') })
      .regex(/^[a-z0-9-]+$/, { message: t('auth.slugFormat') }),
  });

  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({ 
    email: '', 
    password: '', 
    fullName: '', 
    companyName: '', 
    companySlug: '' 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const navigate = useNavigate();
  const { user, isStaff, staffCheckComplete } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !staffCheckComplete) return;
    navigate(isStaff ? "/staff" : "/dashboard", { replace: true });
  }, [user, isStaff, staffCheckComplete, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const validated = authSchema.parse({ email: signInData.email, password: signInData.password });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError(t('auth.invalidCredentials'));
        } else {
          setError(error.message);
        }
        return;
      }

      // Log the login activity
      if (data.user) {
        await supabase.rpc('log_activity', {
          p_user_id: data.user.id,
          p_activity_type: 'login',
          p_description: `Logged in to Dashspect`,
          p_metadata: {}
        });
        
        // Store remember me preference
        localStorage.setItem('rememberMe', rememberMe.toString());
        
        // If not remember me, update session to use sessionStorage instead of localStorage
        // This way the session expires when browser closes (no deprecated beforeunload needed)
        if (!rememberMe) {
          // Get the current session and update the storage
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // Clear localStorage and move to sessionStorage
            localStorage.removeItem('sb-lnscfmmwqxlkeunfhfdh-auth-token');
            sessionStorage.setItem('sb-lnscfmmwqxlkeunfhfdh-auth-token', JSON.stringify(session));
          }
        }
      }

      toast({
        title: t('auth.welcomeBack'),
        description: t('auth.signedInSuccess'),
      });

      // Let the app decide where to land (staff users go to /staff, others to /dashboard)
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError(t('auth.unexpectedError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const validated = signUpSchema.parse(signUpData);
      
      // Check if company slug is already taken
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('slug', validated.companySlug)
        .single();

      if (existingCompany) {
        setError(t('auth.slugTaken'));
        setLoading(false);
        return;
      }
      
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: validated.fullName,
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError(t('auth.emailRegistered'));
        } else {
          setError(authError.message);
        }
        return;
      }

      if (!authData.user) {
        setError(t('auth.failedCreateUser'));
        return;
      }

      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: validated.companyName,
          slug: validated.companySlug,
          status: 'active',
          subscription_tier: 'free',
        })
        .select()
        .single();

      if (companyError) {
        console.error('Company creation error:', companyError);
        setError(t('auth.failedCreateCompany'));
        return;
      }

      // Link user to company as owner
      const { error: companyUserError } = await supabase
        .from('company_users')
        .insert({
          user_id: authData.user.id,
          company_id: company.id,
          company_role: 'company_owner',
        });

      if (companyUserError) {
        console.error('Company user linking error:', companyUserError);
        setError(t('auth.failedLinkAccount'));
        return;
      }

      // Assign admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'admin',
        });

      if (roleError) {
        console.error('Role assignment error:', roleError);
      }

      toast({
        title: t('auth.companyCreated'),
        description: t('auth.chooseModules'),
      });
      navigate('/onboarding/modules');
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError(t('auth.unexpectedError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 px-safe py-safe">
        <Card className="w-full max-w-md p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img 
              src="/dashspect-logo-512.png?v=2" 
              alt="DashSpect" 
              className="h-12 w-12 rounded-xl bg-primary p-1.5"
            />
            <h1 className="text-2xl font-bold text-foreground">Dashspect</h1>
          </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
            <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">{t('auth.email')}</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="your@email.com"
                  value={signInData.email}
                  onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">{t('auth.password')}</Label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember-me" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label 
                  htmlFor="remember-me" 
                  className="text-sm font-normal cursor-pointer"
                >
                  {t('auth.rememberMe')}
                </Label>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full min-h-[48px]" disabled={loading}>
                {loading ? t('auth.signingIn') : t('auth.signIn')}
              </Button>
              <div className="text-center pt-2">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:underline font-medium"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">{t('auth.fullName')}</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={signUpData.fullName}
                  onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">{t('auth.email')}</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={signUpData.email}
                  onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">{t('auth.password')}</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showSignUpPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSignUpPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="border-t border-border my-4"></div>
              <div className="space-y-2">
                <Label htmlFor="signup-company-name">{t('auth.companyName')}</Label>
                <Input
                  id="signup-company-name"
                  type="text"
                  placeholder="Acme Corp"
                  value={signUpData.companyName}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setSignUpData({ ...signUpData, companyName: name, companySlug: slug });
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-company-slug">{t('auth.companySlug')}</Label>
                <Input
                  id="signup-company-slug"
                  type="text"
                  placeholder="acme-corp"
                  value={signUpData.companySlug}
                  onChange={(e) => setSignUpData({ ...signUpData, companySlug: e.target.value.toLowerCase() })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t('auth.companyUrlPreview', { slug: signUpData.companySlug || 'your-slug' })}
                </p>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full min-h-[48px]" disabled={loading}>
                {loading ? t('auth.creatingAccount') : t('auth.signUp')}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;
