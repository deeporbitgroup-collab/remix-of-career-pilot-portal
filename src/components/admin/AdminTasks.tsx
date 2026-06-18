import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  ListTodo, Plus, Loader2, Trash2, ChevronLeft, ChevronRight,
  Flag, User, CalendarClock, CheckCircle2,
} from "lucide-react";

// admin_tasks isn't in the generated Database types, so reuse the authenticated
// client untyped (same session/auth) — mirrors the CRM client pattern.
const db = supabase as unknown as SupabaseClient;

type Status = "todo" | "doing" | "done";

interface Task {
  id: string;
  title: string;
  notes: string;
  assignee: string;
  status: Status;
  priority: number;
  due_date: string | null;
  position: number;
  created_at: string;
}

const COLUMNS: { key: Status; label: string; accent: string }[] = [
  { key: "todo", label: "To do", accent: "border-t-muted-foreground/40" },
  { key: "doing", label: "In progress", accent: "border-t-amber-400" },
  { key: "done", label: "Done", accent: "border-t-emerald-500" },
];

const AdminTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [highPriority, setHighPriority] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db
      .from("admin_tasks")
      .select("*")
      .order("priority", { ascending: false })
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Could not load tasks", description: error.message, variant: "destructive" });
    } else {
      setTasks((data ?? []) as Task[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Live updates so a board open on another screen stays in sync.
    const channel = db
      .channel("admin_tasks_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_tasks" }, () => load())
      .subscribe();
    return () => {
      db.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createTask = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast({ title: "Add a title first", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await db.from("admin_tasks").insert({
      title: trimmed,
      assignee: assignee.trim(),
      due_date: dueDate || null,
      priority: highPriority ? 1 : 0,
      status: "todo",
      created_by: auth?.user?.id ?? null,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Could not create task", description: error.message, variant: "destructive" });
      return;
    }
    setTitle("");
    setAssignee("");
    setDueDate("");
    setHighPriority(false);
    load();
  };

  const moveTask = async (task: Task, dir: -1 | 1) => {
    const order: Status[] = ["todo", "doing", "done"];
    const idx = order.indexOf(task.status);
    const next = order[idx + dir];
    if (!next) return;
    const { error } = await db.from("admin_tasks").update({ status: next }).eq("id", task.id);
    if (error) {
      toast({ title: "Could not move task", description: error.message, variant: "destructive" });
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
  };

  const togglePriority = async (task: Task) => {
    const next = task.priority === 1 ? 0 : 1;
    const { error } = await db.from("admin_tasks").update({ priority: next }).eq("id", task.id);
    if (error) return;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, priority: next } : t)));
  };

  const removeTask = async (task: Task) => {
    const { error } = await db.from("admin_tasks").delete().eq("id", task.id);
    if (error) {
      toast({ title: "Could not delete task", description: error.message, variant: "destructive" });
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  };

  const fmtDue = (d: string | null) => {
    if (!d) return null;
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  const isOverdue = (d: string | null, status: Status) => {
    if (!d || status === "done") return false;
    return new Date(d + "T23:59:59") < new Date();
  };

  return (
    <div className="space-y-4">
      {/* New task bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListTodo className="h-5 w-5 text-primary" />
            Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input
              placeholder="New task…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTask()}
              className="md:flex-1"
            />
            <Input
              placeholder="Assignee"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="md:w-40"
            />
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="md:w-44"
            />
            <Button
              type="button"
              variant={highPriority ? "default" : "outline"}
              onClick={() => setHighPriority((v) => !v)}
              className="gap-1.5"
              title="High priority"
            >
              <Flag className="h-4 w-4" />
              {highPriority ? "High" : "Normal"}
            </Button>
            <Button type="button" onClick={createTask} disabled={creating} className="gap-1.5">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Board */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className={`rounded-lg border-t-4 ${col.accent} bg-muted/30 p-3`}>
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold">{col.label}</span>
                  <Badge variant="secondary">{colTasks.length}</Badge>
                </div>
                <div className="space-y-2">
                  {colTasks.length === 0 && (
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground">No tasks</p>
                  )}
                  {colTasks.map((task) => (
                    <Card key={task.id} className="group border-border/70 shadow-sm">
                      <CardContent className="space-y-2 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium leading-snug ${task.status === "done" ? "text-muted-foreground line-through" : ""}`}>
                            {task.title}
                          </p>
                          <button
                            type="button"
                            onClick={() => togglePriority(task)}
                            title={task.priority === 1 ? "High priority" : "Mark high priority"}
                            className={`shrink-0 ${task.priority === 1 ? "text-red-500" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
                          >
                            <Flag className="h-3.5 w-3.5" fill={task.priority === 1 ? "currentColor" : "none"} />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {task.assignee && (
                            <Badge variant="outline" className="gap-1 text-[11px] font-normal">
                              <User className="h-3 w-3" />
                              {task.assignee}
                            </Badge>
                          )}
                          {task.due_date && (
                            <Badge
                              variant="outline"
                              className={`gap-1 text-[11px] font-normal ${isOverdue(task.due_date, task.status) ? "border-red-300 text-red-600" : ""}`}
                            >
                              <CalendarClock className="h-3 w-3" />
                              {fmtDue(task.due_date)}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              disabled={task.status === "todo"}
                              onClick={() => moveTask(task, -1)}
                              title="Move back"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            {task.status === "done" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => moveTask(task, 1)}
                                title="Move forward"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                            onClick={() => removeTask(task)}
                            title="Delete task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminTasks;
