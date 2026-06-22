# 🔋 Reinicio Diario de Energy Bars - RAYMA

## Descripción General

**Objetivo:** Reiniciar los "Energy Bars" de usuarios en el plan gratuito a 10 cada medianoche (00:00 UTC).

**Funcionamiento:**
- ✓ Usuarios SIN `annual_pass` activo: Se reinician a 10 + energía comprada
- ✓ Usuarios CON `annual_pass` activo: NO se afectan
- ✓ Energía comprada: NUNCA se sobrescribe

---

## Archivos Incluidos

### 1. `entry.ts` - Edge Function
**Ubicación:** `base44/functions/resetDailyEnergyBars/entry.ts`

La función que:
- Busca todos los usuarios sin suscripción premium activa
- Reinicia su `energy_bars` a 10 + energía comprada
- Registra la fecha del último reset para evitar duplicados
- Retorna un resumen detallado en JSON

### 2. `setup-cron.sql` - Script de Configuración
**Ubicación:** `base44/functions/resetDailyEnergyBars/setup-cron.sql`

SQL que configura:
- Extension `pg_cron` en Supabase
- Trabajo cron que llama la función cada día a las 12:00 AM UTC
- Verificación de logs

### 3. Actualización a `User.jsonc`
**Ubicación:** `base44/entities/User.jsonc`

Nuevos campos:
- `energy_bars` (number): Barras actuales (default: 10)
- `purchased_energy` (number): Energía comprada (never resets)
- `last_energy_reset` (date): Fecha del último reset

---

## 🚀 Pasos de Instalación

### Paso 1: Desplegar la Edge Function

```bash
# 1. Asegúrate de que los archivos están en:
#    base44/functions/resetDailyEnergyBars/entry.ts

# 2. Sincroniza con Base44 (automático si usas GitHub sync)
git add base44/functions/resetDailyEnergyBars/
git commit -m "feat: add daily energy reset function"
git push
```

La función estará disponible en:
```
https://YOUR_RAYMA_PROJECT.supabase.co/functions/v1/resetDailyEnergyBars
```

### Paso 2: Configurar Variable de Entorno

En Supabase Dashboard → Settings → Environment Variables:

```
SCHEDULED_JOB_SECRET_KEY = generate-a-strong-random-string-here
```

Ejemplo:
```
SCHEDULED_JOB_SECRET_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Importante:** Usa la misma clave en el SQL de pg_cron.

### Paso 3: Ejecutar el SQL de pg_cron

1. Ve a Supabase Dashboard → SQL Editor
2. Crea una nueva query
3. Copia el contenido de `setup-cron.sql`
4. **Reemplaza:**
   - `YOUR_RAYMA_PROJECT` → Tu proyecto Supabase real
   - `YOUR_SECRET_KEY` → El valor que configuraste en Paso 2
5. Ejecuta el SQL

Ejemplo completo:
```sql
SELECT cron.schedule(
  'reset-daily-energy-bars',
  '0 0 * * *',
  'SELECT http_post(
    ''https://raymaapp.supabase.co/functions/v1/resetDailyEnergyBars'',
    to_jsonb(''{}''::jsonb),
    ''{}''::jsonb || jsonb_build_object(
      ''Authorization'', ''Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...''
    )
  );'
);
```

### Paso 4: Verificar Configuración

En Supabase → SQL Editor, ejecuta:
```sql
SELECT * FROM cron.job WHERE jobname = 'reset-daily-energy-bars';
```

Deberías ver un registro con:
- `jobid`: número
- `schedule`: `0 0 * * *`
- `command`: la llamada HTTP
- `active`: `true`

---

## 🧪 Pruebas Locales / Manuales

### Opción A: Llamada HTTP directa (curl)

```bash
curl -X POST \
  https://YOUR_RAYMA_PROJECT.supabase.co/functions/v1/resetDailyEnergyBars \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "usersResetCount": 42,
  "timestamp": "2026-06-22T00:00:00.000Z",
  "summary": [
    {
      "userId": "user-123",
      "email": "john@example.com",
      "newEnergyBars": 15,
      "purchasedEnergy": 5
    }
  ],
  "message": "Successfully reset daily energy for 42 free users"
}
```

### Opción B: Desde Node.js

```javascript
import fetch from 'node-fetch';

