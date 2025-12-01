import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";

const Staff = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Staff Directory</h1>
            <p className="text-muted-foreground mt-1">
              Manage your team members and their information
            </p>
          </div>
          <Link to="/workforce/staff/new">
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Staff Member
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Staff</CardTitle>
            <CardDescription>Find and manage your team members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, role, or location..." className="pl-10" />
              </div>
              <Button>Search</Button>
            </div>
            
            <div className="mt-6 text-center text-muted-foreground py-12">
              <p>No staff members yet.</p>
              <p className="text-sm mt-2">Start by adding your first team member.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Staff;