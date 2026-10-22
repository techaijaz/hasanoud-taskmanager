# Business overview — how Hasanoud runs today

Source: discussion with the business owner, October 2026. This records what was said; nothing here is assumed. Points not yet discussed are listed under **Open**.

## 1. Purchase

Bought from many vendors:

- **Attar** (perfume oils)
- **Packaging**: boxes, bottles, caps, sprayers, etc.
- **Printing material** that goes on bottles, caps and boxes (stickers)

## 2. Warehouse

- **One warehouse**, with separate sections: raw material, ready product.
- Ready products leave **only from the warehouse**, both for online orders and for the shop.

## 3. Production

Bottles are filled → cap → dipstick → sticker → **ready product**. Ready products move to the ready-product section. **Every ready product has a unique SKU.**

## 4. Online orders

- Website **hasanoud.com** on **Shopify**. Ads on Facebook, Instagram, Google, YouTube.
- Orders come **online** (website) and **offline** (WhatsApp).
- **Prepaid** payments are processed by **Gokwik** and **Razorpay**, which send remittances.
- **COD** money is sent by **Shiprocket** after delivery.
- **Vinculum** is connected to Shopify and Shiprocket. It is used to print invoices, shipping labels and shipping challans, and to cancel orders. **This stays in Vinculum. The platform will not do this for now; if ever, it comes last.**
- A **Google Sheet** is used to track orders.

## 5. Packing and shipping

- Invoice (Shopify) and shipping label (Shiprocket) are printed and sent to the **packaging department**.
- Products are picked per invoice. **Free samples / gifts** are added (samples are made as ready products). Carton size is chosen per order.
- Bubble wrap, butter paper, tape, ribbon are used; the shipping label is stuck and the parcel ships.
- Shiprocket status is checked **daily** and updated in the sheet.

## 6. Customer teams

- **Help center**: order status, replacements, customer problems.
- **WhatsApp sales team**: converts WhatsApp queries into sales.

## 7. Shop

- Currently **one shop**. Stock comes from the warehouse.
- Customers pay by **UPI or cash**, received directly.
- Bills are made from an **Excel format** and printed.

## 8. Returns and replacements

- **COD return (RTO)**: the ready product is added back to stock; its packaging is damaged and cannot be reused.
- **Replacement**: a new product is sent. Nothing from a replacement is restocked (a broken bottle spills and ruins the packaging).
- **Prepaid returns** happen, but rarely (about 1 in 1000).

## 9. Packaging consumables

- Bought in bulk (e.g. 10 bundles of tape, 1000 cartons of different sizes, 1000 butter paper, 10 bundles of ribbon).
- Issued **in chunks** to the packaging section (e.g. 1 bundle tape, 100 butter paper, 50 cartons, 1 ribbon).
- **Warehouse stock must show what is left.** Once issued to the packaging section, it counts as **used (expense)**. Stock inside the packaging section and per-order use are **not** tracked.

## 10. Money and accounts

- **Accounting stays in Tally.** If Tally allows, invoices may later be sent to Tally directly.
- The platform should give **one place to see** monthly income, expenses, etc. (MIS view), not do bookkeeping.
- **GST**: prices and bills include GST (HSN, rate, taxable value, tax). No separate GST filing feature.
- Settlement reports: **Gokwik, Razorpay: CSV. Shiprocket: CSV and API.**
- Today there is **no reconciliation** of how much Gokwik / Razorpay / Shiprocket deduct.

## 11. Problems today

- Shiprocket escalations are missed.
- Orders go missing.
- Orders stay in transit for many days.
- **Fake delivery attempts**: the customer says nobody came or called, but the status shows "delivery attempt failed". Mostly COD.
- Repeat customers often get the **same free sample** again. Repeat customers are identified by **phone or email**.

## 12. Features planned (as features of one platform)

1. Employee management *(first — see employee-management.md)*
2. Purchase and inventory with BOM and ready products
3. Vendor purchase
4. Expense and utilities manager
5. Accounts view (MIS) — accounting itself stays in Tally
6. GST included in prices and documents
7. Order manager (Shopify webhooks)
8. Order package and shipping status (Shiprocket API)
9. Shops: stock transfer, shop sales, shop income and expenses

## Open (to discuss before the related module)

- How money comes in, in detail (owner will explain later).
- Shop billing: POS at the counter or another method; future shops.
- Prepaid refunds: how money goes back to the customer.
- Replacement: should the damaged product be recorded (loss tracking)?
