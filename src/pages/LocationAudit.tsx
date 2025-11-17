import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

const locations = ["LBFC Amzei", "LBFC Mosilor", "LBFC Timpuri Noi", "LBFC Apaca"];

const complianceAreas = [
  "Traceability",
  "Ingredient Quality Control",
  "Storage",
  "Preparation",
  "Hygiene",
];

const bohAreas = [
  "Hot Section",
  "Mounting Section",
  "Fridges",
  "Freezer",
  "Dry Deposit",
];

const cleaningAreas = [
  "Chemicals deposit",
  "Cleaning stuff deposit",
  "Dishwasher area",
  "Ustensils shelves",
];

const fohAreas = [
  "Packaging deposit",
  "Drinks Deposit",
  "Front desk",
  "Packaging area",
  "Fridges",
  "Papers shleve/closet",
];

const LocationAudit = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    checker: "",
    location: "",
    shift: "",
    compliance: {} as Record<string, string>,
    complianceExplanation: "",
    bohArea: {} as Record<string, string>,
    bohExplanation: "",
    cleaningArea: {} as Record<string, string>,
    cleaningExplanation: "",
    fohArea: {} as Record<string, string>,
    fohExplanation: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Location audit submitted successfully!");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Location Standard Checker</h1>
          <p className="text-muted-foreground">Complete the location audit form</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="checker">Checked by *</Label>
                <Input
                  id="checker"
                  required
                  value={formData.checker}
                  onChange={(e) => setFormData({ ...formData, checker: e.target.value })}
                  placeholder="Enter your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => setFormData({ ...formData, location: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift">Current Shift</Label>
                <Input
                  id="shift"
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  placeholder="Enter shift details"
                />
              </div>
            </div>
          </Card>

          {/* Compliance Check */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Priority Aspects - Compliance</h2>
            <div className="space-y-4">
              {complianceAreas.map((area) => (
                <div key={area} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                  <Label className="text-base">{area}</Label>
                  <RadioGroup
                    value={formData.compliance[area]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        compliance: { ...formData.compliance, [area]: value },
                      })
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="compliant" id={`${area}-compliant`} />
                      <Label htmlFor={`${area}-compliant`}>Compliant</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="non-compliant" id={`${area}-non-compliant`} />
                      <Label htmlFor={`${area}-non-compliant`}>Non-compliant</Label>
                    </div>
                  </RadioGroup>
                </div>
              ))}
              <div className="space-y-2 mt-4">
                <Label htmlFor="complianceExplanation">Explanation *</Label>
                <Textarea
                  id="complianceExplanation"
                  required
                  value={formData.complianceExplanation}
                  onChange={(e) =>
                    setFormData({ ...formData, complianceExplanation: e.target.value })
                  }
                  placeholder="Provide details about compliance status"
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* BOH Area */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">BOH (Back of House) Area</h2>
            <div className="space-y-4">
              {bohAreas.map((area) => (
                <div key={area} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                  <Label className="text-base">{area}</Label>
                  <RadioGroup
                    value={formData.bohArea[area]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        bohArea: { ...formData.bohArea, [area]: value },
                      })
                    }
                    className="flex gap-3"
                  >
                    {["Very Bad", "Ok", "Good", "Very Good"].map((rating) => (
                      <div key={rating} className="flex items-center space-x-2">
                        <RadioGroupItem value={rating} id={`${area}-${rating}`} />
                        <Label htmlFor={`${area}-${rating}`} className="text-sm">
                          {rating}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
              <div className="space-y-2 mt-4">
                <Label htmlFor="bohExplanation">Explanation *</Label>
                <Textarea
                  id="bohExplanation"
                  required
                  value={formData.bohExplanation}
                  onChange={(e) => setFormData({ ...formData, bohExplanation: e.target.value })}
                  placeholder="Provide details about BOH area conditions"
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* Cleaning Area */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Cleaning Area</h2>
            <div className="space-y-4">
              {cleaningAreas.map((area) => (
                <div key={area} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                  <Label className="text-base">{area}</Label>
                  <RadioGroup
                    value={formData.cleaningArea[area]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        cleaningArea: { ...formData.cleaningArea, [area]: value },
                      })
                    }
                    className="flex gap-3"
                  >
                    {["Very Bad", "Ok", "Good", "Very Good"].map((rating) => (
                      <div key={rating} className="flex items-center space-x-2">
                        <RadioGroupItem value={rating} id={`cleaning-${area}-${rating}`} />
                        <Label htmlFor={`cleaning-${area}-${rating}`} className="text-sm">
                          {rating}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
              <div className="space-y-2 mt-4">
                <Label htmlFor="cleaningExplanation">Explanation *</Label>
                <Textarea
                  id="cleaningExplanation"
                  required
                  value={formData.cleaningExplanation}
                  onChange={(e) =>
                    setFormData({ ...formData, cleaningExplanation: e.target.value })
                  }
                  placeholder="Provide details about cleaning area conditions"
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* FOH Area */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">FOH (Front of House) Area</h2>
            <div className="space-y-4">
              {fohAreas.map((area) => (
                <div key={area} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                  <Label className="text-base">{area}</Label>
                  <RadioGroup
                    value={formData.fohArea[area]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        fohArea: { ...formData.fohArea, [area]: value },
                      })
                    }
                    className="flex gap-3"
                  >
                    {["Very Bad", "Ok", "Good", "Very Good"].map((rating) => (
                      <div key={rating} className="flex items-center space-x-2">
                        <RadioGroupItem value={rating} id={`foh-${area}-${rating}`} />
                        <Label htmlFor={`foh-${area}-${rating}`} className="text-sm">
                          {rating}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
              <div className="space-y-2 mt-4">
                <Label htmlFor="fohExplanation">Explanation *</Label>
                <Textarea
                  id="fohExplanation"
                  required
                  value={formData.fohExplanation}
                  onChange={(e) => setFormData({ ...formData, fohExplanation: e.target.value })}
                  placeholder="Provide details about FOH area conditions"
                  rows={3}
                />
              </div>
            </div>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              Submit Audit
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/")}>
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default LocationAudit;
