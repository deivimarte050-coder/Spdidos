// Servicio simple de eventos para sincronización en tiempo real
class EventService {
  private static listeners: Map<string, (() => void)[]> = new Map();
  
  static subscribe(event: string, callback: () => void): () => void {
    if (!EventService.listeners.has(event)) {
      EventService.listeners.set(event, []);
    }
    EventService.listeners.get(event)?.push(callback);
    
    // Devolver función para cancelar suscripción
    return () => {
      const callbacks = EventService.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }
  
  static emit(event: string): void {
    const callbacks = EventService.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error(`❌ [EventService] Error en evento ${event}:`, error);
        }
      });
    }
  }
}

export default EventService;
