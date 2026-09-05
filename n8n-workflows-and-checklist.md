# N8N Automation Workflows & Deployment Checklist

---

## 🤖 N8N WORKFLOW 1: SCHEDULED AUTO INVOICE GENERATION

**Workflow Name:** `scheduled-auto-invoice-monthly`  
**Trigger:** Daily at 8:00 AM  
**Purpose:** Automatically generate invoices for monthly clients

### Nodes Setup:

```json
{
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.cron",
      "typeVersion": 1,
      "position": [250, 300],
      "parameters": {
        "mode": "every",
        "interval": 1,
        "hour": 8,
        "minute": 0,
        "dayOfWeek": ["mon", "tue", "wed", "thu", "fri"]
      }
    },
    {
      "name": "Get Monthly Clients",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [450, 300],
      "parameters": {
        "operation": "executeQuery",
        "resourceType": "table",
        "table": "clients",
        "query": "SELECT * FROM clients WHERE payment_schedule = 'Monthly'"
      },
      "credentials": {
        "supabaseApi": "supabase_creds"
      }
    },
    {
      "name": "Loop Through Clients",
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 1,
      "position": [650, 300],
      "parameters": {
        "batchSize": 1
      }
    },
    {
      "name": "Create Invoice",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [850, 300],
      "parameters": {
        "method": "POST",
        "url": "=YOUR_APP_URL/api/invoices/create",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "client_id": "={{$node[\"Get Monthly Clients\"].json.client_id}}",
          "subtotal": 1000,
          "tax": 0,
          "amount": 1000,
          "line_items": [
            {
              "description": "Monthly Service",
              "quantity": 1,
              "rate": 1000,
              "amount": 1000
            }
          ]
        }
      }
    },
    {
      "name": "Mark as Sent",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [1050, 300],
      "parameters": {
        "operation": "updateRecords",
        "table": "invoices",
        "updateKey": "invoice_id",
        "updates": {
          "status": "Sent",
          "sent_at": "={{new Date().toISOString()}}"
        }
      },
      "credentials": {
        "supabaseApi": "supabase_creds"
      }
    },
    {
      "name": "Send Email",
      "type": "n8n-nodes-base.gmail",
      "typeVersion": 1,
      "position": [1250, 300],
      "parameters": {
        "operation": "sendMail",
        "to": "={{$node[\"Get Monthly Clients\"].json.email}}",
        "subject": "Your Monthly Invoice Ready",
        "textContent": "Your invoice is ready",
        "attachments": true
      },
      "credentials": {
        "gmailOAuth2": "gmail_creds"
      }
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [["Get Monthly Clients"]]
    },
    "Get Monthly Clients": {
      "main": [["Loop Through Clients"]]
    },
    "Loop Through Clients": {
      "main": [["Create Invoice"]]
    },
    "Create Invoice": {
      "main": [["Mark as Sent"]]
    },
    "Mark as Sent": {
      "main": [["Send Email"]]
    }
  }
}
```

---

## 🤖 N8N WORKFLOW 2: PAYMENT REMINDER AUTOMATION

**Workflow Name:** `payment-reminder-flow`  
**Trigger:** Every hour  
**Purpose:** Send reminders based on due date and payment status

### Nodes Setup:

```json
{
  "nodes": [
    {
      "name": "Hourly Schedule",
      "type": "n8n-nodes-base.cron",
      "typeVersion": 1,
      "position": [250, 300],
      "parameters": {
        "mode": "every",
        "interval": 1,
        "unit": "hours"
      }
    },
    {
      "name": "Get Unpaid Invoices",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [450, 300],
      "parameters": {
        "operation": "executeQuery",
        "resourceType": "table",
        "table": "invoices",
        "query": "SELECT * FROM invoices WHERE status != 'Paid' AND due_date IS NOT NULL"
      },
      "credentials": {
        "supabaseApi": "supabase_creds"
      }
    },
    {
      "name": "Split Batches",
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 1,
      "position": [650, 300],
      "parameters": {
        "batchSize": 1
      }
    },
    {
      "name": "Check Time Until Due",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [850, 300],
      "parameters": {
        "functionCode": `
