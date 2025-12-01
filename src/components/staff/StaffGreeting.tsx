import { useEffect, useState } from "react";
import { User } from "lucide-react";

interface StaffGreetingProps {
  employeeName: string;
  shiftsToday: number;
}

export const StaffGreeting = ({ employeeName, shiftsToday }: StaffGreetingProps) => {
  const [greeting, setGreeting] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    setCurrentDate(date);
  }, []);

  return (
    <div className="bg-primary text-primary-foreground px-6 py-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
          <User className="h-6 w-6" />
        </div>
        <div className="text-sm opacity-90">{currentDate.toUpperCase()}</div>
      </div>
      <h1 className="text-2xl font-semibold mb-2">
        {greeting},<br />{employeeName.split(' ')[0]}.
      </h1>
      <p className="text-lg opacity-90">
        You have {shiftsToday === 0 ? "no" : shiftsToday === 1 ? "one" : shiftsToday} shift{shiftsToday !== 1 ? "s" : ""} today.
      </p>
    </div>
  );
};
