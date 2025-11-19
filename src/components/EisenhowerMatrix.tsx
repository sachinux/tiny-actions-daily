import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, Trash2, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InboxItem {
  id: string;
  content: string;
  type: string;
  urgency: "low" | "high";
  importance: "low" | "high";
  created_at: string;
}

interface EisenhowerMatrixProps {
  items: InboxItem[];
  onItemClick: (item: InboxItem) => void;
}

export const EisenhowerMatrix = ({ items, onItemClick }: EisenhowerMatrixProps) => {
  const getQuadrantItems = (urgency: "low" | "high", importance: "low" | "high") => {
    return items.filter((item) => item.urgency === urgency && item.importance === importance);
  };

  const urgentImportant = getQuadrantItems("high", "high");
  const notUrgentImportant = getQuadrantItems("low", "high");
  const urgentNotImportant = getQuadrantItems("high", "low");
  const notUrgentNotImportant = getQuadrantItems("low", "low");

  const QuadrantCard = ({
    title,
    description,
    icon: Icon,
    items,
    className,
  }: {
    title: string;
    description: string;
    icon: any;
    items: InboxItem[];
    className?: string;
  }) => (
    <Card className={cn("shadow-soft h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <Badge variant="secondary">{items.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No items</p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemClick(item)}
              className="w-full text-left p-3 rounded-lg bg-muted hover:bg-muted/70 transition-colors"
            >
              <p className="text-sm font-medium text-foreground line-clamp-2">{item.content}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {item.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <QuadrantCard
        title="Do First"
        description="Urgent & Important"
        icon={AlertCircle}
        items={urgentImportant}
        className="border-2 border-destructive/30 bg-destructive/5"
      />
      <QuadrantCard
        title="Schedule"
        description="Not Urgent & Important"
        icon={Calendar}
        items={notUrgentImportant}
        className="border-2 border-primary/30 bg-primary/5"
      />
      <QuadrantCard
        title="Delegate"
        description="Urgent & Not Important"
        icon={Archive}
        items={urgentNotImportant}
        className="border-2 border-accent/30 bg-accent/5"
      />
      <QuadrantCard
        title="Eliminate"
        description="Not Urgent & Not Important"
        icon={Trash2}
        items={notUrgentNotImportant}
        className="border-2 border-muted/30 bg-muted/5"
      />
    </div>
  );
};
