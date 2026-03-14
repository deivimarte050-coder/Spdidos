import FirebaseServiceV2 from './FirebaseServiceV2';

export interface OrderNotificationData {
  orderId: string;
  businessId: string;
  businessName: string;
  clientId: string;
  clientName: string;
  total: number;
  status: string;
  deliveryId?: string;
}

class OrderNotificationService {
  /**
   * Send notifications when a new order is created
   * - Business: receives notification about new order
   * - Admin: receives notification about new order from any business
   */
  async notifyNewOrder(data: OrderNotificationData): Promise<void> {
    try {
      // TODO: FCM notifications disabled until Cloud Function is fixed to respect role filtering
      // The current Cloud Function sends notifications to ALL users regardless of role
      // Only browser notifications (already role-filtered) will work for now
      
      // Send to the specific business
      // await FirebaseServiceV2.sendPushNotificationToRoles({
      //   title: '¡Nuevo Pedido Recibido!',
      //   body: `Pedido #${data.orderId.slice(-8).toUpperCase()} de ${data.clientName}\nTotal: RD$ ${data.total.toFixed(0)}`,
      //   roles: ['business'],
      //   businessId: data.businessId,
      //   tag: 'new_order',
      // });

      // Send to all admins
      // await FirebaseServiceV2.sendPushNotificationToRoles({
      //   title: `Nuevo Pedido - ${data.businessName}`,
      //   body: `Cliente: ${data.clientName}\nTotal: RD$ ${data.total.toFixed(0)}\n#${data.orderId.slice(-8).toUpperCase()}`,
      //   roles: ['admin'],
      //   tag: 'new_order_admin',
      // });

      // Create in-app notifications
      await FirebaseServiceV2.createInAppNotificationsForTarget({
        title: '¡Nuevo Pedido Recibido!',
        body: `Pedido #${data.orderId.slice(-8).toUpperCase()} de ${data.clientName} por RD$ ${data.total.toFixed(0)}`,
        target: 'businesses',
      });

      console.log(`[OrderNotif] New order notifications sent for order ${data.orderId}`);
    } catch (error) {
      console.error('[OrderNotif] Error sending new order notifications:', error);
    }
  }

  /**
   * Send notifications when order status changes
   */
  async notifyOrderStatusUpdate(data: OrderNotificationData, newStatus: string): Promise<void> {
    try {
      const statusMessages: Record<string, string> = {
        accepted: 'Tu pedido ha sido aceptado',
        preparing: 'Tu pedido está siendo preparado',
        ready: 'Tu pedido está listo para entrega',
        on_the_way: 'Tu pedido está en camino',
        delivered: 'Tu pedido ha sido entregado',
        cancelled: 'Tu pedido ha sido cancelado',
      };

      const message = statusMessages[newStatus] || `Estado del pedido actualizado: ${newStatus}`;

      // Send notification to client
      // await FirebaseServiceV2.sendPushNotificationToRoles({
      //   title: `Actualización de Pedido #${data.orderId.slice(-8).toUpperCase()}`,
      //   body: message,
      //   roles: ['client'],
      //   userId: data.clientId,
      //   tag: 'order_status',
      // });

      // Create in-app notification for client
      await FirebaseServiceV2.createInAppNotification({
        userId: data.clientId,
        title: 'Actualización de Pedido',
        message: `${message} - ${data.businessName}`,
        source: 'order',
      });

      // If order is ready, notify delivery drivers
      if (newStatus === 'ready') {
        // await FirebaseServiceV2.sendPushNotificationToRoles({
        //   title: '¡Pedido Disponible para Entrega!',
        //   body: `${data.businessName} - Pedido #${data.orderId.slice(-8).toUpperCase()}\nTotal: RD$ ${data.total.toFixed(0)}`,
        //   roles: ['delivery'],
        //   tag: 'order_ready',
        // });
      }

      // If order is assigned to delivery, notify the specific driver
      if (newStatus === 'on_the_way' && data.deliveryId) {
        // await FirebaseServiceV2.sendPushNotificationToRoles({
        //   title: 'Nuevo Pedido Asignado',
        //   body: `Retirar en ${data.businessName}\nCliente: ${data.clientName}\nTotal: RD$ ${data.total.toFixed(0)}`,
        //   roles: ['delivery'],
        //   userId: data.deliveryId,
        //   tag: 'order_assigned',
        // });
      }

      console.log(`[OrderNotif] Status update notifications sent for order ${data.orderId} -> ${newStatus}`);
    } catch (error) {
      console.error('[OrderNotif] Error sending status update notifications:', error);
    }
  }

  /**
   * Send notification when order is cancelled
   */
  async notifyOrderCancelled(data: OrderNotificationData, reason?: string): Promise<void> {
    try {
      const body = reason 
        ? `Pedido #${data.orderId.slice(-8).toUpperCase()} cancelado: ${reason}`
        : `Pedido #${data.orderId.slice(-8).toUpperCase()} ha sido cancelado`;

      // Notify client
      // await FirebaseServiceV2.sendPushNotificationToRoles({
      //   title: 'Pedido Cancelado',
      //   body: `${body} - ${data.businessName}`,
      //   roles: ['client'],
      //   userId: data.clientId,
      //   tag: 'order_cancelled',
      // });

      // Notify business
      // await FirebaseServiceV2.sendPushNotificationToRoles({
      //   title: 'Pedido Cancelado',
      //   body: `Cliente: ${data.clientName}\n${body}`,
      //   roles: ['business'],
      //   businessId: data.businessId,
      //   tag: 'order_cancelled',
      // });

      // Notify admin
      // await FirebaseServiceV2.sendPushNotificationToRoles({
      //   title: `Pedido Cancelado - ${data.businessName}`,
      //   body: `Cliente: ${data.clientName}\n${body}`,
      //   roles: ['admin'],
      //   tag: 'order_cancelled_admin',
      // });

      console.log(`[OrderNotif] Cancellation notifications sent for order ${data.orderId}`);
    } catch (error) {
      console.error('[OrderNotif] Error sending cancellation notifications:', error);
    }
  }
}

export default new OrderNotificationService();
