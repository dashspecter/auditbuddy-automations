import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, GripVertical, MessageSquare, Users } from "lucide-react";
import {
  useAllClockInReminders,
  useCreateClockInReminder,
  useUpdateClockInReminder,
  useDeleteClockInReminder,
} from "@/hooks/useClockInReminders";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function ClockInRemindersSettings() {
  const { data: reminders = [], isLoading } = useAllClockInReminders();
  const { data: employeeRoles = [] } = useEmployeeRoles();
  const createReminder = useCreateClockInReminder();
  const updateReminder = useUpdateClockInReminder();
  const deleteReminder = useDeleteClockInReminder();
  
  const [newMessage, setNewMessage] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [expandedReminder, setExpandedReminder] = useState<string | null>(null);

  const handleAddReminder = () => {
    if (!newMessage.trim()) return;
    createReminder.mutate({ message: newMessage.trim(), target_roles: selectedRoles });
    setNewMessage("");
    setSelectedRoles([]);
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    updateReminder.mutate({ id, is_active: !currentActive });
  };

  const handleUpdateRoles = (id: string, roles: string[]) => {
    updateReminder.mutate({ id, target_roles: roles });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this reminder?")) {
      deleteReminder.mutate(id);
    }
  };

  const toggleRole = (role: string, currentRoles: string[], setRoles: (roles: string[]) => void) => {
    if (currentRoles.includes(role)) {
      setRoles(currentRoles.filter((r) => r !== role));
    } else {
      setRoles([...currentRoles, role]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Clock-In Welcome Messages
        </CardTitle>
        <CardDescription>
          Customize messages that appear when employees clock in. Great for daily reminders like hygiene protocols, uniform requirements, etc.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new reminder */}
        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a reminder message (e.g., Don't forget to wash your hands!)"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddReminder()}
            />
            <Button onClick={handleAddReminder} disabled={!newMessage.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
          
          {/* Role selection for new reminder */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Users className="h-3 w-3" />
              Target Roles (leave empty for all employees)
            </Label>
            <div className="flex flex-wrap gap-2">
              {employeeRoles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedRoles.includes(role.name)}
                    onCheckedChange={() => toggleRole(role.name, selectedRoles, setSelectedRoles)}
                  />
                  <span className="text-sm">{role.name}</span>
                </label>
              ))}
            </div>
            {selectedRoles.length > 0 && (
              <p className="text-xs text-muted-foreground">
                This reminder will only show to: {selectedRoles.join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Existing reminders */}
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No reminders yet. Add one above to show it when employees clock in.
            </p>
          ) : (
            reminders.map((reminder) => (
              <Collapsible
                key={reminder.id}
                open={expandedReminder === reminder.id}
                onOpenChange={(open) => setExpandedReminder(open ? reminder.id : null)}
              >
                <div className="border rounded-lg bg-card">
                  <div className="flex items-center gap-3 p-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!reminder.is_active ? 'text-muted-foreground line-through' : ''}`}>
                        {reminder.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {reminder.target_roles && reminder.target_roles.length > 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {reminder.target_roles.length} role{reminder.target_roles.length > 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">All employees</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Edit Roles
                        </Button>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={reminder.is_active}
                          onCheckedChange={() => handleToggleActive(reminder.id, reminder.is_active)}
                        />
                        <Label className="text-xs text-muted-foreground">
                          {reminder.is_active ? "Active" : "Inactive"}
                        </Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(reminder.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-1 border-t">
                      <Label className="text-xs mb-2 block">Select roles that should see this message:</Label>
                      <div className="flex flex-wrap gap-2">
                        {employeeRoles.map((role) => (
                          <label
                            key={role.id}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={reminder.target_roles?.includes(role.name) || false}
                              onCheckedChange={() => {
                                const currentRoles = reminder.target_roles || [];
                                const newRoles = currentRoles.includes(role.name)
                                  ? currentRoles.filter((r) => r !== role.name)
                                  : [...currentRoles, role.name];
                                handleUpdateRoles(reminder.id, newRoles);
                              }}
                            />
                            <span className="text-sm">{role.name}</span>
                          </label>
                        ))}
                      </div>
                      {(!reminder.target_roles || reminder.target_roles.length === 0) && (
                        <p className="text-xs text-muted-foreground mt-2">
                          No roles selected - this message shows to all employees
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
