import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Search, Filter, User, Building, Mail, Phone,
  BarChart, Edit, Save, X, Plus, Loader2, Trash2, MoreVertical
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface KPIDefinition {
  id: string;
  key: string;
  label: string;
  description: string | null;
  applies_to: 'ASSOCIATE' | 'PARTNER' | 'ADMIN';
  chart_type: 'number' | 'bar' | 'pie';
  order_index: number;
  enabled: boolean;
}

interface KPIValue {
  id: string;
  kpi_definition_id: string;
  user_id: string;
  value: number;
  updated_at: string;
}

interface KPIManagementProps {
  roleFilter?: 'ASSOCIATE' | 'PARTNER';
}

const KPIManagement = ({ roleFilter }: KPIManagementProps = {}) => {
  const [definitions, setDefinitions] = useState<KPIDefinition[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userKPIs, setUserKPIs] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingKPI, setEditingKPI] = useState<KPIDefinition | null>(null);
  const [newKPI, setNewKPI] = useState({
    key: '',
    label: '',
    description: '',
    applies_to: 'ASSOCIATE' as 'ASSOCIATE' | 'PARTNER',
    chart_type: 'number' as 'number' | 'bar' | 'pie',
    order_index: 0,
    enabled: true
  });

  useEffect(() => {
    fetchDefinitions();
    fetchUsers();
  }, []);

  const fetchDefinitions = async () => {
    try {
      let query = supabase
        .from('kpi_definitions')
        .select('*');
      
      // Filter definitions by role if specified
      if (roleFilter) {
        query = query.eq('applies_to', roleFilter);
      }
      
      const { data, error } = await query.order('order_index');

      if (error) throw error;
      setDefinitions(data || []);
    } catch (error) {
      console.error('Error fetching KPI definitions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('status', 'approved');
      
      if (roleFilter) {
        query = query.eq('role', roleFilter);
      } else {
        query = query.in('role', ['ASSOCIATE', 'PARTNER']);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchUserKPIs = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('kpi_values')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      
      const kpiMap: any = {};
      (data || []).forEach(kpi => {
        kpiMap[kpi.kpi_definition_id] = kpi;
      });
      setUserKPIs(kpiMap);
    } catch (error) {
      console.error('Error fetching user KPIs:', error);
    }
  };

  const handleCreateKPI = async () => {
    try {
      const { error } = await supabase
        .from('kpi_definitions')
        .insert([newKPI]);

      if (error) throw error;

      toast({
        title: "KPI creato",
        description: "Nuova definizione KPI aggiunta con successo"
      });

      setShowAddModal(false);
      setNewKPI({
        key: '',
        label: '',
        description: '',
        applies_to: 'ASSOCIATE',
        chart_type: 'number',
        order_index: 0,
        enabled: true
      });
      fetchDefinitions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message
      });
    }
  };

  const handleUpdateKPI = async (kpi: KPIDefinition) => {
    try {
      const { error } = await supabase
        .from('kpi_definitions')
        .update({
          key: kpi.key,
          label: kpi.label,
          description: kpi.description,
          applies_to: kpi.applies_to,
          chart_type: kpi.chart_type,
          order_index: kpi.order_index,
          enabled: kpi.enabled
        })
        .eq('id', kpi.id);

      if (error) throw error;

      toast({
        title: "KPI aggiornato",
        description: "Definizione KPI modificata con successo"
      });

      setEditingKPI(null);
      fetchDefinitions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message
      });
    }
  };

  const handleDeleteKPI = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo KPI? Questa azione eliminerà anche tutti i valori associati.")) {
      return;
    }

    try {
      // First delete all related values
      const { error: valuesError } = await supabase
        .from('kpi_values')
        .delete()
        .eq('kpi_definition_id', id);

      if (valuesError) throw valuesError;

      // Then delete the definition
      const { error } = await supabase
        .from('kpi_definitions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "KPI eliminato",
        description: "Definizione KPI e valori associati eliminati con successo"
      });

      fetchDefinitions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message
      });
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('kpi_definitions')
        .update({ enabled })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: enabled ? "KPI attivato" : "KPI disattivato",
        description: `Il KPI è stato ${enabled ? 'attivato' : 'disattivato'} con successo`
      });

      fetchDefinitions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message
      });
    }
  };

  const handleUpdateKPIValue = async (userId: string, definitionId: string, value: number) => {
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      
      // Check if value exists
      const existingValue = userKPIs[definitionId];
      
      if (existingValue) {
        // Update existing value
        const { error } = await supabase
          .from('kpi_values')
          .update({ 
            value,
            updated_at: new Date().toISOString(),
            updated_by_admin_id: adminUser?.id
          })
          .eq('id', existingValue.id);

        if (error) throw error;
      } else {
        // Insert new value
        const { error } = await supabase
          .from('kpi_values')
          .insert({
            kpi_definition_id: definitionId,
            user_id: userId,
            value,
            updated_by_admin_id: adminUser?.id
          });

        if (error) throw error;
      }

      toast({
        title: "KPI aggiornato",
        description: "Valore KPI salvato con successo"
      });

      fetchUserKPIs(userId);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const company = (user.company_name || '').toLowerCase();
    const email = user.email.toLowerCase();
    
    return fullName.includes(searchLower) || 
           company.includes(searchLower) || 
           email.includes(searchLower);
  });

  return (
    <div className="space-y-6">
      {/* KPI Definitions Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Definizioni KPI</CardTitle>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi KPI
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {definitions.map(def => (
              <div key={def.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{def.label}</p>
                    <p className="text-sm text-muted-foreground">{def.description}</p>
                  </div>
                  <Badge variant={def.applies_to === 'ASSOCIATE' ? 'default' : 'secondary'}>
                    {def.applies_to}
                  </Badge>
                  <Badge variant="outline">{def.chart_type}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={def.enabled}
                    onCheckedChange={(checked) => handleToggleEnabled(def.id, checked)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingKPI(def)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifica
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteKPI(def.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Elimina
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User KPI Management */}
      <Card>
        <CardHeader>
          <CardTitle>Gestione KPI Utenti</CardTitle>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, email o azienda..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map(user => (
                <Card key={user.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {user.role === 'ASSOCIATE' ? (
                          <User className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Building className="h-4 w-4 text-green-500" />
                        )}
                        <span className="font-medium">
                          {user.role === 'ASSOCIATE' 
                            ? `${user.first_name || ''} ${user.last_name || ''}`
                            : user.company_name}
                        </span>
                        <Badge variant={user.role === 'ASSOCIATE' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          fetchUserKPIs(user.id);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Gestisci KPI
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add KPI Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Nuova Definizione KPI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Chiave (unica)</Label>
              <Input
                value={newKPI.key}
                onChange={(e) => setNewKPI({...newKPI, key: e.target.value})}
                placeholder="es. calls_made"
              />
            </div>
            <div>
              <Label>Etichetta</Label>
              <Input
                value={newKPI.label}
                onChange={(e) => setNewKPI({...newKPI, label: e.target.value})}
                placeholder="es. Chiamate Effettuate"
              />
            </div>
            <div>
              <Label>Descrizione</Label>
              <Input
                value={newKPI.description}
                onChange={(e) => setNewKPI({...newKPI, description: e.target.value})}
                placeholder="es. Numero totale di chiamate effettuate"
              />
            </div>
            <div className="flex gap-4">
              <Button onClick={handleCreateKPI}>
                <Save className="mr-2 h-4 w-4" />
                Salva
              </Button>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Annulla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit KPI Definition Modal */}
      {editingKPI && (
        <Dialog open={!!editingKPI} onOpenChange={() => setEditingKPI(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifica Definizione KPI</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Chiave (unica)</Label>
                <Input
                  value={editingKPI.key}
                  onChange={(e) => setEditingKPI({...editingKPI, key: e.target.value})}
                  placeholder="es. calls_made"
                />
              </div>
              <div>
                <Label>Etichetta</Label>
                <Input
                  value={editingKPI.label}
                  onChange={(e) => setEditingKPI({...editingKPI, label: e.target.value})}
                  placeholder="es. Chiamate Effettuate"
                />
              </div>
              <div>
                <Label>Descrizione</Label>
                <Textarea
                  value={editingKPI.description || ''}
                  onChange={(e) => setEditingKPI({...editingKPI, description: e.target.value})}
                  placeholder="es. Numero totale di chiamate effettuate"
                  rows={3}
                />
              </div>
              <div>
                <Label>Applica a</Label>
                <Select 
                  value={editingKPI.applies_to} 
                  onValueChange={(value: 'ASSOCIATE' | 'PARTNER' | 'ADMIN') => setEditingKPI({...editingKPI, applies_to: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSOCIATE">Associate</SelectItem>
                    <SelectItem value="PARTNER">Partner</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo di grafico</Label>
                <Select 
                  value={editingKPI.chart_type} 
                  onValueChange={(value: 'number' | 'bar' | 'pie') => setEditingKPI({...editingKPI, chart_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Numero</SelectItem>
                    <SelectItem value="bar">Grafico a barre</SelectItem>
                    <SelectItem value="pie">Grafico a torta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ordine</Label>
                <Input
                  type="number"
                  value={editingKPI.order_index}
                  onChange={(e) => setEditingKPI({...editingKPI, order_index: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="flex gap-4">
                <Button onClick={() => handleUpdateKPI(editingKPI)}>
                  <Save className="mr-2 h-4 w-4" />
                  Salva modifiche
                </Button>
                <Button variant="outline" onClick={() => setEditingKPI(null)}>
                  Annulla
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User KPIs Modal */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Gestione KPI - {selectedUser.role === 'ASSOCIATE' 
                  ? `${selectedUser.first_name} ${selectedUser.last_name}`
                  : selectedUser.company_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {definitions
                .filter(def => def.applies_to === selectedUser.role && def.enabled)
                .map(def => {
                  const currentValue = userKPIs[def.id]?.value || 0;
                  return (
                    <div key={def.id} className="space-y-2">
                      <Label>{def.label}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          defaultValue={currentValue}
                          onBlur={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            if (value !== currentValue) {
                              handleUpdateKPIValue(selectedUser.id, def.id, value);
                            }
                          }}
                        />
                      </div>
                      {userKPIs[def.id] && (
                        <p className="text-xs text-muted-foreground">
                          Ultimo aggiornamento: {format(new Date(userKPIs[def.id].updated_at), 'dd MMM yyyy HH:mm', { locale: it })}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default KPIManagement;