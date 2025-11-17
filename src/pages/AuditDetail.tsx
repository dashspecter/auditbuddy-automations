import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, ArrowLeft, MapPin, User, Calendar, Download } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { generateAuditPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";

// Mock data - will be replaced with real database data later
const auditDetails = {
  1: {
    id: 1,
    type: "location",
    location: "LBFC Amzei",
    checker: "Vlad",
    date: "2025-10-27",
    status: "compliant",
    score: 87,
    sections: [
      { name: "Compliance", score: 85, items: ["Licenses displayed", "Health permits current", "Safety signage visible"] },
      { name: "Back of House", score: 90, items: ["Clean preparation areas", "Proper storage", "Equipment maintained"] },
      { name: "Cleaning", score: 88, items: ["Surfaces sanitized", "Floors clean", "Waste disposal proper"] },
      { name: "Front of House", score: 85, items: ["Customer areas clean", "Menus available", "Seating organized"] },
    ],
    notes: "Overall good compliance. Minor issues with signage placement."
  },
  2: {
    id: 2,
    type: "location",
    location: "LBFC Mosilor",
    checker: "Bogdan",
    date: "2025-10-26",
    status: "non-compliant",
    score: 65,
    sections: [
      { name: "Compliance", score: 60, items: ["Some licenses expired", "Health permits need renewal"] },
      { name: "Back of House", score: 70, items: ["Storage needs improvement", "Some equipment issues"] },
      { name: "Cleaning", score: 65, items: ["Surfaces need attention", "Waste area disorganized"] },
      { name: "Front of House", score: 70, items: ["Customer areas acceptable", "Some maintenance needed"] },
    ],
    notes: "Several compliance issues need immediate attention. Follow-up audit scheduled."
  },
};

const AuditDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const auditId = id ? parseInt(id) : null;
  const audit = auditId ? auditDetails[auditId as keyof typeof auditDetails] : null;

  const handleDownloadPDF = () => {
    if (!audit) return;
    
    try {
      generateAuditPDF(audit);
      toast({
        title: "PDF Generated",
        description: "Your audit report has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF report.",
        variant: "destructive",
      });
    }
  };

  if (!audit) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Audit Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested audit could not be found.</p>
            <Link to="/audits">
              <Button>Back to Audits</Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Link to="/audits">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground">Audit Details</h1>
              <p className="text-muted-foreground mt-1">Detailed information about this audit</p>
            </div>
          </div>

          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full p-3">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold text-foreground">{audit.location}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full p-3">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Checker</p>
                  <p className="font-semibold text-foreground">{audit.checker}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full p-3">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-semibold text-foreground">{audit.date}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full p-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="font-semibold text-foreground text-2xl">{audit.score}%</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">Status:</span>
              {audit.status === "compliant" && (
                <Badge className="bg-success text-success-foreground gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Compliant
                </Badge>
              )}
              {audit.status === "non-compliant" && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Issues Found
                </Badge>
              )}
              {audit.status === "pending" && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Pending
                </Badge>
              )}
              <Badge variant="outline" className="ml-auto">
                {audit.type}
              </Badge>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Audit Sections</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {audit.sections.map((section, index) => (
                <Card key={index} className="p-4 bg-secondary/30">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">{section.name}</h3>
                    <span className="text-lg font-bold text-primary">{section.score}%</span>
                  </div>
                  <ul className="space-y-2">
                    {section.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </Card>

          {audit.notes && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-3">Notes</h2>
              <p className="text-muted-foreground">{audit.notes}</p>
            </Card>
          )}

          <div className="flex gap-3">
            <Link to="/audits" className="flex-1">
              <Button variant="outline" className="w-full">
                Back to Audits
              </Button>
            </Link>
            <Button className="flex-1 gap-2" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuditDetail;
