import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const popularPages = [
    { name: t('notFound.dashboard'), path: '/dashboard' },
    { name: t('notFound.locations'), path: '/admin/locations' },
    { name: t('notFound.workforce'), path: '/workforce' },
    { name: t('notFound.audits'), path: '/audits' },
    { name: t('notFound.tasks'), path: '/tasks' },
    { name: t('notFound.settings'), path: '/settings' },
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
              <h1 className="text-4xl font-bold mb-2">{t('notFound.title')}</h1>
              <p className="text-muted-foreground text-lg">
                {t('notFound.description')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('notFound.goBack')}
              </Button>
              <Button onClick={() => navigate('/dashboard')}>
                <Home className="mr-2 h-4 w-4" />
                {t('notFound.goToDashboard')}
              </Button>
            </div>

            <div className="border-t pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                {t('notFound.tryPopularPages')}
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
