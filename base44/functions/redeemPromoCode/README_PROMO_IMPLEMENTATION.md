## 🎁 Promo Code System Implementation Guide

### Overview
This system allows users to redeem promotional codes for rewards (Energy Bars, AI Tokens, or Annual Pass).

### Files Created/Modified

#### 1. **redeemPromoCode/entry.ts** (Modified)
The Edge Function that processes promo code redemptions. 

**Key Changes:**
- ✅ Added support for `reward_type: 'energy_bars'` 
- ✅ Updates `user.energy_bars` correctly by reading current balance
- ✅ Improved success messages for different reward types
- ✅ Maintains existing functionality for tokens and annual_pass

**How it works:**
1. User submits code from Support.jsx
2. Function validates: active status, expiration, max uses, one-per-user rule
3. Fetches PromoCode entity from Base44
4. Based on `reward_type`:
   - `energy_bars`: `energy_bars = current + reward_value`
   - `tokens`: `ai_tokens = current + reward_value`
   - `annual_pass`: Sets expiration date
5. Logs redemption (optional tracking table)
6. Returns success with user-friendly message

#### 2. **redeemPromoCode/setup-promo-table.sql** (New)
SQL script to create the Supabase tables and configure security.

**Tables Created:**
- `promo_codes` - Main table with code details
- `promo_redemptions` - Audit log of all redemptions (optional, for fraud detection)

**Columns in promo_codes:**
| Column | Type | Purpose |
|--------|------|---------|
| code | VARCHAR(50) | Unique promo code (e.g., "SUMMER2024") |
| reward_type | VARCHAR(50) | 'energy_bars', 'tokens', or 'annual_pass' |
| reward_value | INTEGER | Number to grant (50, 100, etc.) |
| is_active | BOOLEAN | Enable/disable without deleting |
| max_uses | INTEGER | Limit total uses (NULL = unlimited) |
| times_used | INTEGER | Counter (auto-incremented) |
| expires_at | TIMESTAMP | Code expiration (NULL = never) |
| redeemed_by | UUID[] | Array of user IDs (one-per-user enforcement) |
| description | TEXT | Admin notes (internal use) |

---

### 📋 Implementation Steps

#### Step 1: Create Base44 Entity
You must create a `PromoCode` entity in your Base44 dashboard:
1. Go to [Base44 Dashboard](https://base44.com)
2. Create new entity: `PromoCode`
3. Map these fields:
   - `code` → String (Unique)
   - `reward_type` → Enum: ['energy_bars', 'tokens', 'annual_pass']
   - `reward_value` → Integer
   - `is_active` → Boolean
   - `max_uses` → Integer (optional)
   - `times_used` → Integer
   - `expires_at` → DateTime (optional)
   - `redeemed_by` → Array<UUID>
   - `description` → Text

#### Step 2: Run SQL Setup in Supabase
1. Go to Supabase Dashboard > SQL Editor
2. Copy & paste the SQL from `setup-promo-table.sql`
3. Run the script
4. Verify with: `SELECT * FROM promo_codes LIMIT 5;`

#### Step 3: Test the Flow
```bash
# Option A: Use the UI (recommended)
# 1. Go to /support page
# 2. Enter a test code (e.g., "WELCOME50")
# 3. Click "Unlock"

# Option B: Test via API (curl)
curl -X POST \
  https://your-rayma-project.supabase.co/functions/v1/redeemPromoCode \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"WELCOME50"}'
```

#### Step 4: Verify in Database
After redeeming a code, check:
```sql
-- Check if times_used increased
SELECT code, times_used, redeemed_by FROM promo_codes WHERE code = 'WELCOME50';

-- Check user's energy_bars
SELECT id, energy_bars FROM auth.users WHERE email = 'your-email@example.com';

-- View redemption log (optional)
SELECT * FROM promo_redemptions ORDER BY redeemed_at DESC LIMIT 10;
```

---

### 🔐 Security Features

✅ **RLS Policies:**
- Users can only view active promo codes
- Admins can manage all codes

✅ **Fraud Prevention:**
- One code per user (tracked via `redeemed_by` array)
- Max uses limit
- Expiration dates
- Audit logging via `promo_redemptions` table

✅ **Backend Validation:**
- Service role used (bypasses RLS for data modifications)
- All checks before applying rewards

---

### 📝 Creating Promo Codes

**Via SQL (Direct):**
```sql
INSERT INTO promo_codes (code, reward_type, reward_value, is_active, max_uses, expires_at, description)
VALUES 
  ('SUMMER2024', 'energy_bars', 100, true, 50, '2024-08-31'::date, 'Summer campaign'),
  ('SPONSOR001', 'annual_pass', 1, true, 1, NULL, 'Sponsor pass'),
  ('NEWUSER', 'tokens', 500, true, NULL, NULL, 'New user welcome bonus');
```

**Via Base44 Dashboard (Recommended):**
1. Go to PromoCode entity
2. Create new record with values
3. Code becomes available immediately (if `is_active = true`)

---

### 🚀 Frontend Integration

The Support.jsx page already has the UI:
- ✅ Input field for promo code
- ✅ Submit button ("Unlock")
- ✅ Success/error messages
- ✅ Real-time energy update

```tsx
// Support.jsx (already implemented)
async function handlePromoCode(e) {
  const res = await base44.functions.invoke("redeemPromoCode", {
    code: promoCode.trim(),
  });
  // Messages display automatically
}
```

---

### 🧪 Test Cases

| Code | Expected Result | Notes |
|------|-----------------|-------|
| WELCOME50 | +50 energy bars | Valid, one-time |
| INVALID123 | Error: "Promo code not found" | Invalid code |
| EARLYACCESS | Error: "no longer active" | is_active = false |
| (expired code) | Error: "has expired" | expires_at < now |
| (redeemed twice) | Error: "already redeemed" | One per user |

---

### 🐛 Troubleshooting

**"Unauthorized" error:**
- Ensure user is authenticated
- Check auth token is valid

**"Promo code not found":**
- Verify code exists in promo_codes table
- Check if code is uppercase (codes are normalized to uppercase)
- Verify PromoCode entity exists in Base44

**Times used not incrementing:**
- Check service_role permissions
- Verify redeemed_by array is being updated

**Energy not being added:**
- Verify energy_bars column exists on User entity
- Check reward_type is 'energy_bars'
- Check reward_value is positive integer

---

### 📞 Support

For questions:
1. Check Edge Function logs: Supabase > Functions > redeemPromoCode
2. Check RLS policies: Supabase > Auth > Policies
3. Test with simpler codes first
4. Check browser console for API errors

---

### 🔄 Next Steps

- [ ] Set up admin dashboard to manage promo codes
- [ ] Add email notifications when code is redeemed
- [ ] Implement rate limiting to prevent abuse
- [ ] Add analytics to track redemption rates
- [ ] Create seasonal campaigns
