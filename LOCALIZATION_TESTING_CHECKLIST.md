# Phase 5: Localization Testing Checklist

## Guía de Testing para Verificar Localización de Fechas y Monedas

### Próximamente:
El usuario debe seguir estos pasos en el navegador para validar que la localización funciona correctamente.

---

## 🌍 Configuración Regional (Regional Setup)

### Acceso a la región selector:
1. Login a la app
2. Navigate a **Profile** (esquina superior derecha o menú)
3. Scroll down a **Localization & Region** section
4. Verás dos selectores:
   - **Language**: Cambia el idioma
   - **Region**: Cambia la región (NEW - FEATURE ADDED)

---

## ✅ Testing Matrix - South American Regions

### 1️⃣ Colombia (es-CO)
**Expected Output:**
- **Date Format**: `DD/MM/YYYY` (ej: 15/01/2026)
- **Currency**: COP con símbolo `$` y separadores `1.234,56`
- **Language**: Spanish

**Steps to Test:**
1. Profile → Region: Select `🇨🇴 Colombia (COP)`
2. Click "Save" button
3. Verify redirect/reload
4. Check these pages for correct formatting:
   - Dashboard: Bills amounts should show as `$1.234,56`
   - Finance: Income logs should show dates as `15/01/2026`
   - BillCalendar: Month name in Spanish, dates DD/MM
   - Bills page: All amounts in COP format
   - MonthlyRecap: Chart data with Colombian formatting

**Verification Checklist:**
- [ ] Dates show as DD/MM/YYYY
- [ ] Currency symbol is `$`
- [ ] Number separators are `.` for thousands, `,` for decimals
- [ ] Language updates to Spanish
- [ ] Region selector shows Colombia selected

---

### 2️⃣ Argentina (es-AR)
**Expected Output:**
- **Date Format**: `DD/MM/YYYY` (ej: 15/01/2026)
- **Currency**: ARS con símbolo `$` y separadores `1.234,56`
- **Language**: Spanish

**Steps to Test:**
1. Profile → Region: Select `🇦🇷 Argentina (ARS)`
2. Click "Save"
3. Verify all pages show:
   - Dates as DD/MM/YYYY
   - Amounts as `$1.234,56 ARS`
   - Thousands separator: `.`
   - Decimal separator: `,`

**Verification Checklist:**
- [ ] Dates in DD/MM/YYYY format
- [ ] Currency symbol `$` (ARS)
- [ ] Correct separators applied everywhere
- [ ] Region selector shows Argentina selected

---

### 3️⃣ Brasil (pt-BR)
**Expected Output:**
- **Date Format**: `DD/MM/YYYY` (ej: 15/01/2026)
- **Currency**: BRL con símbolo `R$` y separadores `1.234,56`
- **Language**: Portuguese

**Steps to Test:**
1. Profile → Region: Select `🇧🇷 Brasil (BRL)`
2. Click "Save"
3. Verify these critical pages:
   - Dashboard: BRL amounts visible
   - Finance: Portuguese text & dates
   - BillCalendar: Portuguese month names
   - All financial views: `R$ 1.234,56` format

**Verification Checklist:**
- [ ] Dates show DD/MM/YYYY
- [ ] Currency symbol is `R$` (unique for Brazil)
- [ ] Separators: `.` thousands, `,` decimals
- [ ] Language is Portuguese
- [ ] Region selector shows Brasil selected

---

### 4️⃣ Peru (es-PE)
**Expected Output:**
- **Date Format**: `DD/MM/YYYY` (ej: 15/01/2026)
- **Currency**: PEN con símbolo `S/` y separadores `1,234.56` (NOTA: Perú usa `,` para miles)
- **Language**: Spanish

**Steps to Test:**
1. Profile → Region: Select `🇵🇪 Perú (PEN)`
2. Click "Save"
3. Note: Peru uses DIFFERENT separators than other South American countries!
   - Thousands: `,`
   - Decimals: `.`
4. Verify all pages reflect this unique format

