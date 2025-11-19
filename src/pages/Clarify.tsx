import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Archive, Trash2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

const categories = ["design", "fitness", "english", "money", "relationships", "personal"];

const Clarify = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showConvert, setShowConvert] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [category, setCategory] = useState("");
  const [tinyNextStep, setTinyNextStep] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: inboxItems = [] } = useQuery({
    queryKey: ["inbox-clarify"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("inbox_items")
        .select("*")
        .eq("status", "inbox")
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const archiveItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("inbox_items")
        .update({ status: "archived" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-clarify"] });
      setCurrentIndex(0);
      toast({ title: "Archived" });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inbox_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-clarify"] });
      setCurrentIndex(0);
      toast({ title: "Deleted" });
    },
  });

  const convertToProject = useMutation({
    mutationFn: async () => {
      const item = inboxItems[currentIndex];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: projectError } = await supabase.from("projects").insert({
        user_id: user.id,
        outcome,
        category: category as any,
        tiny_next_step: tinyNextStep,
      });
      if (projectError) throw projectError;

      const { error: updateError } = await supabase
        .from("inbox_items")
        .update({ status: "converted" })
        .eq("id", item.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-clarify"] });
      setShowConvert(false);
      setOutcome("");
      setCategory("");
      setTinyNextStep("");
      setCurrentIndex(0);
      toast({
        title: "Project created!",
        description: "Your idea is now an active project.",
      });
    },
  });

  const currentItem = inboxItems[currentIndex];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Clarify</h1>
          <p className="text-muted-foreground mt-2">
            Review your inbox and decide what to do with each item.
          </p>
        </div>

        {inboxItems.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Your inbox is clear! Nothing to clarify right now.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="shadow-elevated">
              <CardContent className="pt-6 space-y-4">
                <div className="text-sm text-muted-foreground">
                  Item {currentIndex + 1} of {inboxItems.length}
                </div>
                <p className="text-lg text-foreground">{currentItem?.content}</p>
              </CardContent>
            </Card>

            {!showConvert ? (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => archiveItem.mutate(currentItem.id)}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
                <Button
                  variant="outline"
                  onClick={() => deleteItem.mutate(currentItem.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button
                  className="col-span-2"
                  onClick={() => setShowConvert(true)}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Convert to Project
                </Button>
              </div>
            ) : (
              <Card className="shadow-soft">
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>What's the outcome?</Label>
                    <Input
                      placeholder="e.g., Build a portfolio website"
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat} className="capitalize">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tiny next step (≤5 min)</Label>
                    <Textarea
                      placeholder="e.g., Research 3 portfolio examples"
                      value={tinyNextStep}
                      onChange={(e) => setTinyNextStep(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowConvert(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={!outcome || !category || !tinyNextStep}
                      onClick={() => convertToProject.mutate()}
                    >
                      Create Project
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Clarify;
