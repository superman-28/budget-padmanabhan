import { useEffect, useMemo, useState } from 'react';
import AuthHeader from '@/components/AuthHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services/eventService';
import { firestoreService } from '@/services/firestoreService';
import { userLinkingService } from '@/services/userLinkingService';
import { TripEvent } from '@/types/event';
import { Transaction } from '@/pages/Index';
import { EventFormDialog } from '@/components/events/EventFormDialog';
import { EventCard } from '@/components/events/EventCard';
import { useToast } from '@/hooks/use-toast';

interface Category { value: string; label: string; icon: string; color: string; }

const Events = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState<TripEvent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEvent, setEditEvent] = useState<TripEvent | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const u1 = eventService.subscribeToEvents(user.uid, (e) => { setEvents(e); setLoading(false); });
    const u2 = firestoreService.subscribeToTransactions(user.uid, setTransactions);
    const u3 = firestoreService.subscribeToCategories(user.uid, setCategories);
    return () => { u1(); u2(); u3(); };
  }, [user]);

  const activeEvents = useMemo(() => events.filter((e) => e.status === 'active'), [events]);
  const closedEvents = useMemo(() => events.filter((e) => e.status === 'closed'), [events]);

  const handleAdd = async (data: Omit<TripEvent, 'id' | 'status' | 'createdAt'>) => {
    if (!user) return;
    try { await eventService.addEvent(user.uid, data); toast({ title: 'Event created' }); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const handleEdit = async (data: Omit<TripEvent, 'id' | 'status' | 'createdAt'>) => {
    if (!user || !editEvent) return;
    try {
      await eventService.updateEvent(user.uid, { ...editEvent, ...data });
      toast({ title: 'Event updated' });
      setEditEvent(null); setEditOpen(false);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm('Delete this event? Transactions remain but get unlinked.')) return;
    try { await eventService.deleteEvent(user.uid, id); toast({ title: 'Event deleted' }); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const handleToggleStatus = async (e: TripEvent) => {
    if (!user) return;
    await eventService.updateEvent(user.uid, { ...e, status: e.status === 'active' ? 'closed' : 'active' });
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    try {
      await userLinkingService.deleteSharedTransaction(user.uid, id);
      await firestoreService.deleteTransaction(user.uid, id);
    } catch (e) { console.error(e); }
  };

  const startEdit = (e: TripEvent) => { setEditEvent(e); setEditOpen(true); };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading events...</p>
        </div>
      </div>
    );
  }

  const renderList = (list: TripEvent[], empty: string) => {
    if (list.length === 0) return <p className="text-center text-muted-foreground py-8 text-sm">{empty}</p>;
    return list.map((ev) => (
      <EventCard
        key={ev.id}
        event={ev}
        transactions={transactions}
        categories={categories}
        onEdit={startEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        onDeleteTransaction={handleDeleteTransaction}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="flex-shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 truncate">
                <MapPin className="h-5 w-5 text-primary" /> Events & Trips
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Track expenses for trips and events</p>
            </div>
          </div>
          <EventFormDialog onSubmit={handleAdd} />
        </div>

        <Tabs defaultValue="active">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="active">Active ({activeEvents.length})</TabsTrigger>
            <TabsTrigger value="closed">Closed ({closedEvents.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-3 mt-4">
            {renderList(activeEvents, 'No active events. Create one to start tracking.')}
          </TabsContent>
          <TabsContent value="closed" className="space-y-3 mt-4">
            {renderList(closedEvents, 'No closed events.')}
          </TabsContent>
        </Tabs>

        <EventFormDialog
          onSubmit={handleEdit}
          editEvent={editEvent}
          open={editOpen}
          onOpenChange={(o) => { setEditOpen(o); if (!o) setEditEvent(null); }}
        />
      </div>
    </div>
  );
};

export default Events;
