import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Lightbulb, CheckSquare, FileText, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { AITextEnhancer } from "@/components/AITextEnhancer";

const Inbox = () => {
  const [content, setContent] = useState("");
  const [type, setType] = useState<"idea" | "task" | "note">("idea");
  const [showAIEnhancer, setShowAIEnhancer] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: inboxItems = [] } = useQuery({
    queryKey: ["inbox"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("inbox_items")
        .select("*")
        .eq("status", "inbox")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const addItem = useMutation({
    mutationFn: async (newItem: { content: string; type: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("inbox_items").insert({
        user_id: user.id,
        content: newItem.content,
        type: newItem.type as any,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      setContent("");
      toast({
        title: "Captured!",
        description: "Your idea is safely stored.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    addItem.mutate({ content, type });
  };

  const typeIcons = {
    idea: Lightbulb,
    task: CheckSquare,
    note: FileText,
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Inbox</h1>
          <p className="text-muted-foreground mt-2">
            Capture anything that comes to mind. No pressure, just capture.
          </p>
        </div>

        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2 mb-3">
                {(["idea", "task", "note"] as const).map((t) => {
                  const Icon = typeIcons[t];
                  return (
                    <Button
                      key={t}
                      type="button"
                      variant={type === t ? "default" : "outline"}
                      size="sm"
                      onClick={() => setType(t)}
                      className="capitalize"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {t}
                    </Button>
                  );
                })}
              </div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                className="min-h-[100px] resize-none"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAIEnhancer(true)}
                  disabled={!content.trim()}
                  className="flex-shrink-0"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Enhance with AI
                </Button>
                <Button type="submit" className="flex-1" disabled={!content.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Capture
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {showAIEnhancer && (
          <AITextEnhancer
            text={content}
            onAccept={(enhancedText) => setContent(enhancedText)}
            onClose={() => setShowAIEnhancer(false)}
          />
        )}

        <div className="space-y-3">
          {inboxItems.length === 0 ? (
            <Card className="shadow-soft">
              <CardContent className="py-12 text-center">
                <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Your inbox is empty. Capture your first idea!
                </p>
              </CardContent>
            </Card>
          ) : (
            inboxItems.map((item) => {
              const Icon = typeIcons[item.type as keyof typeof typeIcons];
              return (
                <Card key={item.id} className="shadow-soft hover:shadow-elevated transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground">{item.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="capitalize text-xs">
                            {item.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Inbox;
