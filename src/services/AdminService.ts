import { Application, Restaurant } from '../types';
import { RESTAURANTS } from '../constants';

type AdminSubscriber = (data: { applications: Application[], restaurants: Restaurant[] }) => void;

class AdminServiceClass {
  private applications: Application[] = [
    {
      id: 'app1',
      type: 'delivery',
      name: 'Juan Perez',
      email: 'juan@example.com',
      whatsapp: '809-555-0101',
      status: 'pending',
      createdAt: Date.now() - 86400000
    },
    {
      id: 'app2',
      type: 'business',
      name: 'Pizzería Don Mario',
      email: 'mario@pizza.com',
      whatsapp: '809-555-0202',
      status: 'pending',
      createdAt: Date.now() - 43200000
    }
  ];
  private restaurants: Restaurant[] = [...RESTAURANTS];
  private subscribers: AdminSubscriber[] = [];

  constructor() {
    try {
      const savedApps = localStorage.getItem('admin_applications');
      const savedRestos = localStorage.getItem('admin_restaurants');
      if (savedApps) this.applications = JSON.parse(savedApps);
      if (savedRestos) this.restaurants = JSON.parse(savedRestos);
    } catch (e) {
      console.error("Error loading AdminService data:", e);
    }
  }

  private notify() {
    this.subscribers.forEach(sub => sub({ 
      applications: this.applications, 
      restaurants: this.restaurants 
    }));
    localStorage.setItem('admin_applications', JSON.stringify(this.applications));
    localStorage.setItem('admin_restaurants', JSON.stringify(this.restaurants));
  }

  subscribe(callback: AdminSubscriber) {
    this.subscribers.push(callback);
    callback({ applications: this.applications, restaurants: this.restaurants });
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  updateApplicationStatus(id: string, status: 'approved' | 'rejected') {
    this.applications = this.applications.map(app => 
      app.id === id ? { ...app, status } : app
    );
    this.notify();
  }

  addRestaurant(restaurant: Restaurant) {
    this.restaurants = [restaurant, ...this.restaurants];
    this.notify();
  }

  updateRestaurant(id: string, data: Partial<Restaurant>) {
    this.restaurants = this.restaurants.map(r => 
      r.id === id ? { ...r, ...data } : r
    );
    this.notify();
  }

  deleteRestaurant(id: string) {
    this.restaurants = this.restaurants.filter(r => r.id !== id);
    this.notify();
  }
}

export const AdminService = new AdminServiceClass();
