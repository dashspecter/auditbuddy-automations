import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, MessageSquare } from "lucide-react";
import {
  useAllClockInReminders,
  useCreateClockInReminder,
  useUpdateClockInReminder,
  useDeleteClockInReminder,
} from "@/hooks/useClockInReminders";

export function ClockInRemindersSettings() {
  const { data: reminders = [], isLoading } = useAllClockInReminders();
  const createReminder = useCreateClockInReminder();
  const updateReminder = useUpdateClockInReminder();
  const deleteReminder = useDeleteClockInReminder();
  
  const [newMessage, setNewMessage] = useState("");

  const handleAddReminder = () => {
    if (!newMessage.trim()) return;
    createReminder.mutate(newMessage.trim());
    setNewMessage("");
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    updateReminder.mutate({ id, is_active: !currentActive });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this reminder?")) {
      deleteReminder.mutate(id);
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
              <div
                key={reminder.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <p className={`flex-1 text-sm ${!reminder.is_active ? 'text-muted-foreground line-through' : ''}`}>
                  {reminder.message}
                </p>
                <div className="flex items-center gap-3">
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
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

