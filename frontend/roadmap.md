# Roadmap

- [x] Strengthen orange, blue, and yellow saturation and make dust more visible above text and images.
- [x] Bring dust in front and add a persistent green/orange/yellow/blue glow icon selector; checked all choices and mobile layout.
- [x] Add drifting dust, fading background, and stronger button glow; verified desktop/mobile rendering without runtime errors.
- [x] Admin panel: dashboard stats, users & sellers (suspend/ban, verify sellers), offers (publish/pause/archive), categories (create/edit), orders (cancel/refund placeholders); admin-only server functions + RLS; orders/payments/coupons schema created.
- [ ] Enable Stripe test payments. Blocked: built-in payments requires a paid plan; alternatively the user must explicitly choose their own Stripe test account.
- [ ] Implement secure checkout, 15-minute reservations and expiry job, coupons, fees, and order storage after payment setup.
- [ ] Implement verified idempotent payment webhooks, transactional encrypted code delivery, and refunds.
- [ ] Implement private buyer/guest order pages, reveal auditing, purchase history, and test email notifications.
- [ ] Implement seller manual delivery with status filters and 12-hour deadlines.
- [ ] Test pricing, reservation expiry, webhook idempotency, double-delivery prevention, and both purchase flows.
