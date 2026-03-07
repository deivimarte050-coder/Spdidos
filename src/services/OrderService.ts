import { Order, OrderStatus } from '../types';

// Mocking real-time database behavior
type OrderListener = (orders: Order[]) => void;
let listeners: OrderListener[] = [];
let orders: Order[] = [];

try {
  const saved = localStorage.getItem('delivery_orders');
  if (saved) {
    orders = JSON.parse(saved).filter((o: any) => o.clientLocation && o.businessLocation);
  }
} catch (e) {
  console.error("Error loading OrderService data:", e);
  orders = [];
}

const notify = () => {
  listeners.forEach(l => l([...orders]));
  localStorage.setItem('delivery_orders', JSON.stringify(orders));
};

export const OrderService = {
  subscribe: (callback: OrderListener) => {
    listeners.push(callback);
    callback([...orders]);
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  },

  createOrder: (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => {
    const newOrder: Order = {
      ...order,
      id: `order_${Date.now()}`,
      createdAt: Date.now(),
      status: 'pending',
      distance: 'Calculando...',
      eta: '-- min'
    };
    orders.push(newOrder);
    notify();
    return newOrder;
  },

  updateStatus: (orderId: string, status: OrderStatus, deliveryId?: string) => {
    orders = orders.map(o => {
      if (o.id === orderId) {
        const updated = { ...o, status, deliveryId: deliveryId || o.deliveryId };
        // Initial location for delivery if just picked up
        if (status === 'picked_up' && !o.deliveryLocation) {
          updated.deliveryLocation = o.businessLocation;
        }
        return updated;
      }
      return o;
    });
    notify();
  },

  updateLocation: (orderId: string, location: [number, number]) => {
    orders = orders.map(o => {
      if (o.id === orderId) {
        // Simple distance calculation (Haversine approximation)
        const dist = Math.sqrt(
          Math.pow(location[0] - o.clientLocation[0], 2) + 
          Math.pow(location[1] - o.clientLocation[1], 2)
        ) * 111; // 111km per degree approx
        
        return { 
          ...o, 
          deliveryLocation: location,
          distance: `${dist.toFixed(1)} km`,
          eta: `${Math.round(dist * 5)} min` // Assume 5 min per km
        };
      }
      return o;
    });
    notify();
  }
};
