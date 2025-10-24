# Admin Notification System

## Overview
The admin notification system automatically alerts administrators when customers provide feedback on design mockups. This ensures timely responses to customer approvals and change requests.

---

## How It Works

### 1. **Customer Submits Feedback**
When a customer uses the `DesignApprovalCard` component to approve or request changes:
- The feedback is saved to `design_feedback` table
- A database trigger (`trg_notify_admin_design_feedback`) fires automatically
- An admin notification is created in `admin_notifications` table

### 2. **Notification Types**
The system creates different notification types based on customer action:

| Feedback Type | Notification Type | Priority |
|--------------|------------------|----------|
| `approval` | `design_approval` | Normal |
| `changes_requested` | `design_changes_requested` | **High** (animated badge) |
| `comment` | `design_feedback` | Normal |

### 3. **Admin Views Notifications**
Admins can see notifications in **two places**:

#### **A. Design Requests Page** (`/admin/design-requests`)
- Visual badges on design cards:
  - **Yellow pulsing badge**: "⚠ Customer requested changes"
  - **Green badge**: "✓ Customer approved"
- Click "View details" to expand and see full feedback section

#### **B. Customer Feedback Section** (expanded view)
Shows complete feedback history:
- Feedback type badge (Approved / Changes Requested / Comment)
- Customer message
- Requested change categories (colors, logos, text, etc.)
- Customer email
- Timestamp

---

## Database Schema

### **admin_notifications** Table

```sql
CREATE TABLE public.admin_notifications (
  id BIGSERIAL PRIMARY KEY,
  notification_type TEXT NOT NULL, -- 'design_approval', 'design_changes_requested', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT, -- '/admin/design-requests'

  -- Related entities
  design_request_id BIGINT,
  order_id UUID,
  team_id UUID,
  user_id UUID,

  -- Metadata
  metadata JSONB,

  -- Read status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  read_by UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Metadata JSON Structure**
```json
{
  "feedback_type": "changes_requested",
  "feedback_message": "Can you change the logo size?",
  "requested_changes": {
    "logos": true,
    "colors": false,
    "text": false
  },
  "product_name": "Basketball Jersey",
  "team_name": "Warriors",
  "customer_email": "customer@example.com"
}
```

---

## Implementation Files

### **Database Migration**
📁 `supabase/migrations/035_design_feedback_notifications.sql`
- Creates `admin_notifications` table
- Creates trigger function `notify_admin_design_feedback()`
- Adds trigger on `design_feedback` table
- Creates `admin_notifications_summary` view for counts

### **Admin UI**
📁 `src/app/admin/design-requests/page.tsx`
- Enhanced to show approval status badges
- Loads and displays customer feedback
- Color-coded feedback cards (green=approved, yellow=changes)
- Shows change request details

### **Customer UI Components**
📁 `src/components/design/DesignApprovalCard.tsx`
- Customer-facing approval interface
- Submit approval or change requests
- Automatically triggers admin notification

---

## Future Enhancements

### **Phase 2: Real-time Notifications** (Optional)
- Add notification bell icon in admin nav
- Show unread count badge
- Real-time Supabase subscriptions for live updates
- Toast notifications when new feedback arrives

### **Phase 3: Email Notifications** (Optional)
- Send email to admin when changes requested
- Include direct link to design request
- Summary of requested changes
- Use Supabase Edge Functions or Resend API

---

## Testing the System

### **1. Apply Migration**
```bash
# Apply the notification system migration
psql $DATABASE_URL -f supabase/migrations/035_design_feedback_notifications.sql
```

### **2. Submit Test Feedback**
1. Go to customer dashboard (`/mi-equipo`)
2. Click "Vista Jugador" to see PlayerDashboard
3. If design mockups are ready, the approval card will show
4. Click "Request Changes" and submit feedback
5. Select change categories (colors, logos, etc.)
6. Add a message

### **3. Verify Admin Notification**
1. Go to `/admin/design-requests`
2. You should see a **yellow pulsing badge** on the design
3. Click "View details"
4. Scroll to "Customer Feedback" section
5. See the feedback with change request details

### **4. Check Database**
```sql
-- View all notifications
SELECT * FROM public.admin_notifications ORDER BY created_at DESC;

-- Get unread counts
SELECT * FROM public.admin_notifications_summary;

-- View feedback with notifications
SELECT
  df.feedback_type,
  df.message,
  dr.product_name,
  t.name as team_name,
  u.email as customer_email,
  an.title as notification_title,
  an.created_at as notified_at
FROM public.design_feedback df
JOIN public.design_requests dr ON dr.id = df.design_request_id
JOIN public.teams t ON t.id = dr.team_id
JOIN auth.users u ON u.id = df.user_id
LEFT JOIN public.admin_notifications an ON an.design_request_id = df.design_request_id
ORDER BY df.created_at DESC;
```

---

## Notification Flow Diagram

```
Customer Dashboard
      ↓
[DesignApprovalCard]
      ↓
Click "Request Changes"
      ↓
Submit feedback with categories
      ↓
INSERT into design_feedback
      ↓
🔔 TRIGGER: trg_notify_admin_design_feedback
      ↓
INSERT into admin_notifications
      ↓
Admin sees yellow pulsing badge
      ↓
Admin clicks "View details"
      ↓
Admin sees feedback section
      ↓
Admin responds to customer
```

---

## API Endpoints (Future)

If you want to build a notification center UI:

### **GET /api/admin/notifications**
- Returns unread notifications
- Supports pagination
- Filter by type

### **PATCH /api/admin/notifications/[id]/read**
- Mark notification as read
- Updates `is_read` and `read_at`

### **GET /api/admin/notifications/summary**
- Returns unread counts by type
- Used for notification bell badge

---

## Summary

✅ **Automatic notifications** - Triggered by database when customer submits feedback
✅ **Visual indicators** - Pulsing badges on design cards that need attention
✅ **Complete feedback history** - All customer approvals and change requests in one place
✅ **Metadata tracking** - Full context including team, product, and requested changes
✅ **Ready for expansion** - Easy to add email notifications, real-time updates, or notification center UI

The system is **production-ready** and requires no manual intervention. Admins will automatically see customer feedback the moment it's submitted!

---

**Created:** 2025-10-08
**Migration:** 035_design_feedback_notifications.sql
**Status:** ✅ Ready for testing
