-- Apex first-party analytics schema.
-- Timestamps are Unix epoch seconds. Monetary values are integer minor units.
-- Detailed sessions/events are intended for approximately 90 days of retention.
-- Consent aggregates and rollups may be retained longer.
--
-- Stable behavioural event names (validated by the future ingestion layer):
-- session_started, page_view, product_view, catalog_view, search_performed,
-- add_to_cart, remove_from_cart, cart_opened, cart_quantity_changed,
-- checkout_started, bulk_order_interaction, purchase_option_changed,
-- theme_changed, pwa_install_prompt_shown, pwa_install_clicked,
-- pwa_install_dismissed, pwa_installed, pwa_launched_standalone.
-- cookie_consent_changed is deliberately excluded from analytics_events;
-- anonymous consent decisions belong in analytics_consent_daily.
--
-- Stable source_surface values (validated by the future ingestion layer):
-- homepage_category, homepage_best_sellers, shop, collection, search_results,
-- header_search, product_page, recommendations, bulk_table, cart_drawer,
-- cart_page, buy_again, header, site.

PRAGMA foreign_keys = ON;

CREATE TABLE analytics_sessions (
  session_id TEXT NOT NULL PRIMARY KEY,
  visitor_id TEXT NOT NULL,

  started_at INTEGER NOT NULL CHECK (started_at >= 0),
  last_seen_at INTEGER NOT NULL CHECK (last_seen_at >= started_at),

  country_code TEXT CHECK (
    country_code IS NULL
    OR (length(country_code) = 2 AND country_code = upper(country_code))
  ),

  browser_name TEXT,
  browser_version_major TEXT,
  os_name TEXT,
  os_version_major TEXT,
  device_type TEXT CHECK (
    device_type IS NULL
    OR device_type IN ('desktop', 'mobile', 'tablet', 'unknown')
  ),
  language TEXT,

  landing_path TEXT,
  referrer_host TEXT,

  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  acquisition_channel TEXT CHECK (
    acquisition_channel IS NULL
    OR acquisition_channel IN (
      'direct',
      'organic_search',
      'paid_search',
      'google_shopping',
      'google_merchant',
      'ai_referral',
      'referral',
      'email',
      'social',
      'unknown'
    )
  ),

  has_click_id INTEGER NOT NULL DEFAULT 0 CHECK (has_click_id IN (0, 1)),
  click_id_type TEXT CHECK (
    click_id_type IS NULL
    OR click_id_type IN ('gclid', 'gbraid', 'wbraid', 'srsltid', 'multiple')
  ),

  is_pwa INTEGER NOT NULL DEFAULT 0 CHECK (is_pwa IN (0, 1)),

  initial_theme TEXT CHECK (initial_theme IS NULL OR initial_theme IN ('light', 'dark')),
  current_theme TEXT CHECK (current_theme IS NULL OR current_theme IN ('light', 'dark')),
  theme_source TEXT CHECK (
    theme_source IS NULL
    OR theme_source IN ('default_system', 'stored_system', 'stored_explicit')
  ),

  analytics_consent_status TEXT NOT NULL CHECK (
    analytics_consent_status IN ('granted', 'withdrawn')
  ),

  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),

  CHECK (
    (has_click_id = 0 AND click_id_type IS NULL)
    OR (has_click_id = 1 AND click_id_type IS NOT NULL)
  )
);

