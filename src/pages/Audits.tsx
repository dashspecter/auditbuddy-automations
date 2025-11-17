import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Clock, Search, Plus, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const allAudits = [
  {
    id: 1,
    type: "location",
    location: "LBFC Amzei",
    checker: "Vlad",
    date: "2025-10-27",
    status: "compliant",
    score: 87,
  },
  {
    id: 2,
    type: "location",
    location: "LBFC Mosilor",
    checker: "Bogdan",
    date: "2025-10-26",
    status: "non-compliant",
    score: 65,
  },
  {
    id: 3,
    type: "location",
    location: "LBFC Timpuri Noi",
    checker: "Serdar",
    date: "2025-10-26",
    status: "pending",
    score: null,
  },
  {
    id: 4,
    type: "location",
    location: "LBFC Apaca",
    checker: "Iulian",
    date: "2025-10-25",
    status: "compliant",
    score: 92,
  },
  {
    id: 5,
    type: "staff",
    location: "LBFC Amzei",
    checker: "Maria",
    date: "2025-10-27",
    status: "compliant",
    score: 95,
  },
  {
    id: 6,
    type: "staff",
    location: "LBFC Mosilor",
    checker: "Ana",
    date: "2025-10-26",
    status: "non-compliant",
    score: 70,
  },
];

const Audits = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">All Audits</h1>
              <p className="text-muted-foreground mt-1">View and manage all location and staff audits</p>
            </div>
            <div className="flex gap-2">
              <Link to="/location-audit">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Location Audit
                </Button>
              </Link>
            </div>
          </div>

          <Card className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by location or checker..." 
                  className="pl-10"
                />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all-status">
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-status">All Status</SelectItem>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {allAudits.map((audit) => (
                <div
                  key={audit.id}
                  onClick={() => navigate(`/audits/${audit.id}`)}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors gap-3 cursor-pointer group"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{audit.location}</p>
                      <Badge variant="outline" className="text-xs">
                        {audit.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Checked by {audit.checker} • {audit.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {audit.score !== null && (
                      <span className="text-lg font-bold text-foreground">
                        {audit.score}%
                      </span>
                    )}
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
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Audits;
