# Foodics POS — Feature Reference for Codebase Audit

> This document is intended to be read by Claude Code to compare against an existing POS system codebase.
> For each feature, check if it exists, is complete, and matches the expected behavior described below.
> Mark each item as: EXISTS / PARTIAL / MISSING

---

## HOW TO USE THIS DOCUMENT

1. Read each section and its fields/behaviors
2. Search the codebase for matching routes, models, components, or UI
3. Flag anything that is MISSING or only PARTIAL
4. Produce a gap report at the end listing what needs to be built

---

## 1. DASHBOARD

### 1.1 Tabs
- [ ] General tab — aggregated metrics across all branches
- [ ] Branches tab — per-branch breakdown
- [ ] Inventory tab — inventory overview
- [ ] Kitchen tab — kitchen performance metrics

### 1.2 Time Filters
- [ ] Day view
- [ ] Week view
- [ ] Month view
- [ ] Custom date range picker
- [ ] Compare mode — compare two time periods side by side

### 1.3 KPI Metrics (each must have a "View Report" link)
- [ ] Total Orders count
- [ ] Net Sales (revenue after discounts/returns)
- [ ] Net Payments (total payments received)
- [ ] Return Amount
- [ ] Discount Amount
- [ ] Order Types breakdown (dine-in, delivery, pickup, etc.)

### 1.4 Charts & Lists
- [ ] Hourly Sales chart
- [ ] Top Products by Net Sales list
- [ ] Top Payment Methods list
- [ ] Top Branches by Net Sales list

---

## 2. ORDERS

### 2.1 Order List
Must display a table with these columns:
- [ ] Reference Number
- [ ] Branch
- [ ] Customer (nullable)
- [ ] Status
- [ ] Source (API, Cashier, etc.)
- [ ] Total
- [ ] Business Date
- [ ] Opened At (timestamp)

### 2.2 Order Status Filter Tabs
- [ ] All
- [ ] Today
- [ ] Draft
- [ ] Pending
- [ ] Active
- [ ] Ahead (scheduled/future orders)
- [ ] Call Center
- [ ] API

### 2.3 Order Statuses (data model)
- [ ] Draft
- [ ] Pending
- [ ] Active
- [ ] Done
- [ ] Void

### 2.4 Order Sources (data model)
- [ ] API
- [ ] Cashier
- [ ] Call Center
- [ ] 3rd Party / Integration

### 2.5 Order List Features
- [ ] Export orders to file (CSV or Excel)
- [ ] Advanced filter (by branch, date, status, source)
- [ ] Multi-branch selector (All Branches or specific branch)
- [ ] Pagination (Previous / Next)

---

## 3. CUSTOMERS

### 3.1 Core Features
- [ ] Customer list with search
- [ ] Customer profile (name, phone, email)
- [ ] Order history per customer
- [ ] Link to loyalty points/balance
- [ ] Create / Edit / Delete customer

---

## 4. REPORTS

### 4.1 Inventory Reports
- [ ] Inventory Levels
- [ ] Inventory Control
- [ ] Inventory History
- [ ] Purchase Orders report
- [ ] Transfer Orders report
- [ ] Transfers report
- [ ] Purchasing report
- [ ] Cost Adjustment History

### 4.2 Business Reports
- [ ] Taxes report
- [ ] Tips report
- [ ] Gift Cards report
- [ ] Business Days report
- [ ] Shifts report
- [ ] Tills report
- [ ] Drawer Operations report
- [ ] Voids & Returns report
- [ ] Activity Log

### 4.3 Analysis Reports
- [ ] Menu Engineering (product profitability vs popularity matrix)
- [ ] Inventory Cost Analysis
- [ ] Branches Trend (compare branches over time)
- [ ] Speed of Service (time from order to fulfillment)
- [ ] Product Cost
- [ ] Modifier Options Cost
- [ ] Inventory Items Cost

---

## 5. INVENTORY MANAGEMENT

### 5.1 Inventory Setup — Categories
- [ ] List inventory categories
- [ ] Create category: fields → Name (required), Reference (optional)
- [ ] Edit / Delete category

### 5.2 Inventory Setup — Items
- [ ] List inventory items
- [ ] Create item with basic fields:
  - [ ] Name (required)
  - [ ] SKU (required, unique) with auto-generate button
  - [ ] Category (optional, linked to inventory categories)
  - [ ] Storage Unit (required) — how item is stored e.g. Box, KG
  - [ ] Ingredient Unit (required) — how item is used in recipes e.g. GRAM, ML
  - [ ] Storage to Ingredient (required) — numeric conversion factor
  - [ ] Costing Method (required) — Fixed or From Transactions
  - [ ] Cost (required if Fixed) — cost per storage unit