const invoice = $input.first().json;
const now = new Date();
const dueDate = new Date(invoice.due_date);
const hoursUntilDue = Math.round((dueDate - now) / (1000 * 60 * 60));

return {
  ...invoice,
  hoursUntilDue,
  isOverdue: dueDate < now,
  isDueSoon: hoursUntilDue <= 8 && hoursUntilDue > 0
};
        `
      }
    },
    {
      "name": "Router by Status",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 1,
      "position": [1050, 300],
      "parameters": {
        "conditions": {
          "default": "no_action",
          "rules": [
            {
              "condition": "{{$node[\"Check Time Until Due\"].json.isDueSoon && !$node[\"Check Time Until Due\"].json.reminder_1_sent}}",
              "output": "send_reminder_1"
            },
            {
              "condition": "{{$node[\"Check Time Until Due\"].json.isOverdue && !$node[\"Check Time Until Due\"].json.reminder_2_sent}}",
              "output": "send_overdue"
            },
            {
              "condition": "{{$node[\"Check Time Until Due\"].json.isOverdue && $node[\"Check Time Until Due\"].json.reminder_2_sent && !$node[\"Check Time Until Due\"].json.reminder_3_sent}}",
              "output": "send_final"
            }
          ]
        }
      }
    },
    {
      "name": "Send Reminder 1",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [1250, 150],
      "parameters": {
        "method": "POST",
        "url": "=YOUR_APP_URL/api/email/send-reminder",
        "body": {
          "invoiceId": "={{$node[\"Check Time Until Due\"].json.invoice_id}}",
          "reminderType": "reminder_1"
        }
      }
    },
    {
      "name": "Send Overdue",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [1250, 300],
      "parameters": {
        "method": "POST",
        "url": "=YOUR_APP_URL/api/email/send-reminder",
        "body": {
          "invoiceId": "={{$node[\"Check Time Until Due\"].json.invoice_id}}",
          "reminderType": "overdue"
        }
      }
    },
    {
      "name": "Send Final Reminder",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [1250, 450],
      "parameters": {
        "method": "POST",
        "url": "=YOUR_APP_URL/api/email/send-reminder",
        "body": {
          "invoiceId": "={{$node[\"Check Time Until Due\"].json.invoice_id}}",
          "reminderType": "final"
        }
      }
    },
    {
      "name": "Update Reminder Status",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [1450, 300],
      "parameters": {
        "operation": "updateRecords",
        "table": "invoices",
        "updateKey": "invoice_id"
      },
      "credentials": {
        "supabaseApi": "supabase_creds"
      }
    }
  ],
  "connections": {
    "Hourly Schedule": {
      "main": [["Get Unpaid Invoices"]]
    },
    "Get Unpaid Invoices": {
      "main": [["Split Batches"]]
    },
    "Split Batches": {
      "main": [["Check Time Until Due"]]
    },
    "Check Time Until Due": {
      "main": [["Router by Status"]]
    },
    "Router by Status": {
      "send_reminder_1": [["Send Reminder 1"]],
      "send_overdue": [["Send Overdue"]],
      "send_final": [["Send Final Reminder"]]
    },
    "Send Reminder 1": {
      "main": [["Update Reminder Status"]]
    },
    "Send Overdue": {
      "main": [["Update Reminder Status"]]
    },
    "Send Final Reminder": {
      "main": [["Update Reminder Status"]]
    }
  }
}
```

---

## 🤖 N8N WORKFLOW 3: PAYMENT RECEIVED HANDLER

**Workflow Name:** `payment-received-handler`  
**Trigger:** Webhook (called from app when marking invoice as paid)  
**Purpose:** Stop reminders and update status

### Nodes Setup:

```json
{
  "nodes": [
    {
      "name": "Payment Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "payment-received"
      }
    },
    {
      "name": "Update Invoice to Paid",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [450, 300],
      "parameters": {
        "operation": "updateRecords",
        "table": "invoices",
        "updateKey": "invoice_id",
        "updates": {
          "status": "Paid",
          "paid_at": "={{new Date().toISOString()}}",
          "reminder_1_sent": false,
          "reminder_2_sent": false,
          "reminder_3_sent": false,
          "final_reminder_sent": false
        }
      },
      "credentials": {
        "supabaseApi": "supabase_creds"
      }
    },
    {
      "name": "Send Payment Confirmation",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [650, 300],
      "parameters": {
        "method": "POST",
        "url": "=YOUR_APP_URL/api/email/send-payment-received",
        "body": {
          "invoiceId": "={{$node[\"Payment Webhook\"].json.invoiceId}}"
        }
      }
    },
    {
      "name": "Send Slack Notification",
      "type": "n8n-nodes-base.slack",
      "typeVersion": 1,
      "position": [850, 300],
      "parameters": {
        "operation": "sendMessage",
        "channel": "#payments",
        "text": "✅ Payment Received: Invoice {{$node[\"Payment Webhook\"].json.invoiceNumber}} - Amount: {{$node[\"Payment Webhook\"].json.amount}}"
      },
      "credentials": {
        "slackApi": "slack_creds"
      }
    }
  ],
  "connections": {
    "Payment Webhook": {
      "main": [["Update Invoice to Paid"]]
    },
    "Update Invoice to Paid": {
      "main": [["Send Payment Confirmation", "Send Slack Notification"]]
    }
  }
}
```

---

## 📋 DEPLOYMENT CHECKLIST

### Phase 1: Pre-Launch Setup

```
🔧 INFRASTRUCTURE
  ☐ Supabase project created
  ☐ Database tables created and indexed
  ☐ Supabase auth configured
  ☐ RLS policies tested (development mode for now)
  ☐ Backup enabled in Supabase

🔑 CREDENTIALS & SECRETS
  ☐ Supabase API keys generated (anon + service role)
  ☐ Gmail app password created
  ☐ N8N API credentials stored
  ☐ All secrets in .env.local
  ☐ Netlify environment variables configured
  ☐ Slack webhook URL added (for notifications)

📧 EMAIL CONFIGURATION
  ☐ Gmail account setup complete
  ☐ 2-factor authentication enabled on Gmail
  ☐ App-specific password generated
  ☐ Test email sent successfully
  ☐ Email templates reviewed and approved
  ☐ PDF rendering tested with sample invoice

🏗️ FRONTEND BUILD
  ☐ Next.js app created and configured
  ☐ All dependencies installed
  ☐ TypeScript configured
  ☐ Tailwind CSS working
  ☐ Build completes without errors (npm run build)
  ☐ No console warnings

📊 SERVICES & APIS
  ☐ Supabase client initialized
  ☐ All service files created
  ☐ API routes tested locally
  ☐ PDF generation working
  ☐ Email service sending correctly

🤖 N8N AUTOMATION
  ☐ N8N instance running on Contabo VPS
  ☐ Supabase credentials added to N8N
  ☐ Gmail OAuth connected
  ☐ Slack integration configured
  ☐ All 3 workflows created
  ☐ Webhook URLs generated
  ☐ Test runs passed
```

### Phase 2: Testing

