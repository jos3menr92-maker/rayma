# Resumen Técnico: Sistema de Reinicio Diario de Energy Bars

## 📋 Resumen Ejecutivo

Se implementa un sistema automático que reinicia los **Energy Bars** de usuarios en plan gratuito a **10 barras** cada medianoche (00:00 UTC).

**Características clave:**
- ✅ Usuarios premium (annual_pass activo) NO se ven afectados
- ✅ Energía comprada NUNCA se sobrescribe
- ✅ Prevención de resets duplicados (control con `last_energy_reset`)
- ✅ Ejecución automática via pg_cron
- ✅ Auditoría completa de logs

---

## 🏗️ Arquitectura

### 1. Base de Datos (User Entity)

**Cambios a `base44/entities/User.jsonc`:**

```jsonc
{
  // Campos nuevos:
  "energy_bars": {
    "type": "number",
    "default": 10,
    "description": "Current AI energy bars"
  },
  "purchased_energy": {
    "type": "number",
    "default": 0,
    "description": "Never-resetting purchased energy"
  },
  "last_energy_reset": {
    "type": "string",
    "format": "date",
    "description": "Date of last daily reset (YYYY-MM-DD)"
  }
}
```

**Flujo de data:**
- Usuario inicia: `energy_bars = 10`, `purchased_energy = 0`
- Usuario compra 50 barras: `energy_bars += 50`, `purchased_energy += 50`
- Medianoche: `energy_bars = 10 + purchased_energy`, `last_energy_reset = today`
- Resultado: `energy_bars = 10 + 50 = 60`

### 2. Edge Function (Supabase)

**Archivo:** `base44/functions/resetDailyEnergyBars/entry.ts`

**Flujo:**
```
HTTP POST Request (from pg_cron)
    ↓
Authorization: Bearer SCHEDULED_JOB_SECRET_KEY
    ↓
Fetch all Users (limit: 10,000)
    ↓
Para cada usuario:
  - ¿Tiene annual_pass_expires_at > hoy? → SKIP (premium)
  - ¿Ya fue reset hoy? → SKIP (prevent duplicate)
  - Sino → update energy_bars = 10 + purchased_energy
    ↓
Retorna JSON con resumen
```

**Pseudocódigo:**

```javascript
for (user of allUsers) {
  const isPremium = user.annual_pass_expires_at > now;
  const alreadyReset = user.last_energy_reset === today;
  
  if (!isPremium && !alreadyReset) {
    const newEnergy = 10 + (user.purchased_energy || 0);
    update(user.id, {
      energy_bars: newEnergy,
      last_energy_reset: today
    });
  }
}
```

### 3. Programación (pg_cron)

**Archivo:** `base44/functions/resetDailyEnergyBars/setup-cron.sql`

Configuración:
- **Cron expression:** `0 0 * * *` (00:00 UTC diariamente)
- **Llamada:** HTTP POST a Edge Function
- **Autenticación:** Bearer token (SCHEDULED_JOB_SECRET_KEY)

**SQL:**
```sql
SELECT cron.schedule(
  'reset-daily-energy-bars',
  '0 0 * * *',
  'SELECT http_post(...)'
);
```

---

## 🔄 Flujos de Uso

### Flujo 1: Usuario Free (Escenario Típico)

```
Día 1 06:00 AM
  └─ energy_bars = 10 (default)
     Usa 3 barras en chat
     └─ energy_bars = 7

Día 1 23:59 PM
  └─ energy_bars = 7

Día 2 00:00 AM (CRON EJECUTA)
  └─ energy_bars = 10 (reset diario)
     last_energy_reset = 2026-06-23
```

### Flujo 2: Usuario Free Que Compra Energía

```
Día 1 09:00 AM
  └─ Usuario compra 50 barras
     energy_bars = 10 + 50 = 60
     purchased_energy = 50

Día 2 00:00 AM (CRON EJECUTA)
  └─ Sigue siendo free (no tiene annual_pass)
     energy_bars = 10 + 50 = 60 (NOT 10!)
     purchased_energy = 50 (no cambia)
```

### Flujo 3: Usuario Premium

```
Día 1 12:00 PM
  └─ Usuario compra annual_pass
     annual_pass_expires_at = 2027-06-22
     energy_bars = 10

Día 2 00:00 AM (CRON EJECUTA)
  └─ Tiene annual_pass activo → SKIPPED
     energy_bars = 10 (no cambia)

Día 365 06:00 AM (Vence el pase)
  └─ annual_pass_expires_at = 2027-06-22 (pasado)
     Vuelve a ser "free"

Día 366 00:00 AM (CRON EJECUTA)
  └─ Ya no tiene annual_pass activo → RESET
     energy_bars = 10
```

