import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Calendar, Award } from "lucide-react";
import Layout from "@/components/Layout";

const Progress = () => {
  const { data: streakData } = useQuery({
    queryKey: ["streak-progress"],
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

  const { data: weeklyStats } = useQuery({
    queryKey: ["weekly-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(category)")
        .gte("completed_at", weekAgo)
        .not("completed_at", "is", null);
      
      if (error) throw error;

      const categoryCount: Record<string, number> = {};
      data.forEach((task) => {
        const category = task.projects?.category || "uncategorized";
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });

      const daysWithTasks = new Set(
        data.map((task) => new Date(task.completed_at!).toISOString().split("T")[0])
      ).size;

      return {
        totalTasks: data.length,
        daysWithTasks,
        categoryCount,
        topCategory: Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "none",
      };
    },
  });

  const { data: activeProjects } = useQuery({
    queryKey: ["active-projects-count"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      
      if (error) throw error;
      return count || 0;
    },
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Progress</h1>
          <p className="text-muted-foreground mt-2">
            Track your journey. Every tiny action counts.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="shadow-soft border-2 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {streakData?.current_streak || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {streakData?.current_streak === 1 ? "day" : "days"} with at least one action
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Streak</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {streakData?.longest_streak || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your personal record
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {streakData?.total_completions || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All time completions
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {activeProjects || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Projects in progress
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>This Week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tasks completed</span>
              <Badge>{weeklyStats?.totalTasks || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Days with at least 1 task</span>
              <Badge>{weeklyStats?.daysWithTasks || 0} / 7</Badge>
            </div>
            {weeklyStats?.topCategory && weeklyStats.topCategory !== "none" && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Top category</span>
                <Badge variant="secondary" className="capitalize">
                  {weeklyStats.topCategory}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft border-2 border-success/20 bg-success/5">
          <CardContent className="py-6">
            <p className="text-center text-muted-foreground italic">
              "You're rebuilding your life one tiny action at a time."
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Progress;
