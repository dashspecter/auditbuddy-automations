import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const navigate = useNavigate();

  const popularPages = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Locations', path: '/admin/locations' },
    { name: 'Workforce', path: '/workforce' },
    { name: 'Audits', path: '/audits' },
    { name: 'Tasks', path: '/tasks' },
    { name: 'Settings', path: '/settings' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-2xl w-full">
        <Card>
          <CardContent className="pt-12 pb-8 px-6 text-center">
            <div className="mb-6">
              <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="h-12 w-12 text-muted-foreground" />
              </div>
              <h1 className="text-4xl font-bold mb-2">404 - Page Not Found</h1>
              <p className="text-muted-foreground text-lg">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button onClick={() => navigate('/dashboard')}>
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
            </div>

            <div className="border-t pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                Or try one of these popular pages:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {popularPages.map((page) => (
                  <Button
                    key={page.path}
                    variant="ghost"
                    onClick={() => navigate(page.path)}
                    className="text-sm"
                  >
                    {page.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