**Verification Checklist:**
- [ ] Dates show DD/MM/YYYY
- [ ] Currency symbol is `S/`
- [ ] Separators: `,` thousands, `.` decimals (opposite of others!)
- [ ] Language is Spanish
- [ ] Region selector shows Peru selected

---

## 🔄 Cross-Locale Switching Tests

### Test Dynamic Switching:
1. **Colombia → Argentina:**
   - [ ] Region changes
   - [ ] Currency symbol stays `$` but label changes to ARS
   - [ ] Dates still DD/MM/YYYY
   - [ ] No page reload needed (should update live)

2. **Brasil → Peru:**
   - [ ] Language changes to Spanish
   - [ ] Currency changes from `R$` to `S/`
   - [ ] Separators swap from `.` for thousands → `,` for thousands
   - [ ] All pages update automatically

3. **USA → Colombia:**
   - [ ] Date format changes from MM/DD/YYYY to DD/MM/YYYY
   - [ ] Currency changes from `$` USD to `$` COP
   - [ ] Number formatting updates
   - [ ] Language changes to Spanish

---

## 📋 Pages to Test on Each Region

**Critical Financial Pages** (Test these on EACH region):
- [ ] Dashboard (amounts, dates in BillCalendar)
- [ ] Finance / Income & Cash Flow (income logs dates)
- [ ] Bills page (all amounts)
- [ ] BankAccounts (transaction amounts)
- [ ] AssetDashboard (net worth amounts)
- [ ] Budget page (goal amounts)
- [ ] MonthlyRecap (chart data with dates)
- [ ] MonthlyTrend (chart labels with months)
- [ ] Profile (region selector itself)

**Secondary Pages** (Should also update):
- [ ] TaxSummary (income/expense amounts)
- [ ] DebtPayoffSimulator (loan amounts)
- [ ] Reminders (bill amounts, dates)
- [ ] Loans page (if exists - loan amounts)

---

## 🐛 Known Issues to Watch For

### Before reporting bugs, check:
1. **Did you click "Save" on Profile?**
   - New locale requires clicking Save to apply
   - Page reloads to apply changes globally

2. **Browser Cache:**
   - If dates/currency don't update, try F5 (hard refresh)
   - Or Ctrl+Shift+Delete (clear cache)

3. **Locale vs Language:**
   - Language = `es`, `pt`, `en` (what T() uses)
   - Locale = `es-CO`, `pt-BR` (what formatCurrency/Date uses)
   - Both should update together

---

## 📊 Expected Results Summary

| Region | Locale | Language | Date Format | Currency | Thousands | Decimal |
|--------|--------|----------|-------------|----------|-----------|---------|
| Colombia | es-CO | Spanish | DD/MM/YYYY | `$` COP | `.` | `,` |
| Argentina | es-AR | Spanish | DD/MM/YYYY | `$` ARS | `.` | `,` |
| Brasil | pt-BR | Portuguese | DD/MM/YYYY | `R$` BRL | `.` | `,` |
| Peru | es-PE | Spanish | DD/MM/YYYY | `S/` PEN | `,` | `.` |
| USA | en-US | English | MM/DD/YYYY | `$` USD | `,` | `.` |

---

## ✨ Success Criteria

**Phase 5 Complete when:**
1. ✅ All 4 South American regions tested and working
2. ✅ Dates display as DD/MM/YYYY in all regions
3. ✅ Currency symbols and separators are correct per region
4. ✅ Language changes when region changes
5. ✅ Dynamic switching works without full page reload
6. ✅ All financial pages update correctly
7. ✅ No console errors related to localization

---

## 📝 Testing Notes

**Use this section to document your findings:**

### Region: ___________
- Date Format: ___________
- Currency: ___________
- Separators: ___________
- Issues Found: ___________
- Status: ✅ PASS / ❌ FAIL

---

## 🎉 Final Checklist

- [ ] Phase 5 testing document created
- [ ] All 4 South American regions tested
- [ ] Dynamic switching verified
- [ ] All critical pages checked
- [ ] No blocking issues found
- [ ] Localization feature complete and working

**End of Phase 5 Testing Checklist**
