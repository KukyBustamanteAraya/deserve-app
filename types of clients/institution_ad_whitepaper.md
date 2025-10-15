# 🏩 Deserve User White Paper (Developer Implementation Version)

---

## 1. Purpose

This document defines user types, workflows, permissions, and dashboard structures for **Deserve’s Team Management System**, providing Claude with a clear roadmap for implementation. It replaces narrative content with actionable design logic, maintaining Hormozi and Miller-inspired tone through intent and copy style rather than citation.

---

## 2. Small Team — Players or Single-Team Managers

### 🎯 Overview

A **small team** (5–15 players) can be self-managed or led by a **Team Manager**. Their goal is a fast, transparent process to order uniforms, collect info, and complete payments with minimal friction.

---

### 💡 Core Needs & Problems

| Need                   | Technical Impact                                             |
| ---------------------- | ------------------------------------------------------------ |
| Simple onboarding      | Quick team creation flow (logo upload, sport selection).     |
| Player info collection | Player portal with size, number, and position fields.        |
| Payment tracking       | Split payment API integration (Mercado Pago).                |
| Visual clarity         | Real-time order tracker + visual progress bars.              |
| Engagement             | Design preview and lineup visualization to build excitement. |

---

### ⚙️ Workflow → Component Mapping

1. **Create Team** → `TeamCreateForm`
   - Upload logo, select sport, choose design.
   - Assign optional manager.
2. **Collect Player Info** → `PlayerInfoPortal`
   - Player input (name, size, number, position via field map).
   - Team progress bar updates automatically.
3. **Approve Design** → `DesignApprovalCard`
   - Mockup preview, comment section, final approval toggle.
4. **Payment** → `PaymentPortal`
   - Full or split payments.
   - API callback updates team progress.
5. **Production & Delivery** → `OrderTracker`
   - Timeline view + notifications per status.

---

### 🧭 Dashboard Structure

| Section              | Key Components                     | Description                                             |
| -------------------- | ---------------------------------- | ------------------------------------------------------- |
| **Hero Banner**      | `TeamHeader`, `OrderStageBadge`    | Shows team info and stage status.                       |
| **Design & Lineup**  | `DesignMockup`, `MiniFieldMap`     | Visual toggle between uniform design and player lineup. |
| **Progress Tracker** | `CompletionBar`, `StatsCard`       | Shows data + payment completion %.                      |
| **Player Info**      | `PlayerList`, `PlayerCard`         | Editable details per player.                            |
| **Payments**         | `PaymentCard`, `TeamBalance`       | Shows each player’s payment status.                     |
| **Delivery**         | `DeliveryTimeline`, `PhotoGallery` | Displays shipping stages and proof photos.              |

---

### 🗺️ Mini‑Field Visualization

```
[Toggle: Design | Lineup | Split]
--------------------------------------------
| Field/Court Outline (Sport‑specific)       |
| Player icons placed at chosen positions    |
| Hover: name, number, size                  |
| Click: opens player profile                |
--------------------------------------------
[Button: Export / Share Team View]
```

- Appears beside the design mockup.
- Click = open player info modal.
- Manager permissions → drag/drop reorder, mark completion.

---

### 🔐 Permissions Matrix

| Role    | Edit Info   | Approve Design | Manage Payments | Adjust Positions | View Delivery |
| ------- | ----------- | -------------- | --------------- | ---------------- | ------------- |
| Player  | ✅ self only | ❌              | ✅ own           | ❌                | ✅             |
| Manager | ✅ all       | ✅              | ✅               | ✅                | ✅             |
| Guest   | ❌           | ❌              | ❌               | ❌                | ✅ read-only   |

---

### 📦 Data Model Notes

```json
Team {
  id, name, sport, logo_url, manager_id, order_id
}
Player {
  id, team_id, name, number, size, position_code, payment_status, user_id
}
Order {
  id, team_id, status, total_price, delivery_eta, timeline[], invoice_url
}
```

---

### ✍️ Tone & Copy Principles

- **Simple**: clear, conversational, and encouraging.
- **Trust-building**: show progress visually to remove anxiety.
- **Inclusive**: celebrate the team’s progress as a shared milestone.
- **Energetic**: use verbs that create motion (“Track,” “Finish,” “Celebrate”).
- **Professional warmth**: balance reliability and enthusiasm.

---

### 📑 Implementation Notes

- Integrate `MiniFieldMap` for lineup visualization (sport-based background SVG).
- Reuse `OrderTracker` from Institution dashboard; adapt for single order context.
- Ensure `PaymentPortal` supports both team and per-player logic.
- Analytics aggregation deferred for small teams (lightweight client-side stats).
- Notifications: event-based (size submitted, payment confirmed, delivery update).

---

### 🏁 Mission Alignment

Deserve makes small teams feel professional, connected, and organized — combining the emotional appeal of belonging with the operational clarity of enterprise-grade order management.

---

## 3. Institutional Client — The Athletic Director (Simplified for Implementation)

### 🎯 Profile

An **Athletic Director (AD)** or **Sports Coordinator** managing multiple teams under one institution. They require oversight, consistency, and data transparency.

---

### ⚙️ Core Modules

| Module                    | Description                                         |
| ------------------------- | --------------------------------------------------- |
| **Institution Dashboard** | Overview of programs, active orders, and budgets.   |
| **Orders Manager**        | Unified table with filtering, sorting, and actions. |
| **Program Detail**        | Nested view of sports, teams, and coaches.          |
| **Finance Tracker**       | Summaries, invoices, receipts.                      |
| **Communication Center**  | Notifications, approvals, and internal messaging.   |

---

### 🔐 Roles & Access

| Role              | Access Level                                           |
| ----------------- | ------------------------------------------------------ |
| Athletic Director | Full control over institution and programs.            |
| Coach             | Control within assigned program/team.                  |
| Assistant         | Data entry, communication, and progress tracking only. |
| Read‑Only         | Viewing analytics and delivery summaries.              |

---

### 📈 Shared Components Between User Types

| Component          | Behavior                                         |
| ------------------ | ------------------------------------------------ |
| `OrderTracker`     | Tracks progress for both teams and institutions. |
| `PaymentPortal`    | Manages both split and bulk payments.            |
| `DesignMockup`     | Displays approved designs in both dashboards.    |
| `NotificationBell` | Handles alerts across user roles.                |
| `ProgressBar`      | Standardized completion metric component.        |

---

### 📋 Implementation Notes for Claude

1. Reuse component architecture; props defined per user type (institution/team).
2. Maintain unified Supabase schema with foreign key relationships.
3. Implement RLS policies based on `role` and `team_id`/`institution_id`.
4. Build UI layout as modular tabs (Orders, Programs, Analytics, Finance).
5. Use same notification events for both dashboards with contextual rendering.

---

### ✍️ Tone & UX Copy

Deserve’s writing should sound **reliable, efficient, and confident** — language that reflects control and precision, while making the process feel effortless for the user.

---

### 🏁 Mission Alignment

Deserve provides **clarity and control** for institutions and small teams alike — simplifying logistics, improving communication, and creating a sense of pride through design and precision.