- [ ] Advanced options (toggle):
  - [ ] Barcode — for scanner identification
  - [ ] Minimum Level — minimum stock allowed
  - [ ] Par Level — default quantity for purchase/transfer orders
  - [ ] Maximum Level — maximum stock allowed
- [ ] Edit / Delete item

### 5.3 Inventory Setup — Suppliers
- [ ] List suppliers
- [ ] Create supplier:
  - [ ] Name (required)
  - [ ] Supplier Code (required, alphanumeric only)
  - [ ] Contact Name (optional)
  - [ ] Phone (optional)
  - [ ] Primary Email (optional) — used to send Purchase Orders via email
  - [ ] Additional Emails (optional) — CC recipients, comma-separated
- [ ] Edit / Delete supplier
- [ ] System can email Purchase Orders directly to supplier's email

### 5.4 Inventory Setup — Warehouses
- [ ] List warehouses
- [ ] Create/Edit warehouse:
  - [ ] Name (required)
  - [ ] Reference (required, e.g. W01)
  - [ ] Inventory End of Day time (time picker)
- [ ] Delete warehouse inventory (separate from deleting warehouse)
- [ ] Delete warehouse
- [ ] Warehouses are separate from branches but can receive inventory

### 5.5 Inventory Setup — Inventory Preferences
- [ ] Global inventory settings/configuration page

### 5.6 Inventory Operations — Purchase Orders
- [ ] List purchase orders with status tabs: All, Draft, Pending, Accepted, Declined, Closed
- [ ] Export purchase orders
- [ ] Create purchase order:
  - [ ] Supplier (required) — linked to suppliers list
  - [ ] Destination (required) — can be a branch OR a warehouse
  - [ ] Delivery Date (optional)
  - [ ] Delivery Time (optional)
  - [ ] Notes (optional)
  - [ ] Line items: inventory item + quantity
- [ ] Edit / Cancel / Close purchase order
- [ ] Send purchase order via email to supplier

### 5.7 Inventory Operations — Purchasing (Receiving)
- [ ] Record actual receipt of purchased goods
- [ ] Create purchasing record:
  - [ ] Supplier (required)
  - [ ] Branch or Warehouse (required) — destination receiving items
  - [ ] Line items: inventory item + quantity + cost
- [ ] Links back to purchase order (optional)

### 5.8 Inventory Operations — Transfer Orders
- [ ] List transfer orders with status tabs: All, Draft, Pending, Accepted, Declined, Closed
- [ ] Export transfer orders
- [ ] Create transfer order:
  - [ ] Warehouse (required) — source sending items
  - [ ] Destination (required) — branch or warehouse receiving items
  - [ ] Line items: inventory item + quantity
- [ ] Description text: "Create a Transfer Order to request inventory items from your warehouse and receive them in your branch or other warehouses."

### 5.9 Inventory Operations — Transfers
- [ ] Record completed inventory transfers
- [ ] Same fields as Transfer Orders but marks as executed

### 5.10 Inventory Operations — Production
- [ ] Create production orders to manufacture items from raw ingredients
- [ ] Expected fields:
  - [ ] Item to produce (finished/semi-finished item)
  - [ ] Quantity to produce
  - [ ] Source warehouse or branch
  - [ ] Date
  - [ ] Notes
  - [ ] Ingredients list (raw materials consumed)
- [ ] Deducts raw ingredient quantities, adds finished item quantity

### 5.11 Inventory Operations — Order Transactions
- [ ] Full history log of all inventory movements
- [ ] Filter by: branch, warehouse, date range, transaction type
- [ ] Transaction types: purchase, transfer, adjustment, production, consumption

### 5.12 Inventory Counts — Count Sheets
- [ ] List count sheets
- [ ] Create count sheet:
  - [ ] Name (required)
  - [ ] Localized Name (optional)
- [ ] Purpose: printable forms for physical stock counting
- [ ] Can be structured for daily, weekly, monthly use or by location

### 5.13 Inventory Counts — Spot Check
- [ ] List spot checks with status tabs: All, Draft, Closed
- [ ] Create spot check:
  - [ ] Branch (required)
  - [ ] Line items: item + counted quantity