---

## 🛡️ Garantías de Integridad

### 1. Nunca Sobrescribir Energía Comprada

**Protección:** Almacenar `purchased_energy` separadamente

```javascript
// ✓ CORRECTO:
energy_bars = 10 + purchased_energy;

// ✗ INCORRECTO:
energy_bars = 10; // Sobrescribe purchased_energy!
```

### 2. Prevenir Resets Duplicados

**Protección:** Campo `last_energy_reset` con control

```javascript
if (user.last_energy_reset !== today) {
  // Perform reset
}
```

### 3. Respetar Premium

**Protección:** Verificar `annual_pass_expires_at`

```javascript
const isPremium = new Date(annual_pass_expires_at + 'T23:59:59Z') > new Date();
if (!isPremium) {
  // Only reset free users
}
```

---

## 📊 Ejemplo de Respuesta JSON

```json
{
  "success": true,
  "usersResetCount": 1247,
  "timestamp": "2026-06-23T00:00:00.000Z",
  "summary": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "newEnergyBars": 10,
      "purchasedEnergy": 0
    },
    {
      "userId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "email": "jane@example.com",
      "newEnergyBars": 65,
      "purchasedEnergy": 55
    }
  ],
  "message": "Successfully reset daily energy for 1247 free users"
}
```

---

## 🧪 Plan de Prueba

### Test 1: Reset Básico
```javascript
// Usuario free sin energía comprada
const user = { 
  energy_bars: 3, 
  purchased_energy: 0, 
  annual_pass_expires_at: null 
};
// Esperado: energy_bars = 10
```

### Test 2: Respeta Compras
```javascript
// Usuario free CON energía comprada
const user = { 
  energy_bars: 8, 
  purchased_energy: 25, 
  annual_pass_expires_at: null 
};
// Esperado: energy_bars = 35 (10 + 25)
```

### Test 3: Ignora Premium
```javascript
// Usuario premium
const user = { 
  energy_bars: 5, 
  purchased_energy: 0, 
  annual_pass_expires_at: "2027-12-31" 
};
// Esperado: energy_bars = 5 (NO RESET)
```

### Test 4: Previene Duplicados
```javascript
// Usuario ya reset hoy
const user = { 
  energy_bars: 10, 
  last_energy_reset: "2026-06-23" 
};
// Si se ejecuta otra vez hoy → NO RESET
```

---

## 📝 Utilidades Frontend

**Archivo:** `src/utils/energyBarsUtil.js`

Hooks y funciones disponibles:

```javascript
// Hook para leer energía
const { energy_bars, purchased_energy, total_energy } = useEnergyBars(userId);

// Deducir energía (cuando usa AI)
await deductEnergyBars(userId, 1);

// Agregar energía comprada (después de Stripe)
await addPurchasedEnergy(userId, 50);

// Helpers
hasEnoughEnergy(currentBars, requiredBars);
formatEnergyDisplay(currentBars, isPremium);
calculateTimeUntilReset(lastResetDate);
```

---

## 🎨 Componente UI

**Archivo:** `src/components/EnergyDisplay.jsx`

Características:
- ✅ Mobile-responsive (sin hover states)
- ✅ Barra visual con animaciones
- ✅ Countdown timer hasta reset
- ✅ Diferenciación premium/free/bajo
- ✅ Accesibilidad (aria-labels)

---

## 🚀 Deployment Checklist

- [ ] Actualizar `base44/entities/User.jsonc`
- [ ] Crear Edge Function en `base44/functions/resetDailyEnergyBars/entry.ts`
- [ ] Ejecutar `setup-cron.sql` en Supabase SQL Editor
- [ ] Configurar `SCHEDULED_JOB_SECRET_KEY` en Supabase env vars
- [ ] Probar Edge Function manualmente con curl
- [ ] Verificar logs en `cron.job_run_details`
- [ ] Agregar `energyBarsUtil.js` al proyecto
- [ ] Usar `EnergyDisplay.jsx` en componentes relevantes
- [ ] Documentar en README del proyecto

---

## 🔗 Referencias

- Base44 Documentation: https://base44.com/docs
- Supabase pg_cron: https://supabase.com/docs/guides/database/extensions/pg_cron
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- RAYMA Compliance: Ver `src/COMPLIANCE_CHECKLIST.md`

---

## 📞 Soporte

Si hay problemas durante la implementación:
1. Verifica logs en Supabase → Logs
2. Valida que pg_cron esté habilitado
3. Confirma `SCHEDULED_JOB_SECRET_KEY` es igual en cron + env vars
4. Revisa que User entity fue sincronizado con Base44