async function testEnergyReset() {
  const response = await fetch(
    'https://YOUR_RAYMA_PROJECT.supabase.co/functions/v1/resetDailyEnergyBars',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_SECRET_KEY',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );

  const data = await response.json();
  console.log('Reset result:', data);
}

testEnergyReset();
```

### Opción C: Ver logs en Supabase

1. Supabase Dashboard → Logs
2. Filtra por función: `resetDailyEnergyBars`
3. Verifica timestamps y mensajes de éxito/error

---

## 📊 Monitoreo y Logs

### Ver ejecuciones del cron job

```sql
SELECT 
  jobname,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobname = 'reset-daily-energy-bars'
ORDER BY start_time DESC
LIMIT 20;
```

### Ver últimos resets por usuario

```sql
SELECT 
  id,
  email,
  energy_bars,
  purchased_energy,
  last_energy_reset,
  annual_pass_expires_at
FROM auth.users
WHERE last_energy_reset = TODAY()
ORDER BY last_energy_reset DESC;
```

---

## ⚠️ Casos Especiales

### ¿Qué pasa si un usuario compra energía?

1. Actualiza `purchased_energy` en su perfil
2. Ejemplo: Si compra 50 barras: `purchased_energy = 50`
3. En el siguiente reset diario: `energy_bars = 10 + 50 = 60`

### ¿Qué pasa si se activa el annual_pass?

1. Supabase actualiza `annual_pass_expires_at` con fecha futura
2. La función ignora este usuario en futuros resets
3. Su `energy_bars` se congela y acumula

### ¿Qué pasa si vence el annual_pass?

1. `annual_pass_expires_at` queda en el pasado
2. En el siguiente reset diario: se aplica el reset a 10
3. Vuelve a ser un "usuario libre"

---

## 🔐 Seguridad

### Authorization
- Se requiere un bearer token (`SCHEDULED_JOB_SECRET_KEY`)
- Solo pg_cron o endpoints autorizados pueden llamar la función
- No expongas este token publicamente

### Rate Limiting
- pg_cron ejecuta UNA SOLA VEZ por día
- No hay riesgo de doble reset (protegido por `last_energy_reset`)

### Auditoría
- Todos los resets quedan registrados en `cron.job_run_details`
- Los cambios de `energy_bars` pueden auditarse via Supabase RLS o triggers

---

## 🐛 Troubleshooting

### Error: "pg_cron extension not enabled"
→ Contacta a soporte Supabase o usa dashboard para habilitarlo

### Error: "Unauthorized"
→ Verifica que `SCHEDULED_JOB_SECRET_KEY` sea igual en:
  - `setup-cron.sql` (Bearer token)
  - Supabase Environment Variables

### No se resetean usuarios
→ Verifica:
  1. El job existe: `SELECT * FROM cron.job;`
  2. `annual_pass_expires_at` está en el pasado (usuarios free)
  3. `last_energy_reset` NO es hoy

### Logs muestran errores
→ Revisa Supabase → Logs → función `resetDailyEnergyBars`

---

## 📝 Próximos Pasos

- [ ] Desplegar la Edge Function
- [ ] Crear `SCHEDULED_JOB_SECRET_KEY`
- [ ] Ejecutar `setup-cron.sql` en Supabase
- [ ] Probar con curl o Node
- [ ] Monitorear logs por 24 horas
- [ ] Actualizar documentación interna

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Supabase
2. Verifica que `energy_bars` fue agregado a User entity
3. Confirma que pg_cron está habilitado
4. Valida el formato del bearer token
