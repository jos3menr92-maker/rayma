# 🎯 Explicación de Cambios - Sistema de Códigos de Promoción

## Resumen
He construido el backend completo para canjear códigos de promoción. El sistema verifica la validez del código y suma las recompensas (barras de energía, tokens, o pases anuales) al usuario.

---

## 📁 Archivos Creados/Modificados

### 1. **base44/functions/redeemPromoCode/entry.ts** ✏️ (Modificado)

#### Cambios principales:

**A) Agregué soporte para recompensas de energía (línea 47-51):**
```typescript
if (promoCode.reward_type === 'energy_bars') {
  const currentEnergyBars = userData.energy_bars || 10;
  updateData.energy_bars = currentEnergyBars + promoCode.reward_value;
}
```
- **¿Qué hace?** Lee el saldo actual de energy_bars del usuario (por defecto 10)
- **¿Por qué?** Necesitamos sumar la recompensa al saldo existente, no reemplazarlo
- **Ejemplo:** Si tienes 5 barras y canjeas WELCOME50, quedarás con 55 barras

**B) Comenté la línea que marca al usuario como "sponsor" (línea 67):**
```typescript
// updateData.is_sponsor = true;  // ← Comentada
```
- **¿Por qué?** Para códigos de energía no queremos marcar como sponsor
- **Alternativa:** Si usas reward_type 'annual_pass', sí marcaría como sponsor

**C) Mejoré los mensajes de éxito (línea 80-91):**
```typescript
if (promoCode.reward_type === 'energy_bars') {
  rewardMessage = `You've unlocked ${promoCode.reward_value} Energy Bars! ⚡`;
}
```
- **¿Qué hace?** Personaliza el mensaje según el tipo de recompensa
- **Resultado:** El usuario ve "You've unlocked 50 Energy Bars! ⚡" en lugar de algo genérico

**D) Agregué logging de redemptions (línea 103-111):**
```typescript
const redemptionData = {
  promo_code_id: promoCode.id,
  user_id: user.id,
  reward_type: promoCode.reward_type,
  reward_value: promoCode.reward_value,
};
await base44.asServiceRole.entities.PromoRedemption.create(redemptionData);
```
- **¿Qué hace?** Registra cada canje en una tabla de auditoría
- **¿Por qué?** Para rastrear fraude, patrones de uso, y analítica
- **Nota:** Si la tabla no existe, el error se ignora silenciosamente (no rompe el flujo)

---

### 2. **base44/functions/redeemPromoCode/setup-promo-table.sql** 📝 (Nuevo)

Este archivo SQL configura todo en Supabase:

**Tabla promo_codes:**
```sql
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE,        -- "WELCOME50", "SUMMER2024", etc.
  reward_type VARCHAR(50),        -- "energy_bars", "tokens", "annual_pass"
  reward_value INTEGER,           -- 50, 100, 500, etc.
  is_active BOOLEAN,              -- true/false para activar/desactivar
  max_uses INTEGER,               -- Máximo de usos totales (NULL = ilimitado)
  times_used INTEGER,             -- Contador (aumenta cada canje)
  expires_at TIMESTAMP,           -- Fecha de expiración (NULL = nunca expira)
  redeemed_by UUID[],             -- Array de user_ids que lo canjearon (evita duplicados)
  description TEXT,               -- Notas internas ("Early backer", "Twitch giveaway", etc.)
  created_at TIMESTAMP
);
```

**Tabla promo_redemptions (auditoría):**
```sql
CREATE TABLE promo_redemptions (
  id UUID PRIMARY KEY,
  promo_code_id UUID,             -- ID del código
  user_id UUID,                   -- ID del usuario
  redeemed_at TIMESTAMP,          -- Cuándo se canjeó
  reward_type VARCHAR(50),        -- Tipo de recompensa
  reward_value INTEGER,           -- Valor de la recompensa
  user_agent TEXT                 -- Navegador/app del usuario (para detectar fraude)
);
```

**Seguridad (RLS):**
- Los usuarios pueden ver solo códigos activos
- Los admins pueden gestionar todos
- Esto evita que descubran códigos inactivos

---

### 3. **base44/functions/redeemPromoCode/README_PROMO_IMPLEMENTATION.md** 📖 (Nuevo)

Guía completa en inglés con:
- Explicación de cada tabla
- Instrucciones paso a paso
- Casos de prueba
- Solución de problemas

---

## 🔄 Cómo Funciona el Flujo Completo

```
┌─────────────────────────────────────────────────────────┐
│ 1. Usuario entra código en Support.jsx                   │
│    (p.ej., "WELCOME50")                                  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Frontend llama a Edge Function                        │
│    redeemPromoCode({ code: "WELCOME50" })               │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Backend valida:                                       │
│    ✓ ¿Código existe?                                     │
│    ✓ ¿Está activo? (is_active = true)                   │
│    ✓ ¿No expiró? (expires_at > ahora)                   │
│    ✓ ¿User no lo canjeó ya? (redeemed_by check)        │
│    ✓ ¿No alcanzó max_uses? (times_used < max_uses)    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼ (Si todo OK)
┌─────────────────────────────────────────────────────────┐
│ 4. Backend aplica recompensa:                            │
│    Si reward_type = "energy_bars":                       │
│      energy_bars = 5 + 50 = 55 ✅                       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Backend actualiza estado:                             │
│    - times_used: 1 → 2                                   │
│    - redeemed_by: agrega user_id                         │
│    - Registra en promo_redemptions                       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Frontend muestra mensaje de éxito                     │
│    "You've unlocked 50 Energy Bars! ⚡"                 │
│    (Barra de energía actualizada)                        │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ Pasos de Implementación

