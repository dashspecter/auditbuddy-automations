import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

const TestResult = () => {
  const { t } = useTranslation();
  const { testId, score, passed } = useParams();
  const navigate = useNavigate();
  const isPassed = passed === "true";
  const scoreValue = parseInt(score || "0");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="mb-6">
          {isPassed ? (
            <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="h-20 w-20 text-red-500 mx-auto mb-4" />
          )}
          <h1 className="text-3xl font-bold mb-2">
            {isPassed ? t("testResult.congratulations") : t("testResult.testComplete")}
          </h1>
          <p className="text-muted-foreground">
            {isPassed ? t("testResult.passedMessage") : t("testResult.failedMessage")}
          </p>
        </div>

        <div className="bg-muted rounded-lg p-6 mb-6">
          <p className="text-sm text-muted-foreground mb-2">{t("testResult.yourScore")}</p>
          <p className="text-5xl font-bold">{scoreValue}%</p>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          {isPassed ? t("testResult.passedDetail") : t("testResult.failedDetail")}
        </p>

        <Button onClick={() => navigate("/staff")} variant="outline" className="w-full">
          {t("testResult.backToHome")}
        </Button>
      </Card>
    </div>
  );
};

export default TestResult;
