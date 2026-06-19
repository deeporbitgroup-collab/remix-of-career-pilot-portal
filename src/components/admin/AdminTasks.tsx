import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  ListTodo, Plus, Loader2, Trash2, ChevronLeft, ChevronRight,
  Flag, User, CalendarClock, CheckCircle2, Search, Pencil, StickyNote, Eraser,
} from "lucide-react";

// admin_tasks isn't in the generated Database types, so reuse the authenticated
// client untyped (same session/auth) — mirrors the CRM client pattern.
const db = supabase as unknown as SupabaseClient;

type Status = "todo" | "doing" | "done";

interface Task {
  id: string;
  title: string;
  notes: string | null;
  assignee: string | null;
  status: Status;
  priority: number;
  due_date: string | null;
  position: number;
  created_at: string;
}

interface Member {
  id: string;
  name: string;
  email: string | null;
}

const COLUMNS: { key: Status; label: string; accent: string }[] = [
  { key: "todo", label: "To do", accent: "border-t-muted-foreground/40" },
  { key: "doing", label: "In progress", accent: "border-t-amber-400" },
  { key: "done", label: "Done", accent: "border-t-emerald-500" },
];

const UNASSIGNED = "__unassigned__";

// The task board is for the Career Pilot management team only (not associates).
// Assignees and notifications stay strictly within these three.
const TEAM_MEMBERS: Member[] = [
  { id: "leone", name: "Leone Fassio", email: "fassio.leone@gmail.com" },
  { id: "andrea", name: "Andrea", email: "andreaa@mit.edu" },
  { id: "elisabetta", name: "Elisabetta Fabris", email: "elisabettafabris.work@gmail.com" },
];

const AdminTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const members = TEAM_MEMBERS;
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Quick-add
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string>(UNASSIGNED);
  const [dueDate, setDueDate] = useState("");
  const [highPriority, setHighPriority] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [highOnly, setHighOnly] = useState(false);

  // Edit dialog
  const [editing, setEditing] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({ title: "", notes: "", assignee: UNASSIGNED, due_date: "", priority: 0, status: "todo" as Status });
  const [savingEdit, setSavingEdit] = useState(false);

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

  // Notify about a task: the assignee (if we know their email) gets it directly,
  // and the Career Pilot team is always BCC'd for oversight (handled server-side).
  // Fire-and-forget.
  const notifyTask = (assigneeName: string | null, taskTitle: string, dueDate: string | null, notes: string | null) => {
    const m = assigneeName ? members.find((x) => x.name === assigneeName) : null;
    supabase.functions
      .invoke("notify-task-assignee", { body: { email: m?.email ?? null, name: assigneeName, taskTitle, dueDate, notes } })
      .then(() => toast({ title: assigneeName ? `${assigneeName} and the team were notified` : "Team notified by email" }))
      .catch((e) => console.error("notify task failed", e));
  };

  useEffect(() => {
    load();
    const channel = db
      .channel("admin_tasks_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_tasks" }, () => load())
      .subscribe();
    return () => { db.removeChannel(channel); };
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
      assignee: assignee === UNASSIGNED ? "" : assignee,
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
    notifyTask(assignee === UNASSIGNED ? null : assignee, trimmed, dueDate || null, null);
    setTitle("");
    setAssignee(UNASSIGNED);
    setDueDate("");
    setHighPriority(false);
    load();
  };

  const moveTask = async (task: Task, dir: -1 | 1) => {
    const order: Status[] = ["todo", "doing", "done"];
    const next = order[order.indexOf(task.status) + dir];
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

  const clearCompleted = async () => {
    const { error } = await db.from("admin_tasks").delete().eq("status", "done");
    if (error) {
      toast({ title: "Could not clear completed", description: error.message, variant: "destructive" });
      return;
    }
    setTasks((prev) => prev.filter((t) => t.status !== "done"));
    toast({ title: "Completed tasks cleared" });
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setEditForm({
      title: task.title,
      notes: task.notes ?? "",
      assignee: task.assignee && task.assignee.trim() ? task.assignee : UNASSIGNED,
      due_date: task.due_date ?? "",
      priority: task.priority,
      status: task.status,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const trimmed = editForm.title.trim();
    if (!trimmed) {
      toast({ title: "Title can't be empty", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    const patch = {
      title: trimmed,
      notes: editForm.notes.trim() || null,
      assignee: editForm.assignee === UNASSIGNED ? "" : editForm.assignee,
      due_date: editForm.due_date || null,
      priority: editForm.priority,
      status: editForm.status,
    };
    const { error } = await db.from("admin_tasks").update(patch).eq("id", editing.id);
    setSavingEdit(false);
    if (error) {
      toast({ title: "Could not save task", description: error.message, variant: "destructive" });
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === editing.id ? { ...t, ...patch } : t)));
    // Notify only when the assignee actually changed to a new person.
    const prevAssignee = editing.assignee && editing.assignee.trim() ? editing.assignee : UNASSIGNED;
    if (editForm.assignee !== UNASSIGNED && editForm.assignee !== prevAssignee) {
      notifyTask(editForm.assignee, trimmed, editForm.due_date || null, editForm.notes.trim() || null);
    }
    setEditing(null);
  };

  const fmtDue = (d: string | null) => {
    if (!d) return null;
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };
  const isOverdue = (d: string | null, status: Status) => {
    if (!d || status === "done") return false;
    return new Date(d + "T23:59:59") < new Date();
  };

  // Assignee options = real members + any legacy free-text names already on tasks.
  const assigneeOptions = useMemo(() => {
    const names = new Set(members.map((m) => m.name));
    tasks.forEach((t) => { if (t.assignee && t.assignee.trim()) names.add(t.assignee.trim()); });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [members, tasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (highOnly && t.priority !== 1) return false;
      if (filterAssignee !== "all") {
        if (filterAssignee === UNASSIGNED ? !!(t.assignee && t.assignee.trim()) : t.assignee !== filterAssignee) return false;
      }
      if (q) {
        const hay = `${t.title} ${t.assignee ?? ""} ${t.notes ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, search, filterAssignee, highOnly]);

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
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input
              placeholder="New task…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTask()}
              className="md:flex-1"
            />
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="md:w-44"><SelectValue placeholder="Assignee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="md:w-44" />
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

          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="sm:w-48"><SelectValue placeholder="Filter by assignee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignees</SelectItem>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {assigneeOptions.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={highOnly ? "default" : "outline"}
              onClick={() => setHighOnly((v) => !v)}
              className="gap-1.5"
            >
              <Flag className="h-4 w-4" />
              High only
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:pb-2">
          {COLUMNS.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className={`rounded-lg border-t-4 ${col.accent} bg-muted/30 p-3 max-md:w-[82vw] max-md:shrink-0 max-md:snap-center`}>
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold">{col.label}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary">{colTasks.length}</Badge>
                    {col.key === "done" && colTasks.length > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button type="button" title="Clear completed" className="text-muted-foreground hover:text-destructive">
                            <Eraser className="h-4 w-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Clear completed tasks?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently deletes all tasks in the Done column. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={clearCompleted} className="bg-destructive text-destructive-foreground">
                              Clear
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {colTasks.length === 0 && (
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground">No tasks</p>
                  )}
                  {colTasks.map((task) => (
                    <Card key={task.id} className="group border-border/70 shadow-sm">
                      <CardContent className="space-y-2 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(task)}
                            className="flex-1 text-left"
                            title="Edit task"
                          >
                            <p className={`text-sm font-medium leading-snug ${task.status === "done" ? "text-muted-foreground line-through" : ""}`}>
                              {task.title}
                            </p>
                          </button>
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
                          {task.assignee && task.assignee.trim() && (
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
                          {task.notes && task.notes.trim() && (
                            <Badge variant="outline" className="gap-1 text-[11px] font-normal text-muted-foreground">
                              <StickyNote className="h-3 w-3" />
                              Note
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={task.status === "todo"} onClick={() => moveTask(task, -1)} title="Move back">
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            {task.status === "done" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveTask(task, 1)} title="Move forward">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openEdit(task)} title="Edit task">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100" onClick={() => removeTask(task)} title="Delete task">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="et-title">Title</Label>
              <Input id="et-title" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="et-notes">Notes</Label>
              <Textarea id="et-notes" value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Add details, links, context…" className="min-h-[110px]" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Assignee</Label>
                <Select value={editForm.assignee} onValueChange={(v) => setEditForm((f) => ({ ...f, assignee: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {assigneeOptions.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="et-due">Due date</Label>
                <Input id="et-due" type="date" value={editForm.due_date} onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as Status }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Button
                  type="button"
                  variant={editForm.priority === 1 ? "default" : "outline"}
                  onClick={() => setEditForm((f) => ({ ...f, priority: f.priority === 1 ? 0 : 1 }))}
                  className="w-full justify-start gap-1.5"
                >
                  <Flag className="h-4 w-4" />
                  {editForm.priority === 1 ? "High" : "Normal"}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {editing && (
              <Button variant="ghost" className="mr-auto text-destructive hover:text-destructive" onClick={() => { removeTask(editing); setEditing(null); }}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTasks;