- [ ] IMPORTANT: Spot check does NOT affect actual stock count — reference/audit only
- [ ] Description: "The spot check allows you to capture the count of items made by the audit team. This will not impact the actual stock count or system count and will only be used as a reference."

### 5.14 Inventory Counts — Inventory Count
- [ ] List inventory counts
- [ ] Create inventory count:
  - [ ] Branch (required)
  - [ ] Line items: item + counted quantity
- [ ] IMPORTANT: This DOES update the actual system stock count
- [ ] Difference between system count and physical count is shown

### 5.15 Inventory Adjustments — Quantity Adjustment
- [ ] Create quantity adjustment:
  - [ ] Branch or Warehouse (required)
  - [ ] Reason (required) — must select from predefined reasons
  - [ ] Line items: item + adjustment quantity (positive or negative)
- [ ] Reasons list must be configurable

### 5.16 Inventory Adjustments — Cost Adjustment
- [ ] Create cost adjustment:
  - [ ] Branch or Warehouse (required)
  - [ ] Line items: item + new cost value
- [ ] Updates item cost without changing quantity

---

## 6. MENU

### 6.1 Menu Builder — Categories
- [ ] List menu categories
- [ ] Create / Edit / Delete category
- [ ] Category used to group products on POS display

### 6.2 Menu Builder — Products
- [ ] List products
- [ ] Create / Edit / Delete product
- [ ] Expected fields: name, price, category, image, description, SKU, modifiers, ingredients (linked to inventory items), calories, allergens
- [ ] Toggle active/inactive per branch

### 6.3 Menu Builder — Modifiers
- [ ] List modifier groups
- [ ] Create modifier group with options (e.g. "Size" → Small, Medium, Large)
- [ ] Each option has: name, price delta, inventory item link (optional)
- [ ] Assign modifier groups to products

### 6.4 Menu Builder — Combos
- [ ] List combos
- [ ] Create combo: bundle multiple products at a fixed price
- [ ] Combo has a name, price, and list of included products (with optional choices)

### 6.5 Menu Builder — Groups
- [ ] List product groups
- [ ] Used for reporting segmentation or display logic

### 6.6 Menu Settings — Price Tags
- [ ] Generate and print price tag labels for products

### 6.7 Menu Settings — Allergens
- [ ] List allergen types (e.g. Gluten, Dairy, Nuts)
- [ ] Assign allergens to products
- [ ] Allergens can be displayed on receipts and menus

---

## 7. MANAGE

### 7.1 Dine-In Operations — Reservations
- [ ] Table management per branch (add/edit/delete tables)
- [ ] Set reservation time slots per branch
- [ ] Create / view / manage reservations
- [ ] Link reservation to customer profile

### 7.2 Kitchen Operations — Kitchen Flow
- [ ] List kitchen flows
- [ ] Create kitchen flow:
  - [ ] Name
  - [ ] Active / Inactive toggle
- [ ] Add stations to a flow:
  - [ ] Station name
  - [ ] Assign to branches
  - [ ] Assign KDS device to station
- [ ] Assign products to flow (which products appear on which station)
- [ ] Multiple flows can exist for different branches or kitchens

### 7.3 Payment Methods
- [ ] List payment methods with Active / Inactive / Deleted tabs
- [ ] Sort/reorder payment methods (order shown on POS)
- [ ] Add payment method types:
  - [ ] Cash
  - [ ] Card
  - [ ] 3rd Party (external integrations)
  - [ ] Gift Card
  - [ ] House Account (customer credit/tab)
- [ ] Enable / Disable per payment method

### 7.4 Charges
- [ ] List charges (e.g. service charge, delivery fee)
- [ ] Create charge: name, type (fixed/percentage), amount, applies to (order types)
- [ ] Assign charges to branches

### 7.5 Taxes & Groups
- [ ] Create tax rates (percentage)
- [ ] Group multiple taxes together
- [ ] Assign tax groups to products or branches
- [ ] UAE compliance: support Tax Inclusive Pricing mode (price already includes tax)
- [ ] System-level warning if tax-inclusive pricing is not enabled (UAE regulation)

### 7.6 Receipt Settings
Per-branch or global receipt configuration:
- [ ] Upload business logo
- [ ] Print Language: Main / Localized / Main & Localized
- [ ] Main Language selector: Arabic, English, Spanish, French
- [ ] Localized Language selector: Arabic, English, Spanish, French
- [ ] Receipt Header text (custom)
- [ ] Receipt Footer text (custom)
- [ ] Invoice Title text (custom)
- [ ] Toggle: Show order number
- [ ] Toggle: Show calories
- [ ] Toggle: Show subtotal (before taxes)
- [ ] Toggle: Show rounding amount
- [ ] Toggle: Show order closer username
- [ ] Toggle: Show order creator username
- [ ] Toggle: Show check number
- [ ] Toggle: Hide modifier options with zero price
- [ ] Toggle: Print customer phone number on pickup orders

