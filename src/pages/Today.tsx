import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import confetti from "canvas-confetti";

const Today = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: todayTasks = [] } = useQuery({
    queryKey: ["today-tasks"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(outcome, category)")
        .eq("task_status", "today")
        .is("completed_at", null)
        .order("created_at", { ascending: true })
        .limit(3);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: streakData } = useQuery({
    queryKey: ["streak"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("streak_data")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", taskId);
      
      if (error) throw error;

      // Update streak
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["streak"] });
      
      // Celebration
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#6ee7b7"],
      });
      
      toast({
        title: "Well done!",
        description: "You're building your life, one tiny action at a time.",
      });
    },
  });

  const completedToday = todayTasks.filter((t) => t.completed_at).length;
  const totalToday = todayTasks.length;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Today</h1>
          <p className="text-muted-foreground mt-2">
            Focus on your tiny actions. Maximum 3 per day.
          </p>
        </div>

        {/* Streak card */}
        {streakData && (
          <Card className="shadow-soft border-2 border-primary/20">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-4xl font-bold text-primary mt-1">
                    {streakData.current_streak}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {streakData.current_streak === 1 ? "day" : "days"} in a row
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Best Streak</p>
                  <p className="text-2xl font-semibold text-foreground mt-1">
                    {streakData.longest_streak}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks */}
        <div className="space-y-3">
          {totalToday === 0 ? (
            <Card className="shadow-soft">
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  No tasks scheduled for today. Go to Schedule to add some!
                </p>
              </CardContent>
            </Card>
          ) : (
            todayTasks.map((task) => (
              <Card key={task.id} className="shadow-soft hover:shadow-elevated transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={!!task.completed_at}
                      onCheckedChange={() => completeTask.mutate(task.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-foreground font-medium">{task.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {task.projects && (
                          <Badge variant="secondary" className="text-xs">
                            {task.projects.outcome}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          ~{task.estimated_minutes} min
                        </span>
                      </div>
                    </div>
                    {task.completed_at && (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {totalToday > 0 && completedToday === totalToday && (
          <Card className="shadow-soft border-2 border-success/20 bg-success/5">
            <CardContent className="py-6 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-3" />
              <p className="text-lg font-semibold text-success">All done for today!</p>
              <p className="text-muted-foreground mt-1">
                You're rebuilding your life one tiny action at a time.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Today;
