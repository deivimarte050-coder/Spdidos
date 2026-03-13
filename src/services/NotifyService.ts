const NOTIFY_ENDPOINT = '/api/notify';

export async function notifyNewOrder(order: {
  clientId?: string;
  clientName?: string;
  businessId?: string;
  businessName?: string;
  total?: number;
}): Promise<void> {
  try {
    await fetch(NOTIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'new_order',
        clientId: order.clientId || '',
        clientName: order.clientName || '',
        businessId: order.businessId || '',
        businessName: order.businessName || '',
        total: order.total ?? 0,
      }),
    });
  } catch (err) {
    console.warn('[NotifyService] Error sending new_order notification:', err);
  }
}

export async function notifyStatusUpdate(order: {
  status: string;
  clientId?: string;
  businessId?: string;
  businessName?: string;
}): Promise<void> {
  try {
    await fetch(NOTIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'status_update',
        status: order.status,
        clientId: order.clientId || '',
        businessId: order.businessId || '',
        businessName: order.businessName || '',
      }),
    });
  } catch (err) {
    console.warn('[NotifyService] Error sending status_update notification:', err);
  }
}
