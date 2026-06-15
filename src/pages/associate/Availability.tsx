import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, ArrowLeft, X, Copy, Download, Clock, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { it, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MobileCalendarView } from "@/components/availability/MobileCalendarView";
import { useIsMobile } from "@/hooks/use-mobile";

interface AvailabilitySlot {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
}

const AssociateAvailability = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [slotDuration, setSlotDuration] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: number; time: string } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: number; time: string } | null>(null);
  const [weeksToRepeat, setWeeksToRepeat] = useState(4);
  const [pendingChanges, setPendingChanges] = useState<{
    add: Array<{ date: string; start_time: string; end_time: string }>;
    delete: string[];
  }>({ add: [], delete: [] });
  
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const days = language === 'it' 
    ? ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hours = Array.from({ length: 25 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  });

  useEffect(() => {
    fetchAvailability();
  }, [selectedWeek]);

  const fetchAvailability = async () => {
    setIsLoading(true);
    try {
      const from = format(selectedWeek, 'yyyy-MM-dd');
      const to = format(addDays(selectedWeek, 6), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .gte('date', from)
        .lte('date', to)
        .order('date')
        .order('start_time');

      if (error) throw error;
      setSlots(data || []);
      setPendingChanges({ add: [], delete: [] });
    } catch (error: any) {
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: error.message || (language === 'it' ? "Impossibile caricare la disponibilità" : "Unable to load availability"),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellMouseDown = (day: number, time: string) => {
    setIsDragging(true);
    setDragStart({ day, time });
    setDragEnd({ day, time });
  };

  const handleCellMouseEnter = (day: number, time: string) => {
    if (isDragging && dragStart) {
      setDragEnd({ day, time });
    }
  };

  const handleCellMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd) return;
    
    setIsDragging(false);
    
    // Calculate the actual time range
    const startDay = Math.min(dragStart.day, dragEnd.day);
    const endDay = Math.max(dragStart.day, dragEnd.day);
    const startTime = dragStart.time < dragEnd.time ? dragStart.time : dragEnd.time;
    let endTime = dragStart.time > dragEnd.time ? dragStart.time : dragEnd.time;
    
    // Increment end time by 30 minutes for the actual end
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const totalMinutes = endHour * 60 + endMinute + 30;
    endTime = `${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}:${(totalMinutes % 60).toString().padStart(2, '0')}`;
    
    // Don't allow selections that cross midnight
    if (endTime > '23:59') {
      toast({
        title: language === 'it' ? "Attenzione" : "Warning",
        description: language === 'it' ? "Non è possibile creare slot che attraversano la mezzanotte" : "Cannot create slots that cross midnight",
        variant: "destructive"
      });
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    // Create slots for each selected day
    const newSlots: Array<{ date: string; start_time: string; end_time: string }> = [];
    for (let day = startDay; day <= endDay; day++) {
      const date = format(addDays(selectedWeek, day), 'yyyy-MM-dd');
      
      // Check for overlaps with existing slots
      const hasOverlap = [...slots, ...pendingChanges.add].some(slot => {
        // Skip deleted slots (only existing slots have IDs)
        if ('id' in slot && pendingChanges.delete.includes((slot as AvailabilitySlot).id)) return false;
        return slot.date === date && (
          (startTime >= slot.start_time && startTime < slot.end_time) ||
          (endTime > slot.start_time && endTime <= slot.end_time) ||
          (startTime <= slot.start_time && endTime >= slot.end_time)
        );
      });

      if (!hasOverlap) {
        newSlots.push({ date, start_time: startTime, end_time: endTime });
      }
    }

    if (newSlots.length > 0) {
      setPendingChanges(prev => ({
        ...prev,
        add: [...prev.add, ...newSlots]
      }));
    }

    setDragStart(null);
    setDragEnd(null);
  };

  const deleteSlot = (slotToDelete: AvailabilitySlot | { date: string; start_time: string; end_time: string }) => {
    if ('id' in slotToDelete) {
      // Existing slot - mark for deletion
      setPendingChanges(prev => ({
        ...prev,
        delete: [...prev.delete, slotToDelete.id]
      }));
    } else {
      // Pending slot - remove from add list
      setPendingChanges(prev => ({
        ...prev,
        add: prev.add.filter(s => 
          !(s.date === slotToDelete.date && 
            s.start_time === slotToDelete.start_time && 
            s.end_time === slotToDelete.end_time)
        )
      }));
    }
  };

  const handleMobileSlotAdd = (date: string, start: string, end: string) => {
    // Check for overlaps with existing slots
    const hasOverlap = [...slots, ...pendingChanges.add].some(slot => {
      if ('id' in slot && pendingChanges.delete.includes((slot as AvailabilitySlot).id)) return false;
      return slot.date === date && (
        (start >= slot.start_time && start < slot.end_time) ||
        (end > slot.start_time && end <= slot.end_time) ||
        (start <= slot.start_time && end >= slot.end_time)
      );
    });

    if (hasOverlap) {
      toast({
        title: language === 'it' ? "Sovrapposizione rilevata" : "Overlap detected",
        description: language === 'it' 
          ? `Hai già un intervallo che si sovrappone per questo orario`
          : `You already have an overlapping slot for this time`,
        variant: "destructive"
      });
      return;
    }

    setPendingChanges(prev => ({
      ...prev,
      add: [...prev.add, { date, start_time: start, end_time: end }]
    }));
  };

  const clearWeek = () => {
    // Mark all existing slots for deletion
    setPendingChanges({
      add: [],
      delete: slots.map(s => s.id)
    });
  };

  const saveChanges = async () => {
    if (pendingChanges.add.length === 0 && pendingChanges.delete.length === 0) {
      toast({
        title: language === 'it' ? "Nessuna modifica" : "No changes",
        description: language === 'it' ? "Non ci sono modifiche da salvare" : "There are no changes to save"
      });
      return;
    }

    setIsSaving(true);
    let hasErrors = false;

    try {
      // Delete slots
      for (const id of pendingChanges.delete) {
        const { error } = await supabase.rpc('availability_delete', { _id: id });
        if (error) {
          if (error.message.includes('slot not found')) {
            // Slot già eliminato, ignora
            continue;
          }
          throw error;
        }
      }

      // Add new slots
      for (const slot of pendingChanges.add) {
        const { error } = await supabase.rpc('availability_upsert', {
          _date: slot.date,
          _start: slot.start_time,
          _end: slot.end_time,
          _tz: timezone
        });

        if (error) {
          hasErrors = true;
          if (error.message.includes('overlap')) {
            toast({
              title: language === 'it' ? "Sovrapposizione rilevata" : "Overlap detected",
              description: language === 'it' 
                ? `Hai già un intervallo che si sovrappone per ${format(parseISO(slot.date), 'dd/MM')} ${slot.start_time}-${slot.end_time}`
                : `You already have an overlapping slot for ${format(parseISO(slot.date), 'MM/dd')} ${slot.start_time}-${slot.end_time}`,
              variant: "destructive"
            });
          } else if (error.message.includes('start_time must be before end_time')) {
            toast({
              title: language === 'it' ? "Errore orario" : "Time error",
              description: language === 'it' ? "L'orario di inizio deve essere precedente alla fine" : "Start time must be before end time",
              variant: "destructive"
            });
          } else {
            toast({
              title: language === 'it' ? "Errore" : "Error",
              description: error.message,
              variant: "destructive"
            });
          }
        }
      }

      if (!hasErrors) {
        toast({
          title: language === 'it' ? "Successo" : "Success",
          description: language === 'it' ? "Disponibilità aggiornata con successo" : "Availability updated successfully"
        });
      }

      // Refresh data
      await fetchAvailability();
    } catch (error: any) {
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: error.message || (language === 'it' ? "Impossibile salvare la disponibilità" : "Unable to save availability"),
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyWeek = async () => {
    if (slots.length === 0 && pendingChanges.add.length === 0) {
      toast({
        title: language === 'it' ? "Nessuno slot" : "No slots",
        description: language === 'it' ? "Non ci sono slot da copiare" : "There are no slots to copy",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Combina slot esistenti e pending
      const slotsToRepeat = [
        ...slots.filter(s => !pendingChanges.delete.includes(s.id)),
        ...pendingChanges.add
      ];

      for (let week = 1; week <= weeksToRepeat; week++) {
        for (const slot of slotsToRepeat) {
          const originalDate = parseISO(slot.date);
          const newDate = addDays(originalDate, week * 7);
          
          const { error } = await supabase.rpc('availability_upsert', {
            _date: format(newDate, 'yyyy-MM-dd'),
            _start: slot.start_time,
            _end: slot.end_time,
            _tz: timezone
          });

          if (error && !error.message.includes('overlap')) {
            throw error;
          }
        }
      }

      toast({
        title: language === 'it' ? "Successo" : "Success",
        description: language === 'it' ? `Disponibilità copiata per le prossime ${weeksToRepeat} settimane` : `Availability copied for the next ${weeksToRepeat} weeks`
      });
    } catch (error: any) {
      toast({
        title: language === 'it' ? "Errore" : "Error",
        description: error.message || (language === 'it' ? "Impossibile copiare la disponibilità" : "Unable to copy availability"),
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const exportICS = () => {
    const allSlots = [
      ...slots.filter(s => !pendingChanges.delete.includes(s.id)),
      ...pendingChanges.add
    ];

    if (allSlots.length === 0) {
      toast({
        title: language === 'it' ? "Nessuno slot" : "No slots",
        description: language === 'it' ? "Non ci sono slot da esportare" : "There are no slots to export",
        variant: "destructive"
      });
      return;
    }

    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CareerPilot//Availability//IT
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-TIMEZONE:${timezone}
BEGIN:VTIMEZONE
TZID:${timezone}
END:VTIMEZONE
`;

    allSlots.forEach(slot => {
      const date = slot.date.replace(/-/g, '');
      const startTime = slot.start_time.replace(/:/g, '') + '00';
      const endTime = slot.end_time.replace(/:/g, '') + '00';
      
      icsContent += `BEGIN:VEVENT
DTSTART;TZID=${timezone}:${date}T${startTime}
DTEND;TZID=${timezone}:${date}T${endTime}
SUMMARY:Disponibilità CareerPilot
DESCRIPTION:Fascia oraria disponibile
END:VEVENT
`;
    });

    icsContent += 'END:VCALENDAR';

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'disponibilita.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isSlotSelected = (day: number, time: string) => {
    const date = format(addDays(selectedWeek, day), 'yyyy-MM-dd');
    
    // Check pending additions
    const isPending = pendingChanges.add.some(slot => 
      slot.date === date && 
      time >= slot.start_time && 
      time < slot.end_time
    );
    
    // Check existing slots (not marked for deletion)
    const isExisting = slots.some(slot => 
      !pendingChanges.delete.includes(slot.id) &&
      slot.date === date && 
      time >= slot.start_time && 
      time < slot.end_time
    );
    
    return isPending || isExisting;
  };

  const isDragSelected = (day: number, time: string) => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    
    const minDay = Math.min(dragStart.day, dragEnd.day);
    const maxDay = Math.max(dragStart.day, dragEnd.day);
    const minTime = dragStart.time < dragEnd.time ? dragStart.time : dragEnd.time;
    const maxTime = dragStart.time > dragEnd.time ? dragStart.time : dragEnd.time;
    
    return day >= minDay && day <= maxDay && time >= minTime && time <= maxTime;
  };

  const getSlotForCell = (day: number, time: string) => {
    const date = format(addDays(selectedWeek, day), 'yyyy-MM-dd');
    
    // Check pending additions first
    const pendingSlot = pendingChanges.add.find(s => 
      s.date === date && 
      time >= s.start_time && 
      time < s.end_time
    );
    
    if (pendingSlot) return { ...pendingSlot, isPending: true };
    
    // Then check existing slots
    const existingSlot = slots.find(s => 
      !pendingChanges.delete.includes(s.id) &&
      s.date === date && 
      time >= s.start_time && 
      time < s.end_time
    );
    
    return existingSlot;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/app/associate")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {language === 'it' ? 'Torna alla Dashboard' : 'Back to Dashboard'}
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-primary" />
            {language === 'it' ? 'Gestisci Disponibilità' : 'Manage Availability'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {language === 'it' ? 'Seleziona le tue fasce orarie di disponibilità trascinando il mouse' : 'Select your availability slots by dragging the mouse'}
          </p>
        </div>

        {/* Mobile View */}
        {isMobile ? (
          <>
            <MobileCalendarView
              selectedWeek={selectedWeek}
              slots={slots}
              language={language}
              onSlotAdd={handleMobileSlotAdd}
              onSlotDelete={deleteSlot}
              onWeekChange={setSelectedWeek}
              pendingChanges={pendingChanges}
            />
            
            {/* Mobile Actions */}
            <Card className="mt-4">
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {/* Save/Clear buttons */}
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1"
                      onClick={saveChanges} 
                      disabled={isSaving || (pendingChanges.add.length === 0 && pendingChanges.delete.length === 0)}
                    >
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {language === 'it' ? 'Salva' : 'Save'}
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1"
                      onClick={clearWeek}
                    >
                      <X className="mr-2 h-4 w-4" />
                      {language === 'it' ? 'Pulisci' : 'Clear'}
                    </Button>
                  </div>
                  
                  {/* Copy week functionality */}
                  <div className="border-t pt-4">
                    <Label className="text-sm">{language === 'it' ? 'Copia settimana' : 'Copy week'}</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-muted-foreground">
                        {language === 'it' ? 'Ripeti per' : 'Repeat for'}
                      </span>
                      <Select value={weeksToRepeat.toString()} onValueChange={(v) => setWeeksToRepeat(Number(v))}>
                        <SelectTrigger className="w-16">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="8">8</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">
                        {language === 'it' ? 'settimane' : 'weeks'}
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={copyWeek} 
                        disabled={isSaving}
                        className="ml-auto"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Export button */}
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={exportICS}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {language === 'it' ? 'Esporta calendario' : 'Export calendar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          /* Desktop View - Original calendar grid */
          <>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{language === 'it' ? 'Settimana del' : 'Week of'} {format(selectedWeek, 'dd MMM yyyy', { locale: language === 'it' ? it : enUS })}</CardTitle>
                    <CardDescription>{language === 'it' ? 'Fuso orario' : 'Timezone'}: {timezone}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={slotDuration.toString()} onValueChange={(v) => setSlotDuration(Number(v))}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">{language === 'it' ? '30 minuti' : '30 minutes'}</SelectItem>
                        <SelectItem value="60">{language === 'it' ? '60 minuti' : '60 minutes'}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={exportICS}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={clearWeek}>
                      <X className="mr-2 h-4 w-4" />
                      {language === 'it' ? 'Pulisci' : 'Clear'}
                    </Button>
                    <Button 
                      onClick={saveChanges} 
                      disabled={isSaving || (pendingChanges.add.length === 0 && pendingChanges.delete.length === 0)}
                    >
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {language === 'it' ? 'Salva modifiche' : 'Save changes'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <div 
                        className="grid grid-cols-8 gap-0 min-w-[800px] select-none" 
                        onMouseUp={handleCellMouseUp}
                        onMouseLeave={handleCellMouseUp}
                      >
                        <div className="p-2 font-semibold border-b">
                          <Clock className="h-4 w-4" />
                        </div>
                        {days.map((day, i) => (
                          <div key={day} className="p-2 text-center font-semibold border-b">
                            {day}
                            <div className="text-xs text-muted-foreground">
                              {format(addDays(selectedWeek, i), 'dd/MM')}
                            </div>
                          </div>
                        ))}
                        
                        {hours.map(time => (
                          <>
                            <div key={`time-${time}`} className="p-2 text-sm text-muted-foreground border-r">
                              {time}
                            </div>
                            {days.map((_, dayIndex) => {
                              const isSelected = isSlotSelected(dayIndex, time);
                              const isDragHover = isDragSelected(dayIndex, time);
                              const slot = getSlotForCell(dayIndex, time);
                              const isPending = slot && 'isPending' in slot;
                              const isDeleted = slot && 'id' in slot && pendingChanges.delete.includes(slot.id);
                              
                              return (
                                <div
                                  key={`${dayIndex}-${time}`}
                                  className={`
                                    border p-2 cursor-pointer transition-all
                                    ${isSelected && !isDeleted ? (isPending ? 'bg-primary/70 text-primary-foreground' : 'bg-primary text-primary-foreground') : 'hover:bg-muted'}
                                    ${isDragHover ? 'bg-primary/50' : ''}
                                    ${isDeleted ? 'bg-destructive/20 line-through' : ''}
                                  `}
                                  onMouseDown={() => handleCellMouseDown(dayIndex, time)}
                                  onMouseEnter={() => handleCellMouseEnter(dayIndex, time)}
                                >
                                  {isSelected && slot && time === slot.start_time && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs">{slot.start_time}-{slot.end_time}</span>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-4 w-4 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteSlot(slot);
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-primary rounded"></div>
                          <span>Disponibile</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-primary/70 rounded"></div>
                          <span>Modifica non salvata</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-destructive/20 rounded"></div>
                          <span>Da eliminare</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Label>Ripeti per:</Label>
                        <Select value={weeksToRepeat.toString()} onValueChange={(v) => setWeeksToRepeat(Number(v))}>
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="8">8</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-sm">settimane</span>
                        <Button variant="outline" onClick={copyWeek} disabled={isSaving}>
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                          Copia
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Settimana precedente
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              >
                Oggi
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}
              >
                Settimana successiva
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AssociateAvailability;
