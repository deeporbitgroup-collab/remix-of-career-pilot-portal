import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock } from "lucide-react";
import { format, addDays } from "date-fns";
import { it, enUS } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AvailabilitySlot {
  id?: string;
  date: string;
  start_time: string;
  end_time: string;
  isPending?: boolean;
  isDeleted?: boolean;
}

interface MobileCalendarViewProps {
  selectedWeek: Date;
  slots: AvailabilitySlot[];
  language: string;
  onSlotAdd: (date: string, start: string, end: string) => void;
  onSlotDelete: (slot: AvailabilitySlot) => void;
  onWeekChange: (date: Date) => void;
  pendingChanges: {
    add: Array<{ date: string; start_time: string; end_time: string }>;
    delete: string[];
  };
}

export const MobileCalendarView = ({
  selectedWeek,
  slots,
  language,
  onSlotAdd,
  onSlotDelete,
  onWeekChange,
  pendingChanges
}: MobileCalendarViewProps) => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSlotStart, setNewSlotStart] = useState("09:00");
  const [newSlotEnd, setNewSlotEnd] = useState("10:00");

  const days = language === 'it' 
    ? ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const fullDays = language === 'it'
    ? ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const locale = language === 'it' ? it : enUS;

  // Generate time options for selects
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  });

  const currentDate = addDays(selectedWeek, selectedDay);
  const dateString = format(currentDate, 'yyyy-MM-dd');

  // Get slots for current day - combining existing and pending
  const existingSlots = slots.filter(s => 
    s.date === dateString && 
    (!s.id || !pendingChanges.delete.includes(s.id))
  );
  
  const currentDaySlots = [
    ...existingSlots,
    ...pendingChanges.add.filter(s => s.date === dateString)
  ].sort((a, b) => a.start_time.localeCompare(b.start_time));

  const handleAddSlot = () => {
    if (newSlotStart >= newSlotEnd) {
      return;
    }
    onSlotAdd(dateString, newSlotStart, newSlotEnd);
    setShowAddDialog(false);
    setNewSlotStart("09:00");
    setNewSlotEnd("10:00");
  };

  return (
    <div className="space-y-4">
      {/* Week Navigator */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onWeekChange(addDays(selectedWeek, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base">
              {format(selectedWeek, 'MMM dd', { locale })} - {format(addDays(selectedWeek, 6), 'MMM dd', { locale })}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onWeekChange(addDays(selectedWeek, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          {/* Day Selector */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const dayDate = addDays(selectedWeek, index);
              const dayDateString = format(dayDate, 'yyyy-MM-dd');
              const daySlots = [
                ...slots.filter(s => 
                  s.date === dayDateString && 
                  (!s.id || !pendingChanges.delete.includes(s.id))
                ),
                ...pendingChanges.add.filter(s => s.date === dayDateString)
              ];
              const hasSlots = daySlots.length > 0;

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDay(index)}
                  className={`
                    flex flex-col items-center justify-center p-2 rounded-lg transition-all
                    ${selectedDay === index 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                    }
                  `}
                >
                  <span className="text-xs font-medium">{day}</span>
                  <span className="text-lg font-semibold">
                    {format(dayDate, 'd')}
                  </span>
                  {hasSlots && (
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      selectedDay === index ? 'bg-primary-foreground' : 'bg-primary'
                    }`} />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">{fullDays[selectedDay]}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {format(currentDate, 'dd MMMM yyyy', { locale })}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {language === 'it' ? 'Aggiungi' : 'Add'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            {currentDaySlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                <Clock className="h-12 w-12 mb-3 opacity-50" />
                <p>{language === 'it' ? 'Nessuno slot disponibile' : 'No slots available'}</p>
                <p className="text-sm mt-1">
                  {language === 'it' ? 'Tocca "Aggiungi" per creare uno slot' : 'Tap "Add" to create a slot'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentDaySlots.map((slot, index) => {
                  const slotWithId = slot as AvailabilitySlot;
                  const hasId = slotWithId.id !== undefined;
                  const isPending = !hasId || pendingChanges.add.some(s => 
                    s.date === slot.date && 
                    s.start_time === slot.start_time && 
                    s.end_time === slot.end_time
                  );
                  const isDeleted = hasId && slotWithId.id && pendingChanges.delete.includes(slotWithId.id);

                  return (
                    <div
                      key={index}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border
                        ${isDeleted ? 'bg-destructive/10 border-destructive/20' : 
                          isPending ? 'bg-primary/10 border-primary/30' : 
                          'bg-card hover:bg-muted/50'}
                        transition-all
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className={`font-medium ${isDeleted ? 'line-through' : ''}`}>
                            {slot.start_time} - {slot.end_time}
                          </span>
                          {isPending && !isDeleted && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {language === 'it' ? 'Non salvato' : 'Unsaved'}
                            </Badge>
                          )}
                          {isDeleted && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              {language === 'it' ? 'Da eliminare' : 'To delete'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onSlotDelete(slot)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add Slot Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {language === 'it' ? 'Aggiungi disponibilità' : 'Add availability'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{language === 'it' ? 'Giorno' : 'Day'}</Label>
              <p className="text-sm font-medium">
                {fullDays[selectedDay]}, {format(currentDate, 'dd MMMM', { locale })}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">
                  {language === 'it' ? 'Ora inizio' : 'Start time'}
                </Label>
                <Select value={newSlotStart} onValueChange={setNewSlotStart}>
                  <SelectTrigger id="start-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">
                  {language === 'it' ? 'Ora fine' : 'End time'}
                </Label>
                <Select value={newSlotEnd} onValueChange={setNewSlotEnd}>
                  <SelectTrigger id="end-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map(time => (
                      <SelectItem key={time} value={time} disabled={time <= newSlotStart}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {language === 'it' ? 'Annulla' : 'Cancel'}
            </Button>
            <Button onClick={handleAddSlot} disabled={newSlotStart >= newSlotEnd}>
              {language === 'it' ? 'Aggiungi' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};