### 7.7 Delivery Settings — Delivery Zones
- [ ] List delivery zones
- [ ] Create delivery zone:
  - [ ] Name (required)
  - [ ] Reference (required, alphanumeric + dashes + underscores only)
  - [ ] Branches (required, multi-select — which branches serve this zone)
- [ ] Edit / Delete delivery zone

---

## 8. MARKETING

### 8.1 Loyalty Settings
- [ ] Configure loyalty program rules
- [ ] Points earning rate (e.g. X points per AED spent)
- [ ] Points redemption rate (e.g. X points = Y AED)
- [ ] Minimum redemption threshold
- [ ] Enable / Disable loyalty per branch

### 8.2 Gift Cards
- [ ] Create and manage gift card products
- [ ] Set gift card value
- [ ] Issue gift cards to customers
- [ ] Track redemption and balance
- [ ] Gift card as a payment method (linked to Payment Methods)

### 8.3 Discounts
- [ ] List discounts
- [ ] Create discount:
  - [ ] Name
  - [ ] Type: Fixed amount or Percentage
  - [ ] Value
  - [ ] Applies to: product, category, or whole order
  - [ ] Requires manager approval (optional toggle)
- [ ] Enable / Disable per branch

### 8.4 Promotions
- [ ] List promotions
- [ ] Create promotion with conditions (e.g. buy X get Y, spend X get discount)
- [ ] Set active date range
- [ ] Assign to branches

### 8.5 Timed Events
- [ ] List timed events
- [ ] Create timed event:
  - [ ] Name (e.g. Happy Hour)
  - [ ] Time range (start time, end time)
  - [ ] Days of week
  - [ ] Action: price change, menu change, or discount applied
- [ ] Assign to branches

### 8.6 Coupons
- [ ] List coupons
- [ ] Create coupon:
  - [ ] Coupon code (unique)
  - [ ] Discount type: fixed or percentage
  - [ ] Usage limit (total and per customer)
  - [ ] Expiry date
- [ ] Track redemption count

---

## 9. UAE COMPLIANCE REQUIREMENTS

- [ ] Tax Inclusive Pricing mode — all displayed prices include VAT
- [ ] System warning banner if tax-inclusive pricing is NOT enabled
- [ ] Arabic language support on receipts and UI
- [ ] VAT breakdown on receipts
- [ ] Tax groups configurable per product

---

## 10. MULTI-BRANCH ARCHITECTURE

These behaviors must work across multiple branches:
- [ ] All reports filterable by branch
- [ ] Inventory tracked separately per branch and per warehouse
- [ ] Menu can differ per branch (products active/inactive per branch)
- [ ] Payment methods configurable per branch
- [ ] Kitchen flows assigned to specific branches
- [ ] Delivery zones linked to specific branches
- [ ] Receipt settings configurable per branch
- [ ] Dashboard shows all-branch or single-branch view

---

## 11. SYSTEM / SETTINGS (inferred)

- [ ] Business settings (business name, logo, currency)
- [ ] Branch management (create/edit/delete branches, set reference codes)
- [ ] User management and roles (cashier, manager, admin)
- [ ] Shifts and till management
- [ ] Business days configuration
- [ ] Activity log for all system actions (audit trail)

---

## 12. AUDIT INSTRUCTIONS FOR CLAUDE CODE

When reading this document against the codebase, do the following:

1. **For each checkbox item**, search for corresponding models, API routes, UI components, or database schema.
2. **Mark each as**:
   - `EXISTS` — fully implemented
   - `PARTIAL` — exists but incomplete or missing fields
   - `MISSING` — not found in codebase
3. **For PARTIAL items**, describe what is missing.
4. **At the end**, produce a prioritized gap report:
   - **Critical gaps** — core POS functionality that is missing
   - **Important gaps** — operational features needed for a full system
   - **Nice to have** — advanced features that can be built later
5. **Do not assume** a feature exists just because a related feature exists. Check explicitly.
6. **Check both backend and frontend** — a feature may have an API but no UI, or a UI with no backend.

---

*Generated from Foodics POS dashboard analysis — February 2026*
