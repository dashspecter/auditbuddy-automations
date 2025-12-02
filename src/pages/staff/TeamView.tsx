import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { User, Mail, Phone, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const TeamView = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) loadTeam();
  }, [user]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = teamMembers.filter(member =>
        member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(teamMembers);
    }
  }, [searchQuery, teamMembers]);

  const loadTeam = async () => {
    try {
      // Get manager's company
      const { data: empData } = await supabase
        .from("employees")
        .select("company_id, location_id")
        .eq("user_id", user?.id)
        .single();

      if (!empData) return;

      // Get all team members in the same company
      const { data: members, error } = await supabase
        .from("employees")
        .select("*, locations(name)")
        .eq("company_id", empData.company_id)
        .eq("status", "active")
        .order("full_name");

      if (error) throw error;
      
      setTeamMembers(members || []);
      setFilteredMembers(members || []);
    } catch (error: any) {
      console.error("Failed to load team:", error);
      toast.error("Failed to load team members");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-hero text-primary-foreground px-safe pt-safe pb-6">
        <div className="px-4 pt-4">
          <h1 className="text-2xl font-bold mb-2">Team Members</h1>
          <p className="text-sm opacity-90">{teamMembers.length} active members</p>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-6">
        {/* Search */}
        <Card className="p-3 shadow-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Team Members List */}
        <div className="space-y-3">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
                  {member.full_name.charAt(0)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold">{member.full_name}</h3>
                      <Badge variant="outline" className="text-xs mt-1">
                        {member.role}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    {member.locations?.name && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{member.locations.name}</span>
                      </div>
                    )}
                    {member.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}
                    {member.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredMembers.length === 0 && (
          <Card className="p-8 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {searchQuery ? "No team members found" : "No team members yet"}
            </p>
          </Card>
        )}
      </div>

      <StaffBottomNav />
    </div>
  );
};

export default TeamView;