```
✅ DATABASE TESTING
  ☐ Create test client
  ☐ Create test invoice
  ☐ Verify auto-numbering (INV-001, INV-002, etc.)
  ☐ Test all CRUD operations
  ☐ Verify indexes working (performance check)
  ☐ Test with 100+ test invoices
  ☐ Database cleanup (delete test data)

✅ INVOICE GENERATION
  ☐ Create 5 test invoices with different line items
  ☐ Verify calculations (subtotal, tax, total)
  ☐ Test with different tax rates
  ☐ Test with different currencies
  ☐ Verify all invoice numbers are unique

✅ PDF GENERATION
  ☐ Generate PDF for each test invoice
  ☐ Verify PDF quality and formatting
  ☐ Check all data is populated correctly
  ☐ Test PDF download from frontend
  ☐ Verify PDF is properly attached to emails

✅ EMAIL DELIVERY
  ☐ Send initial invoice email
  ☐ Verify email formatting (HTML)
  ☐ Verify PDF attachment
  ☐ Check email arrives within 30 seconds
  ☐ Test with multiple recipients
  ☐ Verify no emails in spam folder

✅ AUTOMATION WORKFLOWS
  ☐ Trigger scheduled auto-invoice
  ☐ Verify invoice created correctly
  ☐ Verify email sent automatically
  ☐ Test due date reminder (set invoice to 8 hours before due)
  ☐ Verify reminder email sent
  ☐ Test overdue email (set due date to past)
  ☐ Verify overdue email sent
  ☐ Test final reminder (multiple reminders)
  ☐ Mark invoice as paid
  ☐ Verify reminders stop immediately
  ☐ Verify payment received email sent
  ☐ Verify Slack notification received

✅ FRONTEND UI/UX
  ☐ Invoice list page loads
  ☐ Status filter works correctly
  ☐ Search by invoice number works
  ☐ Create invoice form loads
  ☐ Add/remove line items works
  ☐ Calculations update dynamically
  ☐ Invoice preview displays correctly
  ☐ Send invoice button works
  ☐ View invoice detail page
  ☐ Mark as paid button works
  ☐ Download PDF button works
  ☐ Client management pages work
  ☐ Mobile responsive (test on phone)
  ☐ All status tags display correctly
  ☐ No console errors

✅ ERROR HANDLING
  ☐ Test with invalid email
  ☐ Test with missing client info
  ☐ Test with empty line items
  ☐ Test with negative amounts
  ☐ Test Supabase connection failure
  ☐ Test email service failure
  ☐ Test PDF generation failure
  ☐ Verify error messages are user-friendly
  ☐ Verify errors are logged properly
```

### Phase 3: Performance & Security

```
⚡ PERFORMANCE
  ☐ Home page loads in < 2 seconds
  ☐ Invoice list loads < 3 seconds (100 invoices)
  ☐ PDF generation < 5 seconds
  ☐ Email send < 2 seconds
  ☐ Database queries optimized (check indexes)
  ☐ No N+1 queries
  ☐ Caching configured (if needed)

🔒 SECURITY
  ☐ Environment variables not exposed in code
  ☐ API routes protected (no unauthorized access)
  ☐ SQL injection prevented (using parameterized queries)
  ☐ CORS configured correctly
  ☐ Rate limiting on API endpoints
  ☐ Input validation on all forms
  ☐ HTTPS enabled on production
  ☐ Sensitive data not logged
  ☐ PDF/emails not accessible by unauthorized users
  ☐ Test with invalid credentials
```

### Phase 4: Deployment to Production

```
🚀 NETLIFY DEPLOYMENT
  ☐ Netlify account created
  ☐ GitHub repository connected
  ☐ Build settings configured
  ☐ Environment variables added to Netlify
  ☐ Preview deploys working
  ☐ Production domain configured
  ☐ SSL certificate active
  ☐ Deploy log checked for warnings

🚀 N8N PRODUCTION
  ☐ N8N workflows activated
  ☐ Webhook URLs updated to production URL
  ☐ Credentials tested with production database
  ☐ Production database backups verified
  ☐ Error notifications configured

🚀 DATABASE BACKUP
  ☐ Supabase backups enabled
  ☐ Test restore procedure
  ☐ Backup schedule set (daily)
  ☐ Critical data backed up elsewhere

🚀 MONITORING & ALERTS
  ☐ Error tracking enabled (Sentry or similar)
  ☐ Email delivery monitoring
  ☐ Database monitoring
  ☐ N8N workflow monitoring
  ☐ Alerts configured for critical issues
  ☐ Health check endpoint created
```

### Phase 5: Post-Launch

```
📊 MONITORING (First Week)
  ☐ Daily check of error logs
  ☐ Verify all invoices sent successfully
  ☐ Monitor email delivery rate
  ☐ Check N8N workflow execution
  ☐ Monitor database performance
  ☐ Track user feedback

📝 DOCUMENTATION
  ☐ User guide created
  ☐ Admin documentation written
  ☐ API documentation complete
  ☐ Troubleshooting guide created
  ☐ Deployment guide for future updates

🔄 HANDOVER TO UBAID
  ☐ Demo all features
  ☐ Show dashboard and invoices
  ☐ Show automation flow
  ☐ Explain status tags and reminders
  ☐ Provide credentials securely
  ☐ Create admin account
  ☐ Provide contact info for support
```

