# Assignment — SMB Invoice Generator
**Assigned to:** Rehmat  
**Priority:** 🟡 Normal  
**Status:** 🟢 Active  
**Total Sub-tasks:** 11  

---

## Objective

Build a fully automated invoice generator for Innoventix Hub. Client info + payment schedule add karo — system automatically invoice generate karega, PDF banayega, client ko email karega, aur payment follow-up bhi automatically handle karega. Future mein Maaz ke Finance Tracker se connect hoga.

---

## Sub-task 1 — Requirements Gathering

- Discuss with Ubaid: konse clients hain?
- Payment schedules confirm karo (Monthly / Weekly / Per Project)
- Email system confirm karo (Gmail via N8N)
- Finance Tracker integration plan discuss karo Maaz se
- Due date policy confirm karo (kitne din baad due?)

---

## Sub-task 2 — Invoice Template Design

- Professional HTML/CSS invoice template
- Innoventix Hub logo + company info
- Client info section
- Invoice number (auto: INV-001, INV-002...)
- Date, due date (optional), payment terms
- Line items table (service, qty, rate, amount)
- Subtotal, tax, total
- Payment method + bank details
- Notes/terms section

---

## Sub-task 3 — Invoice Fields & Calculations

- Auto-calculate: subtotal, tax, total
- Multiple line items support
- Currency: USD / PKR
- Due date — optional (can be left empty)
- Due date auto-calculate if set (Net 15 / 30 / 60)
- Unique invoice number auto-generate (INV-001, INV-002...)

---

## Sub-task 4 — Client Profile & Payment Schedule

**Supabase client table:**

| Field | Type |
|---|---|
| client_id | UUID |
| name | Text |
| company | Text |
| email | Text |
| address | Text |
| payment_schedule | Monthly / Weekly / Per Project |
| invoice_due_day | Integer (e.g. 1 = 1st of month) |
| tax_rate | Decimal (optional) |

**Frontend features:**
- Add / edit / delete clients
- View client invoice history
- Payment schedule settings per client

---

## Sub-task 5 — Supabase Invoice Table

| Field | Type | Description |
|---|---|---|
| invoice_id | UUID | Auto-generated |
| client_id | UUID | Linked to client |
| amount | Decimal | Total amount |
| status | Enum | Draft/Sent/Due Soon/Overdue/Pending Review/Paid |
| due_date | Timestamp | Optional — nullable |
| sent_at | Timestamp | When invoice was sent |
| reminder_1_sent | Boolean | First reminder sent? |
| reminder_2_sent | Boolean | Second reminder sent? |
| reminder_3_sent | Boolean | Third reminder sent? |
| final_reminder_sent | Boolean | Final reminder sent? |
| paid_at | Timestamp | When payment received |
| notes | Text | Optional notes |

---

## Sub-task 6 — Automation Flows (N8N on Contabo VPS)

### Flow 1 — Scheduled Auto Invoice
```
N8N Schedule node (daily check)
      ↓
Which clients are due today?
      ↓
Generate invoice → PDF → Email send
      ↓
Save to Supabase (status: Sent)
```

### Flow 2 — Manual Invoice Trigger
```
Ubaid clicks "Generate Invoice"
      ↓
Invoice generates → PDF → Email sent
      ↓
Saved to Supabase (status: Sent)
```

### Flow 3 — Follow-up (Due Date SET)
```
Invoice sent
      ↓
N8N checks every hour: due_date set? YES
      ↓
Due date - 8 hours → still unpaid:
📧 "Your invoice INV-XXX is due in 8 hours"
      ↓
Due date passed → still unpaid:
📧 "Your invoice INV-XXX is now overdue"
      ↓
+ 8 hours → still unpaid:
📧 "Second reminder: Invoice INV-XXX overdue"
      ↓
+ 24 hours → still unpaid:
📧 "Final reminder: Invoice INV-XXX overdue"
🔴 Frontend: OVERDUE tag
🔔 Slack notification → Ubaid
```

### Flow 4 — Follow-up (Due Date NOT SET)
```
Invoice sent
      ↓
N8N checks: due_date = NULL? YES
      ↓
+ 24 hours → still unpaid:
📧 "Friendly reminder about Invoice INV-XXX"
      ↓
+ 24 hours → still unpaid:
🟡 Frontend: PENDING REVIEW tag
🔔 Slack notification → Ubaid
```

### Flow 5 — Payment Received
```
Ubaid marks invoice as PAID
      ↓
All follow-up reminders STOP immediately
      ↓
Status → ✅ PAID
      ↓
paid_at = timestamp saved
      ↓
Phase 2: Finance Tracker mein auto entry
```

---

## Sub-task 7 — Frontend (Next.js + Tailwind)

### Pages
- `/invoices` — All invoices dashboard
- `/invoices/new` — Create new invoice
- `/invoices/[id]` — Invoice detail + preview
- `/clients` — Client management
- `/clients/new` — Add new client

### Invoice Status Tags

| Tag | Color | Condition |
|---|---|---|
| 📝 Draft | Gray | Not sent yet |
| 📤 Sent | Blue | Sent, awaiting payment |
| ⏰ Due Soon | Yellow | Due in less than 8 hours |
| 🔴 Overdue | Red | Due date passed, unpaid |
| 🟡 Pending Review | Orange | No due date, 48hrs passed |
| ✅ Paid | Green | Payment received |

### Features
- Invoice list with status filters
- Search by client name or invoice number
- Generate invoice manually button
- Invoice preview before sending
- Mark as Paid button
- Download PDF button
- Client management (add / edit / delete)
- Payment schedule settings per client

---

## Sub-task 8 — PDF Generation

- Library: Puppeteer or jsPDF
- Professional formatting matching HTML template
- Auto-attach PDF in all reminder emails
- Download button on frontend

---

## Sub-task 9 — Testing

- Generate 10 test invoices
- Test with due date SET — verify all 4 reminders fire correctly
- Test with due date NOT SET — verify 24hr reminders
- Test scheduled auto-send
- Test manual trigger
- Test email delivery + PDF attachment quality
- Test Mark as Paid — verify all reminders stop
- Test all status tags display correctly on frontend
- Mobile responsive check

---

## Sub-task 10 — Deployment

- Deploy frontend on Netlify
- Connect Supabase production database
- Activate all N8N workflows on Contabo VPS
- Test full flow on production environment
- Share live link with Ubaid for review

---

## Sub-task 11 — Demo

- Present full automated flow to Ubaid
- Live demo walkthrough:
  - Auto scheduled invoice → email
  - Manual invoice → email
  - Follow-up reminder flow (due date set)
  - Follow-up flow (no due date)
  - Mark as Paid → reminders stop
- Collect feedback + implement improvements

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Automation | N8N (Contabo VPS) |
| Email | Gmail via N8N |
| PDF | Puppeteer or jsPDF |
| Hosting | Netlify |
| Notifications | Slack |

---

## Phase 2 — Integration with Finance Tracker (Maaz)

```
Invoice marked PAID (Rehmat system)
            ↓
Auto trigger → Finance Tracker (Maaz system)
            ↓
Income entry automatically created
Category: Client Payment
Amount: Invoice amount
Client: Auto-linked
            ↓
Monthly report automatically updated
            ↓
Complete SMB Financial Management System ✅
```

---

*Assignment created: September 2026 | Innoventix Hub*
