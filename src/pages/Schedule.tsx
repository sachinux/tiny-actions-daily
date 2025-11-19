import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

const Schedule = () => {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [taskContent, setTaskContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ["active-projects"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: scheduledTasks = [] } = useQuery({
    queryKey: ["scheduled-tasks"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const today = new Date().toISOString().split("T")[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(outcome, category)")
        .gte("scheduled_date", today)
        .lte("scheduled_date", nextWeek)
        .is("completed_at", null)
        .order("scheduled_date", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const addTask = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const tasksOnDate = scheduledTasks.filter((t) => t.scheduled_date === selectedDate);
      if (tasksOnDate.length >= 3) {
        throw new Error("Maximum 3 tasks per day");
      }

      const project = projects.find((p) => p.id === selectedProject);
      
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        project_id: selectedProject || null,
        content: taskContent,
        category: project?.category || null,
        scheduled_date: selectedDate,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-tasks"] });
      setTaskContent("");
      setSelectedProject("");
      toast({ title: "Task scheduled!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() + i * 86400000);
    return date.toISOString().split("T")[0];
  });

  const groupedTasks = next7Days.map((date) => ({
    date,
    tasks: scheduledTasks.filter((t) => t.scheduled_date === date),
  }));

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Schedule</h1>
          <p className="text-muted-foreground mt-2">
            Plan your tiny actions for the next 7 days. Max 3 per day.
          </p>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">Add Task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="What's the tiny action?"
                value={taskContent}
                onChange={(e) => setTaskContent(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Link to project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.outcome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a date" />
                </SelectTrigger>
                <SelectContent>
                  {next7Days.map((date) => {
                    const tasksOnDate = scheduledTasks.filter((t) => t.scheduled_date === date).length;
                    return (
                      <SelectItem key={date} value={date} disabled={tasksOnDate >= 3}>
                        {new Date(date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        {tasksOnDate >= 3 && " (Full)"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!taskContent || !selectedDate}
              onClick={() => addTask.mutate()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Schedule Task
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {groupedTasks.map(({ date, tasks }) => (
            <Card key={date} className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                  <Badge variant="secondary" className="ml-auto">
                    {tasks.length}/3
                  </Badge>
                </CardTitle>
              </CardHeader>
              {tasks.length > 0 && (
                <CardContent className="space-y-2 pt-0">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{task.content}</p>
                        {task.projects && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.projects.outcome}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Schedule;