---

## 🎯 TESTING COMMAND TEMPLATES

### Test Invoice Creation (Local)

```bash
# Open N8N test node and paste:
{
  "client_id": "test-client-id",
  "subtotal": 1000,
  "tax": 100,
  "amount": 1100,
  "status": "Draft",
  "line_items": [
    {
      "description": "Test Service",
      "quantity": 1,
      "rate": 1000,
      "amount": 1000
    }
  ]
}
```

### Test Email Sending (Local)

```bash
# Use this cURL to test email endpoint
curl -X POST http://localhost:3000/api/email/send-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "test-id",
    "clientEmail": "test@example.com",
    "reminderType": "reminder_1"
  }'
```

### Test PDF Generation (Local)

```bash
# Use this cURL to test PDF generation
curl -X POST http://localhost:3000/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber": "INV-001",
    "date": "2026-09-05",
    "dueDate": "2026-09-20",
    "clientName": "Test Client",
    "clientCompany": "Test Company",
    "clientEmail": "test@example.com",
    "clientAddress": "123 Main St",
    "lineItems": [
      {
        "id": "1",
        "description": "Test Service",
        "quantity": 1,
        "rate": 1000,
        "amount": 1000
      }
    ],
    "subtotal": 1000,
    "tax": 100,
    "total": 1100,
    "taxRate": 10
  }' > test-invoice.pdf
```

---

## 🔧 TROUBLESHOOTING GUIDE

### Issue: Emails not sending

**Check:**
1. Gmail credentials correct
2. App password generated (not regular password)
3. 2FA enabled on Gmail
4. Check N8N logs for errors
5. Test with simple email first
6. Check spam folder

**Solution:**
```bash
# Test Gmail connection
telnet smtp.gmail.com 587
# Should connect successfully
```

### Issue: PDF not generating

**Check:**
1. Puppeteer installed correctly
2. No headless browser issues
3. HTML content valid
4. Check Netlify build logs
5. Verify memory available

**Solution:**
```bash
# Install Chromium dependencies
sudo apt-get install -y chromium-browser
npm install puppeteer --no-sandbox
```

### Issue: Supabase connection failing

**Check:**
1. API URL correct
2. API key correct
3. Row Level Security policies
4. Network connectivity
5. Credentials in .env.local

**Solution:**
```bash
# Test Supabase connection
curl -X GET \
  -H "apikey: YOUR_API_KEY" \
  https://your-project.supabase.co/rest/v1/clients?limit=1
```

### Issue: N8N workflows not triggering

**Check:**
1. Workflow active/activated
2. Webhook URLs correct
3. Credentials valid in N8N
4. Execution logs checked
5. N8N service running

**Solution:**
```bash
# Check N8N logs
ssh your-contabo-ip
docker logs n8n-container
# Or check N8N UI → Execution History
```

---

## 📞 QUICK CONTACTS

**For Issues:**
- Ubaid (Product Owner)
- Maaz (Finance Tracker Integration)
- N8N Support (automation issues)
- Supabase Support (database issues)

**Monitoring Dashboards:**
- Netlify: https://app.netlify.com
- Supabase: https://app.supabase.com
- N8N: https://your-n8n-ip:5678
- Gmail: https://mail.google.com

---

## ✅ SIGN-OFF CHECKLIST

When everything is working:

```
READY FOR PRODUCTION when:
☐ All 39 test items passing
☐ 0 critical errors in logs
☐ Email delivery rate > 99%
☐ PDF generation 100% success
☐ N8N workflows all executing
☐ Performance within targets
☐ Security audit passed
☐ Ubaid sign-off received

DEPLOYED TO PRODUCTION when:
☐ All monitoring alerts active
☐ Backup verified working
☐ Documentation complete
☐ Team trained
☐ Support plan in place
```

---

Good luck, Rehmat! This is a comprehensive system. Take it step by step, test thoroughly, and you'll build something amazing! 🚀