### Paso 1️⃣: Crear Entidad en Base44
1. Ve al dashboard de Base44
2. Crea entidad **PromoCode** con estos campos:
   - `code` (String, Unique)
   - `reward_type` (Enum: energy_bars | tokens | annual_pass)
   - `reward_value` (Integer)
   - `is_active` (Boolean)
   - `max_uses` (Integer, optional)
   - `times_used` (Integer)
   - `expires_at` (DateTime, optional)
   - `redeemed_by` (Array<UUID>)

### Paso 2️⃣: Ejecutar SQL en Supabase
1. Ve a Supabase > SQL Editor
2. Copia el contenido de `setup-promo-table.sql`
3. Ejecuta (esto crea las tablas promo_codes y promo_redemptions)
4. Verifica: `SELECT * FROM promo_codes;`

### Paso 3️⃣: Crear Códigos de Prueba
```sql
INSERT INTO promo_codes (code, reward_type, reward_value, is_active, expires_at)
VALUES ('WELCOME50', 'energy_bars', 50, true, '2025-12-31');
```

### Paso 4️⃣: Probar en Support.jsx
1. Ve a `/support`
2. Ingresa "WELCOME50"
3. Haz clic en "Unlock"
4. Deberías ver: "You've unlocked 50 Energy Bars! ⚡"
5. Tu saldo de energía debe aumentar

---

## 🧪 Validaciones Implementadas (línea por línea)

| Validación | Línea | Mensaje de Error | Qué Verifica |
|---|---|---|---|
| Código existe | 19-24 | "Promo code not found" | Si el código está en BD |
| Código activo | 27-29 | "no longer active" | Si is_active = true |
| No expirado | 32-35 | "has expired" | Si expires_at > ahora |
| Usuario no lo canjeó | 38-40 | "already redeemed" | Si user_id NO está en redeemed_by |
| Límite de usos | 43-45 | "reached its usage limit" | Si times_used < max_uses |

---

## 💡 Ejemplos de Códigos

```sql
-- Bienvenida: 50 barras
('WELCOME50', 'energy_bars', 50, true, NULL, '2025-12-31', 'Welcome bonus')

-- Campaña limitada: 100 barras, máx 50 usuarios, expira agosto
('SUMMER2024', 'energy_bars', 100, true, 50, '2024-08-31', 'Summer campaign')

-- Sponsor: Pase anual (1 solo)
('SPONSOR001', 'annual_pass', 1, true, 1, NULL, 'Sponsor reward')

-- Tokens de IA: 500 tokens ilimitados
('AIBONUS', 'tokens', 500, true, NULL, NULL, 'AI token bonus')

-- Inactivo (no aparece en búsquedas de usuarios)
('OLDCODE', 'energy_bars', 25, false, NULL, NULL, 'Deprecated')
```

---

## 🔍 Cómo Verificar que Funciona

### En la BD (Supabase):
```sql
-- Ver el código creado
SELECT * FROM promo_codes WHERE code = 'WELCOME50';

-- Verificar que se incrementó times_used después de un canje
SELECT code, times_used, redeemed_by FROM promo_codes WHERE code = 'WELCOME50';

-- Ver si la energía del usuario aumentó
SELECT id, email, energy_bars FROM auth.users WHERE email = 'tu@email.com';

-- Ver log de canjes (auditoría)
SELECT * FROM promo_redemptions ORDER BY redeemed_at DESC LIMIT 5;
```

### En el Frontend:
1. Abre DevTools (F12)
2. Consola: Deberías ver el log ✓ Promo code redeemed
3. La barra de energía en Dashboard debe actualizar automáticamente

---

## 🐛 Solución de Problemas

**Problema:** "Promo code not found"
- ✅ Verifica que exista en BD: `SELECT * FROM promo_codes WHERE code = 'WELCOME50';`
- ✅ Verifica que PromoCode entity existe en Base44

**Problema:** "already redeemed"
- ✅ Es correcto (protección contra duplicados)
- ✅ Crea otro código para probar

**Problema:** Energy no sube
- ✅ Verifica `energy_bars` existe en tabla User
- ✅ Verifica que `reward_type = 'energy_bars'`
- ✅ Verifica que `reward_value` es número positivo

**Problema:** Error 500 en Edge Function
- ✅ Ve a Supabase > Functions > redeemPromoCode > Logs
- ✅ Busca error exacto

---

## 🎯 Criterios de Aceptación ✅

- [ ] **Validación:** Código inválido → Error "Promo code not found"
- [ ] **Expiración:** Código expirado → Error "has expired"
- [ ] **Límite:** Máximo de usos alcanzado → Error "usage limit"
- [ ] **Duplicado:** Usuario intenta canjear 2 veces → Error "already redeemed"
- [ ] **Éxito:** Código válido → Energy aumenta en BD
- [ ] **UI:** Mensaje de éxito se muestra en Support.jsx
- [ ] **Auditoría:** Canje aparece en promo_redemptions

---

## 📞 Next Steps

1. **Crear entidad PromoCode en Base44** ← TU PARTE
2. Ejecutar setup-promo-table.sql en Supabase ← TU PARTE
3. Crear códigos de prueba
4. Probar en /support
5. Crear códigos para usuarios reales

¿Necesitas que cree una guía de cómo hacer esto en Base44 dashboard?
