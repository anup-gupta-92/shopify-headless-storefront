# Apex analytics schema contract

This document defines the initial event and storage contract for the future
first-party analytics collector. It does not enable collection by itself.

## Retention and session semantics

- `analytics_sessions` and `analytics_events`: approximately 90 days.
- `analytics_consent_daily`: longer retention is acceptable because it contains
  only anonymous daily aggregate counts.
- `analytics_rollups`: long-term aggregate retention.
- `visitor_id`: a random first-party identifier generated only after analytics
  consent and persisted across consented visits.
- `session_id`: shared across tabs where practical and renewed after 30 minutes
  of inactivity.
- Withdrawing analytics consent must stop collection, clear queued events, and
  remove or suppress analytics identifiers.

No table stores raw IP addresses, raw user-agent strings, raw advertising click
IDs, Shopify cart IDs, checkout URLs, customer IDs, email addresses, or postal
addresses.

## Stable behavioural events

- `session_started`
- `page_view`
- `product_view`
- `catalog_view`
- `search_performed`
- `add_to_cart`
- `remove_from_cart`
- `cart_opened`
- `cart_quantity_changed`
- `checkout_started`
- `bulk_order_interaction`
- `purchase_option_changed`
- `theme_changed`
- `pwa_install_prompt_shown`
- `pwa_install_clicked`
- `pwa_install_dismissed`
- `pwa_installed`
- `pwa_launched_standalone`

`cookie_consent_changed` is not a behavioural event for rejected visitors.
Consent decisions are incremented directly in `analytics_consent_daily` without
a session or visitor identifier.

## Stable source surfaces

- `homepage_category`
- `homepage_best_sellers`
- `shop`
- `collection`
- `search_results`
- `header_search`
- `product_page`
- `recommendations`
- `bulk_table`
- `cart_drawer`
- `cart_page`
- `buy_again`
- `header`
- `site`

Event names and source surfaces are intentionally validated by the future
ingestion endpoint rather than database lookup tables. This keeps the storage
model flexible while retaining one authoritative server-side allowlist.

## Enum-like session values

- `device_type`: `desktop`, `mobile`, `tablet`, `unknown`
- `initial_theme`, `current_theme`: `light`, `dark`
- `theme_source`: `default_system`, `stored_system`, `stored_explicit`
- `acquisition_channel`: `direct`, `organic_search`, `paid_search`,
  `google_shopping`, `google_merchant`, `ai_referral`, `referral`, `email`,
  `social`, `unknown`
- `click_id_type`: `gclid`, `gbraid`, `wbraid`, `srsltid`, `multiple`
- `analytics_consent_status`: `granted`, `withdrawn`

## Money and event properties

All monetary values use integer minor currency units. For example, GBP 3.99 is
stored as `399`, never as SQLite `REAL`.

`properties_json` is reserved for event-specific properties and must be a JSON
object. Commonly queried fields remain normal columns. Expected shapes include:

- `search_performed`: `{"query":"grey mailing bags","result_count":24}`
- `theme_changed`: `{"from":"dark","to":"light","trigger":"header_toggle"}`
- Subscription `add_to_cart`: `purchase_type`, `selling_plan_id`,
  `selling_plan_name`
- Bulk `add_to_cart`: `bulk_mode`, `selected_physical_quantity`,
  `shopify_line_quantity`, `resolved_line_count`, `estimated_saving`,
  `pack_saving`

The future ingestion endpoint should accept only known properties, cap the
serialized properties object at 4 KiB, cap committed search queries at 200
Unicode characters, trim whitespace/control characters, and reject malformed
JSON. It must record only committed searches, never individual keystrokes.

## Foreign keys

`analytics_events.session_id` references `analytics_sessions.session_id` with
`ON DELETE CASCADE`. The future ingestion batch must insert a session before its
events. Cascading deletion makes detailed-retention cleanup deterministic and
prevents orphan events.

## Daily consent aggregation

Daily buckets are deliberately used instead of hourly buckets. Daily counts are
sufficient for consent-rate trends, disclose less timing information, require
fewer rows, and simplify long-term retention. Hourly aggregation should only be
introduced later if there is a concrete operational need.
