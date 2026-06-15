import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { format, startOfWeek, addWeeks, addDays, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AvailabilitySlot {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  timezone?: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Associate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const AvailabilityOverview = () => {
  const { language } = useLanguage();
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [selectedAssociate, setSelectedAssociate] = useState<string>("all");
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);

  const days = language === 'it' 
    ? ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const hours = Array.from({ length: 14 }, (_, i) => `${8 + i}:00`);

  useEffect(() => {
    fetchAssociates();
  }, []);

  useEffect(() => {
    fetchAvailability();
  }, [selectedWeek, selectedAssociate]);

  const fetchAssociates = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'ASSOCIATE')
        .eq('status', 'approved')
        .order('last_name');

      if (error) throw error;
      setAssociates(data || []);
    } catch (error) {
      console.error('Error fetching associates:', error);
    }
  };

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const weekStart = selectedWeek;
      const weekEnd = addDays(weekStart, 6);

      let query = supabase
        .from('availability_slots')
        .select(`
          *,
          profiles!availability_slots_user_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))
        .order('date')
        .order('start_time');

      if (selectedAssociate !== "all") {
        query = query.eq('user_id', selectedAssociate);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAvailabilitySlots(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSlotForCell = (day: number, hour: string, associateId?: string) => {
    const date = addDays(selectedWeek, day);
    const hourNum = parseInt(hour.split(':')[0]);
    
    return availabilitySlots.filter(slot => {
      const slotDate = new Date(slot.date);
      const startHour = parseInt(slot.start_time.split(':')[0]);
      const endHour = parseInt(slot.end_time.split(':')[0]);
      
      const matchesDate = isSameDay(slotDate, date);
      const matchesTime = startHour <= hourNum && hourNum < endHour;
      const matchesAssociate = associateId ? slot.user_id === associateId : true;
      
      return matchesDate && matchesTime && matchesAssociate;
    });
  };

  const getAssociateColor = (index: number) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
    ];
    return colors[index % colors.length];
  };

  const changeWeek = (direction: 'prev' | 'next') => {
    setSelectedWeek(prev => addWeeks(prev, direction === 'next' ? 1 : -1));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {language === 'it' ? 'Disponibilità Associates' : 'Associates Availability'}
          </CardTitle>
          <Select value={selectedAssociate} onValueChange={setSelectedAssociate}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder={language === 'it' ? 'Seleziona associate' : 'Select associate'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {language === 'it' ? 'Tutti gli associates' : 'All associates'}
              </SelectItem>
              {associates.map(associate => (
                <SelectItem key={associate.id} value={associate.id}>
                  {associate.first_name} {associate.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => changeWeek('prev')} size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            {language === 'it' ? 'Settimana precedente' : 'Previous week'}
          </Button>
          <span className="font-medium">
            {format(selectedWeek, 'd MMM', { locale: language === 'it' ? it : undefined })} - 
            {format(addDays(selectedWeek, 6), 'd MMM yyyy', { locale: language === 'it' ? it : undefined })}
          </span>
          <Button variant="outline" onClick={() => changeWeek('next')} size="sm">
            {language === 'it' ? 'Settimana successiva' : 'Next week'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Calendar Grid or List View */}
        {selectedAssociate === "all" ? (
          // List View for All Associates
          <div className="space-y-4">
            {days.map((day, dayIndex) => {
              const date = addDays(selectedWeek, dayIndex);
              const daySlots = availabilitySlots.filter(slot => 
                isSameDay(new Date(slot.date), date)
              );

              if (daySlots.length === 0) return null;

              return (
                <div key={dayIndex} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {day} - {format(date, 'd MMM', { locale: language === 'it' ? it : undefined })}
                  </h3>
                  <div className="space-y-2">
                    {daySlots.map((slot, index) => {
                      const associateIndex = associates.findIndex(a => a.id === slot.user_id);
                      return (
                        <div 
                          key={slot.id} 
                          className={`flex items-center justify-between p-3 rounded-lg border ${getAssociateColor(associateIndex)}`}
                        >
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4" />
                            <span className="font-medium">
                              {slot.profiles?.first_name} {slot.profiles?.last_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{slot.start_time} - {slot.end_time}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {availabilitySlots.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'it' 
                  ? 'Nessuna disponibilità per questa settimana' 
                  : 'No availability for this week'}
              </div>
            )}
          </div>
        ) : (
          // Calendar Grid for Single Associate
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">{language === 'it' ? 'Ora' : 'Time'}</TableHead>
                  {days.map((day, index) => (
                    <TableHead key={index} className="text-center min-w-[120px]">
                      <div>{day}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(addDays(selectedWeek, index), 'd MMM', { 
                          locale: language === 'it' ? it : undefined 
                        })}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {hours.map(hour => (
                  <TableRow key={hour}>
                    <TableCell className="font-medium">{hour}</TableCell>
                    {days.map((_, dayIndex) => {
                      const slots = getSlotForCell(dayIndex, hour);
                      return (
                        <TableCell key={dayIndex} className="p-1 text-center">
                          {slots.length > 0 && (
                            <div className="bg-primary/10 text-primary rounded p-1 text-xs">
                              {language === 'it' ? 'Disponibile' : 'Available'}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AvailabilityOverview;