import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { StaffAuditForm } from "@/components/StaffAuditForm";
import { StaffLeaderboard } from "@/components/StaffLeaderboard";
import { EmployeeLeaderboard } from "@/components/dashboard/EmployeeLeaderboard";
import { useState } from "react";

export default function StaffAudits() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Staff Performance Audits</h1>
            <p className="text-muted-foreground mt-2">
              Track and evaluate employee performance
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            + New Staff Performance
          </Button>
        </div>

        {showForm && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Submit Staff Performance Audit</h2>
            <StaffAuditForm onSuccess={() => setShowForm(false)} />
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EmployeeLeaderboard />
          <StaffLeaderboard />
        </div>
      </div>
    </div>
  );
}
