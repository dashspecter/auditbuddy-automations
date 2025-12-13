import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";

interface ManagerLocation {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  full_name: string;
  role: string;
}

const StaffPerformanceReview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [managerLocations, setManagerLocations] = useState<ManagerLocation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const [formData, setFormData] = useState({
    location_id: "",
    employee_id: "",
    review_period_start: "",
    review_period_end: "",
    overall_rating: 0,
    strengths: "",
    areas_for_improvement: "",
    goals: "",
    comments: "",
    ratings: {
      punctuality: 0,
      teamwork: 0,
      communication: 0,
      technical_skills: 0,
      customer_service: 0,
      initiative: 0,
    } as Record<string, number>,
  });

  useEffect(() => {
    const initializeData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const { data: empData } = await supabase
          .from("employees")
          .select("id, company_id, location_id, locations(id, name)")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!empData) {
          toast.error("Employee record not found");
          navigate("/staff");
          return;
        }

        const { data: additionalLocations } = await supabase
          .from("staff_locations")
          .select("location_id, locations(id, name)")
          .eq("staff_id", empData.id);

        const allLocations: ManagerLocation[] = [];
        
        if (empData.locations) {
          allLocations.push({ 
            id: (empData.locations as any).id, 
            name: (empData.locations as any).name 
          });
        }
        
        if (additionalLocations) {
          additionalLocations.forEach((loc: any) => {
            if (loc.locations && !allLocations.find(l => l.id === loc.locations.id)) {
              allLocations.push({ id: loc.locations.id, name: loc.locations.name });
            }
          });
        }
        
        setManagerLocations(allLocations);

        if (allLocations.length > 0 && !formData.location_id) {
          setFormData(prev => ({ ...prev, location_id: allLocations[0].id }));
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user, navigate]);

  useEffect(() => {
    const loadEmployees = async () => {
      if (!formData.location_id) {
        setEmployees([]);
        return;
      }

      const { data } = await supabase
        .from("employees")
        .select("id, full_name, role")
        .eq("location_id", formData.location_id)
        .eq("status", "active")
        .order("full_name");

      setEmployees(data || []);
    };

    loadEmployees();
  }, [formData.location_id]);

  const handleRatingChange = (category: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [category]: value,
      },
    }));
  };

  const calculateOverallRating = () => {
    const ratings = Object.values(formData.ratings);
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / (ratings.length * 5)) * 100);
  };

  const handleSubmit = async () => {
    if (!user || !formData.employee_id || !formData.location_id) {
      toast.error("Please select an employee and location");
      return;
    }

    setSubmitting(true);

    try {
      const { data: empData } = await supabase
        .from("employees")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!empData) {
        toast.error("Employee not found");
        return;
      }

      const overallScore = calculateOverallRating();

      // Create a staff audit with performance review data
      const { error } = await supabase
        .from("staff_audits")
        .insert([{
          employee_id: formData.employee_id,
          location_id: formData.location_id,
          company_id: empData.company_id,
          auditor_id: user.id,
          audit_date: new Date().toISOString().split('T')[0],
          score: overallScore,
          notes: `Performance Review\n\nStrengths: ${formData.strengths}\n\nAreas for Improvement: ${formData.areas_for_improvement}\n\nGoals: ${formData.goals}\n\nComments: ${formData.comments}`,
          custom_data: {
            review_type: "performance_review",
            review_period_start: formData.review_period_start,
            review_period_end: formData.review_period_end,
            ratings: formData.ratings,
            strengths: formData.strengths,
            areas_for_improvement: formData.areas_for_improvement,
            goals: formData.goals,
            comments: formData.comments,
          },
        }]);

      if (error) throw error;

      toast.success("Performance review submitted successfully!");
      navigate("/staff");
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit performance review");
    } finally {
      setSubmitting(false);
    }
  };

  const ratingCategories = [
    { key: "punctuality", label: "Punctuality & Attendance" },
    { key: "teamwork", label: "Teamwork & Collaboration" },
    { key: "communication", label: "Communication Skills" },
    { key: "technical_skills", label: "Technical Skills" },
    { key: "customer_service", label: "Customer Service" },
    { key: "initiative", label: "Initiative & Problem Solving" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/staff/employee-audit")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Performance Review</h1>
            <p className="text-sm opacity-80">Comprehensive assessment</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Employee Selection */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4">Employee Information</h2>
          
          <div className="space-y-4">
            <div>
              <Label>Location *</Label>
              <Select 
                value={formData.location_id} 
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, location_id: value, employee_id: "" }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {managerLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Employee *</Label>
              <Select 
                value={formData.employee_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Review Period Start</Label>
                <Input
                  type="date"
                  value={formData.review_period_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, review_period_start: e.target.value }))}
                />
              </div>
              <div>
                <Label>Review Period End</Label>
                <Input
                  type="date"
                  value={formData.review_period_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, review_period_end: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Rating Categories */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4">Performance Ratings</h2>
          
          <div className="space-y-4">
            {ratingCategories.map((category) => (
              <div key={category.key} className="space-y-2">
                <Label>{category.label}</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      variant={formData.ratings[category.key] === rating ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleRatingChange(category.key, rating)}
                      className="flex-1 h-10"
                    >
                      {rating}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Feedback */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold">Detailed Feedback</h2>
          
          <div>
            <Label>Strengths</Label>
            <Textarea
              value={formData.strengths}
              onChange={(e) => setFormData(prev => ({ ...prev, strengths: e.target.value }))}
              placeholder="What does this employee do well?"
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Areas for Improvement</Label>
            <Textarea
              value={formData.areas_for_improvement}
              onChange={(e) => setFormData(prev => ({ ...prev, areas_for_improvement: e.target.value }))}
              placeholder="What could be improved?"
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Goals for Next Period</Label>
            <Textarea
              value={formData.goals}
              onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
              placeholder="What goals should the employee focus on?"
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Additional Comments</Label>
            <Textarea
              value={formData.comments}
              onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
              placeholder="Any other observations..."
              rows={3}
              className="mt-1"
            />
          </div>
        </Card>

        {/* Overall Score */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Overall Performance Score</span>
            <span className="text-lg font-bold text-primary">
              {calculateOverallRating()}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${calculateOverallRating()}%` }}
            />
          </div>
        </Card>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !formData.employee_id || !formData.location_id}
          className="w-full"
          size="lg"
        >
          {submitting ? "Submitting..." : "Submit Performance Review"}
        </Button>
      </div>

      <StaffBottomNav />
    </div>
  );
};

export default StaffPerformanceReview;
