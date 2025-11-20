import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, DragEndEvent, DragOverlay, closestCorners } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanTask } from "@/components/KanbanTask";
import confetti from "canvas-confetti";

type TaskStatus = "backlog" | "today" | "in_progress" | "done";

const Schedule = () => {
  const [taskContent, setTaskContent] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
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

  const { data: tasks = [] } = useQuery({
    queryKey: ["kanban-tasks"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(outcome, category)")
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const addTask = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const project = projects.find((p) => p.id === selectedProject);
      
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        project_id: selectedProject || null,
        content: taskContent,
        category: project?.category || null,
        task_status: "backlog",
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-tasks"] });
      setTaskContent("");
      setSelectedProject("");
      toast({ title: "Task added to backlog!" });
    },
  });

  const moveTask = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: TaskStatus }) => {
      const updates: any = { task_status: newStatus };
      
      // Set completed_at when moving to done
      if (newStatus === "done") {
        updates.completed_at = new Date().toISOString();
        
        // Update streak
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const today = new Date().toISOString().split("T")[0];
          const { data: streak } = await supabase
            .from("streak_data")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (streak) {
            const lastDate = streak.last_completion_date;
            const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
            
            let newStreak = streak.current_streak;
            if (lastDate === yesterday) {
              newStreak += 1;
            } else if (lastDate !== today) {
              newStreak = 1;
            }

            await supabase
              .from("streak_data")
              .update({
                current_streak: newStreak,
                longest_streak: Math.max(newStreak, streak.longest_streak),
                last_completion_date: today,
                total_completions: streak.total_completions + 1,
              })
              .eq("user_id", user.id);
          }
        }
      }
      
      // Clear completed_at if moving out of done
      if (newStatus !== "done") {
        updates.completed_at = null;
      }
      
      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["streak"] });
      
      if (variables.newStatus === "done") {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#10b981", "#34d399", "#6ee7b7"],
        });
        toast({ title: "Well done!", description: "Task completed!" });
      }
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over || active.id === over.id) return;
    
    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    
    moveTask.mutate({ taskId, newStatus });
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.task_status === status);
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Kanban Board</h1>
          <p className="text-muted-foreground mt-2">
            Drag tasks between columns to update their status
          </p>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">Add New Task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="What's the tiny action?"
              value={taskContent}
              onChange={(e) => setTaskContent(e.target.value)}
            />
            <div 
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
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
            <Button
              className="w-full"
              disabled={!taskContent.trim()}
              onClick={() => addTask.mutate()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to Backlog
            </Button>
          </CardContent>
        </Card>

        <DndContext
          onDragStart={({ active }) => setActiveId(active.id as string)}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCorners}
        >
          <div className="grid md:grid-cols-4 gap-4">
            <KanbanColumn
              id="backlog"
              title="Backlog"
              count={getTasksByStatus("backlog").length}
            >
              {getTasksByStatus("backlog").map((task) => (
                <KanbanTask
                  key={task.id}
                  id={task.id}
                  content={task.content}
                  projectName={task.projects?.outcome}
                  category={task.projects?.category}
                  estimatedMinutes={task.estimated_minutes}
                />
              ))}
            </KanbanColumn>

            <KanbanColumn
              id="today"
              title="Today"
              count={getTasksByStatus("today").length}
              color="bg-primary/10 text-primary"
            >
              {getTasksByStatus("today").map((task) => (
                <KanbanTask
                  key={task.id}
                  id={task.id}
                  content={task.content}
                  projectName={task.projects?.outcome}
                  category={task.projects?.category}
                  estimatedMinutes={task.estimated_minutes}
                />
              ))}
            </KanbanColumn>

            <KanbanColumn
              id="in_progress"
              title="In Progress"
              count={getTasksByStatus("in_progress").length}
              color="bg-accent/50 text-accent-foreground"
            >
              {getTasksByStatus("in_progress").map((task) => (
                <KanbanTask
                  key={task.id}
                  id={task.id}
                  content={task.content}
                  projectName={task.projects?.outcome}
                  category={task.projects?.category}
                  estimatedMinutes={task.estimated_minutes}
                />
              ))}
            </KanbanColumn>

            <KanbanColumn
              id="done"
              title="Done"
              count={getTasksByStatus("done").length}
              color="bg-success/10 text-success"
            >
              {getTasksByStatus("done").map((task) => (
                <KanbanTask
                  key={task.id}
                  id={task.id}
                  content={task.content}
                  projectName={task.projects?.outcome}
                  category={task.projects?.category}
                  estimatedMinutes={task.estimated_minutes}
                />
              ))}
            </KanbanColumn>
          </div>

          <DragOverlay>
            {activeTask && (
              <KanbanTask
                id={activeTask.id}
                content={activeTask.content}
                projectName={activeTask.projects?.outcome}
                category={activeTask.projects?.category}
                estimatedMinutes={activeTask.estimated_minutes}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </Layout>
  );
};

export default Schedule;
