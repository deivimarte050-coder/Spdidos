package app.spdidos.client;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);

            // Canal para pedidos (con sonido)
            NotificationChannel ordersChannel = new NotificationChannel(
                "spdidos_orders",
                "Pedidos",
                NotificationManager.IMPORTANCE_HIGH
            );
            ordersChannel.setDescription("Notificaciones de nuevos pedidos");
            ordersChannel.enableVibration(true);
            ordersChannel.setVibrationPattern(new long[]{0, 500, 200, 500});
            ordersChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

            // Sonido personalizado si existe, sino default
            try {
                Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/raw/notification");
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                ordersChannel.setSound(soundUri, audioAttributes);
            } catch (Exception e) {
                // Usa sonido por defecto
            }

            manager.createNotificationChannel(ordersChannel);

            // Canal general
            NotificationChannel generalChannel = new NotificationChannel(
                "spdidos_general",
                "General",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            generalChannel.setDescription("Notificaciones generales de Spdidos");
            generalChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(generalChannel);
        }
    }
}
