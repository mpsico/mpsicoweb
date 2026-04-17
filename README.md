# 🧠 Marita Galafate · Web Psicología
## Guía de instalación y puesta en marcha

---

## 📁 Estructura de archivos

```
marita-psicologia/
├── index.html          ← Landing page principal (ES/EN)
├── admin.html          ← Panel de administración (protegido)
├── cancel.html         ← Página de cancelación de citas
├── firebase-config.js  ← Credenciales de Firebase (EDITAR)
├── vercel.json         ← Configuración de despliegue
├── css/
│   └── styles.css      ← Estilos responsive completos
├── js/
│   ├── main.js         ← Navegación, idioma, contacto
│   ├── booking.js      ← Sistema de reservas en tiempo real
│   ├── admin.js        ← Panel de administración
│   └── i18n.js         ← Traducciones ES/EN
├── api/
│   └── send-email.js   ← Función serverless de emails (Resend)
└── assets/             ← Añade aquí tus fotos (marita-foto.jpg)
```

---

## 🚀 PASO 1 — Firebase (base de datos en tiempo real)

### 1.1 Crear el proyecto
1. Ve a https://console.firebase.google.com
2. Haz clic en "Crear un proyecto" → nombre: `marita-psicologia`
3. Desactiva Google Analytics (no es necesario) → Crear proyecto

### 1.2 Activar Realtime Database
1. En el menú izquierdo: **Compilación > Realtime Database**
2. Crear base de datos → Selecciona **Europa (europe-west1)** → Modo de prueba
3. Copia la URL de la base de datos (tiene este formato):
   `https://marita-psicologia-default-rtdb.europe-west1.firebasedatabase.app`

### 1.3 Copiar las credenciales
1. Rueda de ajustes (⚙) → Configuración del proyecto
2. Pestaña "General" → Baja hasta "Tus apps" → Haz clic en `</>` (web)
3. Nombre de la app: `marita-web` → Registrar app
4. Copia el objeto `firebaseConfig` y pégalo en `firebase-config.js`

### 1.4 Configurar reglas de seguridad
En Realtime Database → Reglas, pega esto y publica:

```json
{
  "rules": {
    "bookings":    { ".read": true,           ".write": true },
    "schedule":    { ".read": true,           ".write": "auth != null" },
    "specialDays": { ".read": true,           ".write": "auth != null" },
    "contacts":    { ".read": "auth != null", ".write": true }
  }
}
```

### 1.5 Crear usuario admin
1. Compilación → Authentication → Comenzar
2. Método de acceso → Email/contraseña → Activar
3. Usuarios → Añadir usuario:
   - Email: `maritagpsicologa@gmail.com`
   - Contraseña: (elige una segura, min 8 caracteres)

---

## 📧 PASO 2 — Resend (emails sin marca de agua)

### 2.1 Crear cuenta
1. Ve a https://resend.com → Sign up (gratis)
2. Verifica tu email

### 2.2 Opción A: Usar sin dominio propio (para pruebas)
- En `api/send-email.js`, línea `from`:
  ```
  from: 'Marita Galafate · Psicóloga <onboarding@resend.dev>',
  ```
- Los emails llegarán correctamente pero el remitente será `onboarding@resend.dev`

### 2.3 Opción B: Usar tu dominio (recomendado, aspecto profesional)
1. En Resend: Domains → Add Domain → escribe `tudominio.com`
2. Añade los registros DNS que te indica (en tu proveedor de dominio, ej: GoDaddy, Namecheap)
3. Espera verificación (5-30 minutos)
4. En `api/send-email.js`, línea `from`:
   ```
   from: 'Marita Galafate · Psicóloga <noreply@tudominio.com>',
   ```

### 2.4 Obtener API Key
1. Resend → API Keys → Create API Key
2. Name: `marita-web` → Full access → Add
3. Copia la clave (empieza por `re_`)
4. **No la pegues en ningún archivo del proyecto** — se añade en Vercel (paso 3.3)

---

## 🌐 PASO 3 — Vercel (hosting gratuito)

### 3.1 Crear cuenta
1. Ve a https://vercel.com → Sign up con GitHub (recomendado)

### 3.2 Subir el proyecto
**Opción A — Desde GitHub (recomendado):**
1. Crea un repositorio en GitHub y sube todos los archivos
2. En Vercel: New Project → Import desde GitHub → selecciona el repo
3. Framework: **Other** → Deploy