CREATE TABLE analytics_events (
  event_id TEXT NOT NULL PRIMARY KEY,
  session_id TEXT NOT NULL,

  event_name TEXT NOT NULL CHECK (length(event_name) BETWEEN 1 AND 64),
  occurred_at INTEGER NOT NULL CHECK (occurred_at >= 0),
  received_at INTEGER NOT NULL CHECK (received_at >= 0),

  page_path TEXT,
  page_type TEXT,
  source_surface TEXT,

  product_id TEXT,
  product_handle TEXT,
  variant_id TEXT,
  sku TEXT,

  quantity INTEGER CHECK (quantity IS NULL OR quantity >= 0),
  value_minor INTEGER CHECK (value_minor IS NULL OR value_minor >= 0),
  currency TEXT CHECK (
    currency IS NULL
    OR (length(currency) = 3 AND currency = upper(currency))
  ),

  properties_json TEXT CHECK (
    properties_json IS NULL
    OR (json_valid(properties_json) AND json_type(properties_json) = 'object')
  ),

  FOREIGN KEY (session_id)
    REFERENCES analytics_sessions(session_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE analytics_consent_daily (
  bucket_date TEXT NOT NULL CHECK (
    date(bucket_date) IS NOT NULL AND date(bucket_date) = bucket_date
  ),
  decision TEXT NOT NULL CHECK (decision IN ('accepted', 'rejected', 'custom')),
  analytics_allowed INTEGER NOT NULL CHECK (analytics_allowed IN (0, 1)),
  marketing_allowed INTEGER NOT NULL CHECK (marketing_allowed IN (0, 1)),
  action TEXT NOT NULL CHECK (action IN ('initial', 'changed')),
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= 0),

  PRIMARY KEY (
    bucket_date,
    decision,
    analytics_allowed,
    marketing_allowed,
    action
  )
);

CREATE TABLE analytics_rollups (
  bucket_date TEXT NOT NULL CHECK (
    date(bucket_date) IS NOT NULL AND date(bucket_date) = bucket_date
  ),
  metric_name TEXT NOT NULL CHECK (length(metric_name) BETWEEN 1 AND 128),
  dimension_type TEXT NOT NULL CHECK (length(dimension_type) BETWEEN 1 AND 128),
  dimension_value TEXT NOT NULL,
  count_value INTEGER NOT NULL DEFAULT 0 CHECK (count_value >= 0),
  value_minor INTEGER NOT NULL DEFAULT 0 CHECK (value_minor >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= 0),

  PRIMARY KEY (bucket_date, metric_name, dimension_type, dimension_value)
);

-- Session indexes support the initial dashboard breakdowns. Sessions are much
-- lower volume than events, so these dimensions are worth indexing directly.
CREATE INDEX idx_analytics_sessions_started_at
  ON analytics_sessions(started_at);
CREATE INDEX idx_analytics_sessions_visitor_started_at
  ON analytics_sessions(visitor_id, started_at);
CREATE INDEX idx_analytics_sessions_country_started_at
  ON analytics_sessions(country_code, started_at);
CREATE INDEX idx_analytics_sessions_acquisition_started_at
  ON analytics_sessions(acquisition_channel, started_at);
CREATE INDEX idx_analytics_sessions_browser_started_at
  ON analytics_sessions(browser_name, started_at);
CREATE INDEX idx_analytics_sessions_device_started_at
  ON analytics_sessions(device_type, started_at);
CREATE INDEX idx_analytics_sessions_initial_theme_started_at
  ON analytics_sessions(initial_theme, started_at);

-- Event indexes cover time-range, funnel, product, and source-surface reports.
CREATE INDEX idx_analytics_events_session_occurred_at
  ON analytics_events(session_id, occurred_at);
CREATE INDEX idx_analytics_events_name_occurred_at
  ON analytics_events(event_name, occurred_at);
CREATE INDEX idx_analytics_events_product_occurred_at
  ON analytics_events(product_id, occurred_at)
  WHERE product_id IS NOT NULL;
CREATE INDEX idx_analytics_events_surface_occurred_at
  ON analytics_events(source_surface, occurred_at)
  WHERE source_surface IS NOT NULL;
CREATE INDEX idx_analytics_events_occurred_at
  ON analytics_events(occurred_at);

-- The primary keys already begin with bucket_date. These reverse-order indexes
-- support decision/metric-first reports over date ranges.
CREATE INDEX idx_analytics_consent_decision_bucket_date
  ON analytics_consent_daily(decision, bucket_date);
CREATE INDEX idx_analytics_rollups_metric_bucket_date
  ON analytics_rollups(metric_name, bucket_date);
