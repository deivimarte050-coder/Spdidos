# Guía para generar el APK de Spdidos

## Requisitos previos (instalar manualmente)

### 1. Instalar JDK 17
- Descarga: https://adoptium.net/temurin/releases/?version=17
- Selecciona **Windows x64 → .msi installer**
- Instálalo y reinicia VS Code / terminal

### 2. Instalar Android Studio
- Descarga: https://developer.android.com/studio
- Instálalo con los componentes por defecto
- Al abrir por primera vez, acepta las licencias del SDK

---

## Paso 1: Agregar google-services.json

**Este paso es OBLIGATORIO para que funcionen las notificaciones push.**

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Abre el proyecto **spdidos-8edda**
3. Ve a **Configuración del proyecto** (engranaje) → **General**
4. En "Tus apps", haz clic en **Agregar app** → **Android**
5. Nombre del paquete: `app.spdidos.client`
6. Registra la app y descarga `google-services.json`
7. Copia el archivo a: `android/app/google-services.json`

---

## Paso 2: Agregar sonido de notificación (opcional)

Si quieres un sonido personalizado para pedidos:
1. Coloca un archivo `.wav` o `.mp3` llamado `notification.wav` en:
   ```
   android/app/src/main/res/raw/notification.wav
   ```
2. Si no colocas ningún archivo, se usará el sonido por defecto del sistema.

---

## Paso 3: Sincronizar y abrir en Android Studio

Desde la terminal en el proyecto:

```bash
npm run cap:build
```

Luego abre en Android Studio:

```bash
npm run cap:open
```

---

## Paso 4: Generar el APK

### Opción A: APK de debug (para pruebas rápidas)
1. En Android Studio, ve a **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

### Opción B: APK firmado (para distribución)
1. En Android Studio, ve a **Build** → **Generate Signed Bundle / APK**
2. Selecciona **APK**
3. Crea un nuevo keystore o usa uno existente
4. Selecciona **release** como build type
5. El APK estará en: `android/app/build/outputs/apk/release/`

### Opción C: Desde terminal (sin Android Studio)
```bash
cd android
./gradlew assembleDebug
```
El APK se genera en `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Paso 5: Instalar en el teléfono

1. Transfiere el APK al teléfono (cable USB, Google Drive, etc.)
2. En el teléfono, abre el archivo APK
3. Permite la instalación de "fuentes desconocidas" si se solicita
4. La app aparecerá como "Spdidos"

---

## Comandos útiles

| Comando | Descripción |
|---|---|
| `npm run cap:build` | Build web + sync con Android |
| `npm run cap:sync` | Solo sincronizar cambios |
| `npm run cap:open` | Abrir en Android Studio |

---

## Configuración actual

- **App ID:** `app.spdidos.client`
- **App Name:** Spdidos
- **URL remota:** `https://spdidos.vercel.app`
- **Canales de notificación:**
  - `spdidos_orders` — Pedidos (sonido + vibración, prioridad alta)
  - `spdidos_general` — General
- **Plugins Capacitor:**
  - Push Notifications (FCM)
  - Local Notifications
  - Splash Screen
  - Status Bar
