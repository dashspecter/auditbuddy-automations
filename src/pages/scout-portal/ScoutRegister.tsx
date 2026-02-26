import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ShieldX, CheckCircle } from 'lucide-react';

export default function ScoutRegister() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (!token) return;
    // Validate token
    const validate = async () => {
      const { data, error } = await supabase
        .from('scout_invites')
        .select('id, expires_at, used_at')
        .eq('token', token)
        .single();

      if (error || !data || data.used_at || new Date(data.expires_at) < new Date()) {
        setTokenValid(false);
      } else {
        setTokenValid(true);
      }
    };
    validate();
  }, [token]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Registration failed');

      // 2. Call register_scout RPC
      const { error: rpcError } = await supabase.rpc('register_scout', {
        p_invite_token: token,
        p_full_name: fullName,
        p_phone: phone || null,
        p_city: city || null,
      });

      if (rpcError) throw rpcError;

      setRegistered(true);
      toast.success('Registration successful!');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <ShieldX className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Invite</h1>
        <p className="text-muted-foreground">This invite link is invalid, expired, or has already been used.</p>
      </div>
    );
  }

  if (registered) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <CheckCircle className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Registration Complete!</h1>
        <p className="text-muted-foreground mb-6">
          Please check your email to verify your account. Once verified and approved, you can start accepting jobs.
        </p>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Join as Scout</CardTitle>
          <CardDescription>Create your scout account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+40 ..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Your city"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
