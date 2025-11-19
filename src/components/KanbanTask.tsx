import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanTaskProps {
  id: string;
  content: string;
  projectName?: string;
  category?: string;
  estimatedMinutes: number;
}

export const KanbanTask = ({ id, content, projectName, category, estimatedMinutes }: KanbanTaskProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all",
        isDragging && "opacity-50 rotate-3"
      )}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{content}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {projectName && (
                <Badge variant="secondary" className="text-xs">
                  {projectName}
                </Badge>
              )}
              {category && (
                <Badge variant="outline" className="text-xs capitalize">
                  {category}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">~{estimatedMinutes} min</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
