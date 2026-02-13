This is a common challenge in QR-based POS systems. Here's the professional approach:

## Recommended Solution: Session-Based Order Management

**Core Concept:** Create a unique "dining session" that starts when the first order is placed and ends when the bill is settled.

### Implementation Strategy:

**1. Session Initiation**

- QR code contains: `{branch_id, table_number}`
- When customer scans → they see the menu
- First order creates a new session with unique `session_id`
- Store this session_id in browser (localStorage/sessionStorage)

**2. Session Continuity**

- Subsequent scans from same device check for active session
- If active session exists for that table → continue same session
- All orders append to the same session
- Customer sees their cumulative order history

**3. Session Termination**

- Session ends when: bill is paid and marked as "closed"
- Clear the session_id from browser storage
- Next customer scanning QR starts fresh

### Database Structure:

```
dining_sessions
- session_id (UUID)
- table_id
- branch_id
- status (active/closed)
- created_at
- closed_at

orders
- order_id
- session_id (FK)
- items
- timestamp
- status
```

### Handling Edge Cases:

**Problem: Customer leaves without paying / Browser cleared**

- **Solution:** Admin dashboard shows "orphaned" active sessions
- Staff can manually close sessions when table is cleared
- Auto-close sessions after X hours of inactivity

**Problem: Multiple customers at same table with different devices**

- **Solution:**
  - Option A: First device creates session, show session PIN/code on confirmation screen that others can enter
  - Option B: Allow multiple concurrent sessions per table (split billing feature)

**Problem: Customer accidentally closes browser**

- **Solution:** Session stored server-side, only reference in localStorage
- Show "Continue existing order?" prompt if returning within timeout period

### Professional Features to Add:

1. **Session Recovery:** "Have an active order? Enter your order number"
2. **Visual Feedback:** Show "Order #X active at this table"
3. **Staff Override:** Waiters can force-close sessions via admin panel
4. **Time-based Auto-close:** Sessions auto-close after 3-4 hours
5. **Analytics:** Track session duration, average orders per session

This approach is used by major QR ordering platforms like Toast, Square, and Mr Yum. It balances customer convenience with operational control.
