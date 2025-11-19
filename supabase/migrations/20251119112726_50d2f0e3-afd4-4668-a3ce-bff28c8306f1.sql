-- Add urgency and importance to inbox_items for Eisenhower Matrix
CREATE TYPE urgency_level AS ENUM ('low', 'high');
CREATE TYPE importance_level AS ENUM ('low', 'high');

ALTER TABLE public.inbox_items 
ADD COLUMN urgency urgency_level DEFAULT 'low',
ADD COLUMN importance importance_level DEFAULT 'low';

-- Add task status for Kanban board
CREATE TYPE task_status AS ENUM ('backlog', 'today', 'in_progress', 'done');

ALTER TABLE public.tasks 
ADD COLUMN task_status task_status DEFAULT 'backlog';

-- Update existing tasks: set tasks with scheduled_date = today to 'today' status
UPDATE public.tasks 
SET task_status = 'today' 
WHERE scheduled_date = CURRENT_DATE AND completed_at IS NULL;

-- Update existing completed tasks to 'done' status
UPDATE public.tasks 
SET task_status = 'done' 
WHERE completed_at IS NOT NULL;