**Opción B — Desde tu ordenador:**
1. Instala Vercel CLI: `npm i -g vercel`
2. Desde la carpeta del proyecto: `vercel`
3. Sigue las instrucciones

### 3.3 Añadir la API Key de Resend
1. En Vercel → tu proyecto → Settings → Environment Variables
2. Añade:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_xxxxxxxxxxxxxxxxx` (la clave de Resend)
   - Environments: Production, Preview, Development
3. Haz clic en Save
4. Ve a Deployments → haz Redeploy para que aplique

### 3.4 Tu web está en vivo
Vercel te dará una URL del tipo: `https://marita-psicologia.vercel.app`

---

## 🖼️ PASO 4 — Añadir fotos de Marita

1. Guarda las fotos en la carpeta `assets/`:
   - `assets/marita-hero.jpg` → foto principal (recomendado: 600×800px, vertical)
   - `assets/marita-sobre.jpg` → foto de "sobre mí" (recomendado: 500×700px)

2. En `index.html`, descomenta las líneas de imagen:

En la sección Hero (busca `hero-photo-frame`):
```html
<!-- Descomenta esta línea y comenta/elimina el placeholder -->
<img src="assets/marita-hero.jpg" alt="Marita Galafate, Psicóloga" />
```

En la sección Sobre mí (busca `about-photo-placeholder`):
```html
<!-- Sustituye el div placeholder por: -->
<img class="about-photo" src="assets/marita-sobre.jpg" alt="Marita Galafate" />
```

---

## 🔒 PASO 5 — Dominio personalizado (opcional)

Si tienes un dominio (ej: `maritagalatepsicologa.com`):
1. En Vercel → tu proyecto → Settings → Domains
2. Add Domain → escribe tu dominio
3. Vercel te indicará qué registros DNS añadir en tu proveedor
4. En `api/send-email.js`, actualiza el campo `from` con tu dominio

---

## 🎛️ USO DEL PANEL DE ADMINISTRACIÓN

### Acceder
Ve a `tudominio.com/admin.html`
- Email: `maritagpsicologa@gmail.com`
- Contraseña: la que pusiste en Firebase Authentication

### Gestionar reservas
- **Dashboard**: resumen de citas próximas
- **Reservas**: ver todas las citas, cancelar, ver detalles del paciente
- Al cancelar, el cliente recibe email automático

### Editar horarios
- **Horarios**: activa/desactiva días, añade o elimina horas
- Guarda con el botón verde
- Los cambios se reflejan inmediatamente en la web

### Días especiales
- **Días especiales**: haz clic en cualquier día del calendario
- Opciones: cerrado (festivo) o abierto con horario personalizado
- Verde = día normal, amarillo = personalizado, rojo = cerrado

---

## 💰 Costes mensuales estimados

| Servicio | Plan | Coste |
|----------|------|-------|
| Firebase Realtime DB | Spark (gratis) | 0€ |
| Resend | Free (3.000 emails/mes) | 0€ |
| Vercel | Hobby (gratis) | 0€ |
| Dominio (opcional) | — | ~10€/año |
| **TOTAL** | | **0€/mes** |

Si en el futuro necesitas más de 3.000 emails/mes (muy poco probable para una consulta):
- Resend Pro: $20/mes por 50.000 emails

---

## ❓ Preguntas frecuentes

**¿Puedo cambiar los colores?**
Sí. En `css/styles.css`, al principio del archivo están todas las variables de color bajo `:root { }`. Cambia los valores `--green-*` por los colores que prefieras.

**¿Puedo añadir más idiomas?**
Sí. En `js/i18n.js`, añade un nuevo bloque con la clave del idioma (ej: `fr: { ... }`) y un botón en el nav.

**¿Cómo añado más horas disponibles?**
Desde el Panel Admin → Horarios. No necesitas tocar código.

**¿Qué pasa si se cae Firebase?**
Es extremadamente raro (SLA 99.95%). Firebase es de Google y tiene redundancia automática.

**¿Los datos de los pacientes son seguros?**
Firebase cifra los datos en tránsito (HTTPS) y en reposo. Para cumplir el RGPD añade una política de privacidad en la web.

---

## 📞 Soporte

Si tienes dudas sobre la configuración, contacta a quien te configuró la web.
