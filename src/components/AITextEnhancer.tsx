import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, RefreshCw, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AITextEnhancerProps {
  text: string;
  onAccept: (enhancedText: string) => void;
  onClose: () => void;
}

export const AITextEnhancer = ({ text, onAccept, onClose }: AITextEnhancerProps) => {
  const [enhancedText, setEnhancedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const enhanceText = async (action: "rephrase" | "structure") => {
    if (!text.trim()) {
      toast({
        title: "No text to enhance",
        description: "Please enter some text first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-text", {
        body: { text, action },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setEnhancedText(data.enhancedText);
    } catch (error: any) {
      console.error("Error enhancing text:", error);
      toast({
        title: "Enhancement failed",
        description: error.message || "Could not enhance text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-elevated border-2 border-primary/20">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">AI Enhancement</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => enhanceText("rephrase")}
            disabled={isLoading}
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Rephrase
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => enhanceText("structure")}
            disabled={isLoading}
            className="flex-1"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Structure
          </Button>
        </div>

        {isLoading && (
          <div className="py-4 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground mt-2">AI is thinking...</p>
          </div>
        )}

        {enhancedText && !isLoading && (
          <>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-foreground whitespace-pre-wrap">{enhancedText}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onAccept(enhancedText);
                  onClose();
                }}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Use This
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEnhancedText("")}
                className="flex-1"
              >
                Try Again
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
