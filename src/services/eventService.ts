import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TripEvent } from '@/types/event';

function stripUndefined(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const eventService = {
  subscribeToEvents(userId: string, callback: (events: TripEvent[]) => void) {
    const ref = collection(db, 'users', userId, 'events');
    const q = query(ref, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const events: TripEvent[] = [];
        snapshot.forEach((d) => events.push({ id: d.id, ...d.data() } as TripEvent));
        callback(events);
      },
      (error) => {
        console.error('EventService: subscription error', error);
        callback([]);
      }
    );
  },

  async addEvent(userId: string, data: Omit<TripEvent, 'id' | 'status' | 'createdAt'>) {
    const ref = collection(db, 'users', userId, 'events');
    const docRef = await addDoc(ref, stripUndefined({
      ...data,
      status: 'active',
      createdAt: Timestamp.now(),
    }));
    return docRef.id;
  },

  async updateEvent(userId: string, event: TripEvent) {
    const ref = doc(db, 'users', userId, 'events', event.id);
    const { id, ...rest } = event;
    await updateDoc(ref, stripUndefined({ ...rest, updatedAt: Timestamp.now() }));
  },

  async deleteEvent(userId: string, eventId: string) {
    const ref = doc(db, 'users', userId, 'events', eventId);
    await deleteDoc(ref);
  },
};
