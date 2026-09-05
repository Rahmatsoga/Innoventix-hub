# 📌 QUICK REFERENCE CARD
*Print this and keep it next to your desk*

---

## 🎯 TODAY'S TASK

Day ____ / 11

- [ ] Task completed
- [ ] Tests passed
- [ ] Next: ___________

---

## 📱 KEY FILES & LOCATIONS

**Database Setup**
```
Supabase SQL Editor → Copy from Section 1
complete-code-templates.md
```

**Frontend Pages**
```
pages/invoices.tsx
pages/invoices/new.tsx
pages/invoices/[id].tsx
pages/clients.tsx
```

**Services**
```
services/clientService.ts
services/invoiceService.ts
services/emailService.ts
```

**APIs**
```
pages/api/generate-pdf.ts
pages/api/email/send-reminder.ts
```

---

## 🔑 ENVIRONMENT VARIABLES

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GMAIL_USER=
GMAIL_APP_PASSWORD=
N8N_WEBHOOK_URL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 💾 DATABASE QUICK COMMANDS

**Test connection:**
```sql
SELECT * FROM clients LIMIT 1;
```

**Count invoices:**
```sql
SELECT COUNT(*) FROM invoices;
```

**Get all unpaid:**
```sql
SELECT * FROM invoices WHERE status != 'Paid';
```

**View table structure:**
```sql
\d invoices;
```

---

## 🎨 INVOICE STATUS COLORS

| Status | Color | Hex |
|--------|-------|-----|
| Draft | Gray | #6B7280 |
| Sent | Blue | #0066CC |
| Due Soon | Yellow | #FF9900 |
| Overdue | Red | #CC0000 |
| Pending Review | Orange | #FF6600 |
| Paid | Green | #00CC00 |

---

## 📊 CALCULATION FORMULA

```
Subtotal = SUM(quantity × rate for all items)
Tax = Subtotal × (tax_rate / 100)
Total = Subtotal + Tax

Due Date = Created Date + (invoice_due_day) days
```

---

## ✉️ EMAIL TIMING

**Initial Sending:**
- Immediately after invoice created

**Reminder 1:**
- 8 hours before due date

**Reminder 2 (Overdue):**
- When due date passed

**Reminder 3:**
- 8 hours after overdue

**Reminder 4 (Final):**
- 24 hours after overdue

---

## 🔗 WEBHOOK URLs (N8N)

**Payment Webhook:**
```
POST /api/webhooks/payment-received
Body: { invoiceId, status: "Paid" }
```

**Email Status Webhook:**
```
POST /api/webhooks/email-sent
Body: { invoiceId, reminderType }
```

---

## 🧪 TEST COMMANDS

**Create test client:**
```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com"}'
```

**Generate PDF:**
```bash
curl -X POST http://localhost:3000/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d @payload.json > test.pdf
```

**Send test email:**
```bash
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to":"your@email.com"}'
```

---

## 🐛 COMMON ERRORS

| Error | Cause | Fix |
|-------|-------|-----|
| Supabase connection refused | Wrong URL/key | Check .env.local |
| PDF not found | Puppeteer not installed | `npm install puppeteer` |
| Email not sending | Wrong Gmail password | Use app password, not account password |
| N8N webhook timeout | VPS down | SSH to Contabo, check Docker |
| Status not updating | RLS policy blocked | Check Supabase RLS settings |

---

## 📞 WHO TO CONTACT

- **Product Issues:** Ubaid
- **Finance Integration:** Maaz
- **N8N Problems:** Check N8N logs first
- **Database Issues:** Supabase documentation
- **Deployment Issues:** Netlify support

---

## 🚀 DEPLOYMENT CHECKLIST

Before going live:
- [ ] npm run build completes
- [ ] No console warnings
- [ ] .env.local not in git
- [ ] All tests passing
- [ ] N8N workflows active
- [ ] Database backups enabled
- [ ] Monitoring configured
- [ ] Error logging active

---

## 📈 PERFORMANCE TARGETS

| Metric | Target | Actual |
|--------|--------|--------|
| Page load | < 2s | ___ |
| Invoice list | < 3s | ___ |
| PDF gen | < 5s | ___ |
| Email send | < 2s | ___ |
| DB query | < 100ms | ___ |

---

## 💡 QUICK TIPS

1. **Test locally first** - Don't deploy broken code
2. **Check the logs** - 80% of bugs show up there
3. **Read error messages** - They tell you exactly what's wrong
4. **Keep .env.local safe** - It has all your secrets
5. **Backup before changes** - Supabase → Backups tab
6. **Document what you learn** - Future you will thank you
7. **Ask questions early** - Don't get stuck for hours
8. **Celebrate small wins** - Each phase is progress

---

## 📚 REFERENCE GUIDE HIERARCHY

```
QUICK-START.md (read first)
    ↓
QUICK-REFERENCE-CARD.md (this file)
    ↓
invoice-generator-guide.md (detailed explanation)
    ↓
complete-code-templates.md (copy-paste code)
    ↓
n8n-workflows-and-checklist.md (automation & testing)
```

---

## ⏱️ TIME ESTIMATE PER PHASE

| Phase | Days | Time |
|-------|------|------|
| Setup | 2 | ~6 hrs |
| Database | 2 | ~4 hrs |
| Services | 2 | ~8 hrs |
| Frontend | 3 | ~12 hrs |
| Automation | 2 | ~6 hrs |
| Testing | 1 | ~4 hrs |
| Deploy | 1 | ~2 hrs |

**Total:** ~11 days / ~40 hours

---

## 🎯 SUCCESS INDICATORS

✅ Day 3: Database fully set up and tested  
✅ Day 5: Can create clients and invoices via API  
✅ Day 7: Invoices generate and email sends  
✅ Day 9: N8N workflows actively sending reminders  
✅ Day 10: All tests passing, zero errors  
✅ Day 11: Live on Netlify, demo to Ubaid  

---

## 🔐 SECURITY CHECKLIST

- [ ] No API keys in code
- [ ] .env.local in .gitignore
- [ ] HTTPS enabled
- [ ] Input validation on forms
- [ ] SQL injection prevented
- [ ] Rate limiting active
- [ ] RLS policies configured
- [ ] Sensitive data not logged

---

## 📊 INVOICE LIFECYCLE

```
Draft → Sent → [Due Soon] → Paid
              → Overdue → Paid
              → Pending Review → Paid
```

---

## 🎬 DEMO FLOW (Day 11)

Show Ubaid:
1. Dashboard with 10 invoices
2. Create new invoice → Email received
3. PDF download works
4. Status filters work
5. Search works
6. Mark as paid → Reminders stop
7. View payment history

**Time:** 10 minutes

---

## 📞 EMERGENCY CONTACTS

| Issue | Contact | Time |
|-------|---------|------|
| Supabase down | status.supabase.com | 24/7 |
| Netlify down | status.netlify.com | 24/7 |
| N8N issues | SSH to Contabo | Business hrs |
| Gmail blocked | myaccount.google.com | 24/7 |

---

## ✨ FINAL NOTES

✅ You have everything you need  
✅ The code is production-ready  
✅ The timeline is realistic  
✅ The support is complete  

**Now it's just about following the plan, one day at a time.**

Each day brings you closer to a fully automated system.

**You've got this! 💪**

---

*Print this. Laminate it. Keep it by your computer.*

**Date Started:** __________  
**Target Completion:** __________  
**Status:** ✅ Ready to Build
