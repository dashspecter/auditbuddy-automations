import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Mail, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function PendingApproval() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: company, refetch } = useQuery({
    queryKey: ['company', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('company_users')
        .select(`
          company_id,
          companies (
            id,
            name,
            status,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data?.companies;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (company?.status === 'active') {
      navigate('/dashboard');
    }
  }, [company, navigate]);

  const handleRefresh = async () => {
    await refetch();
    if (company?.status === 'active') {
      toast({
        title: "Welcome!",
        description: "Your company has been approved. Redirecting to dashboard...",
      });
    } else {
      toast({
        title: "Still Pending",
        description: "Your company is still awaiting approval.",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-2xl">
        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Pending Approval</CardTitle>
            <CardDescription className="text-base">
              Your company registration is awaiting approval from our team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Company: {company?.name}</h3>
              <p className="text-sm text-muted-foreground">
                Registered: {company?.created_at ? new Date(company.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">What happens next?</p>
                  <p className="text-sm text-muted-foreground">
                    Our team will review your registration and send you an email once your company is approved. 
                    This typically takes 1-2 business days.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button onClick={handleRefresh} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Approval Status
              </Button>
              <Button onClick={handleSignOut} variant="ghost" className="w-full">
                Sign Out
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground pt-4 border-t">
              <p>Need help? Contact support at support@dashspect.com</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
