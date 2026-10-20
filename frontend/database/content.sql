-- Site content: banners, pages, contact inbox, uploads, site settings. Safe to run more than once.
CREATE TABLE IF NOT EXISTS banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL DEFAULT '',
  subtitle VARCHAR(255) NOT NULL DEFAULT '',
  image_url VARCHAR(500) NOT NULL,
  link_url VARCHAR(500) NOT NULL DEFAULT '',
  button_label VARCHAR(40) NOT NULL DEFAULT '',
  placement ENUM('home','category','both') NOT NULL DEFAULT 'home',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  show_in_footer TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  subject VARCHAR(150) NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  ip VARCHAR(64) NOT NULL DEFAULT '',
  status ENUM('new','read') NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contact_status (status),
  INDEX idx_contact_ip (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS uploads (
  id CHAR(36) NOT NULL PRIMARY KEY,
  storage_path VARCHAR(300) NOT NULL UNIQUE,
  original_name VARCHAR(255) NOT NULL DEFAULT '',
  content_type VARCHAR(100) NOT NULL,
  size_bytes INT NOT NULL,
  uploader_id CHAR(36) NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO settings (setting_key, value) VALUES
  ('default_glow', 'orange'),
  ('site_tagline', 'Digital goods from trusted sellers. Your money is held until you get your item.'),
  ('logo_url', ''),
  ('favicon_url', ''),
  ('contact_email', 'support@juj.gg'),
  ('contact_phone', ''),
  ('contact_address', ''),
  ('social_links', '');

INSERT IGNORE INTO pages (slug, title, body, sort_order) VALUES
  ('about', 'About us', 'JUJ is a marketplace for digital goods: game currency, gift cards, keys and subscriptions.\n\n## How we protect you\nYour payment is held by the platform until you confirm you received your item.', 1),
  ('terms', 'Terms of service', 'By using JUJ you agree to these terms.\n\n## Orders\nOrders are completed after delivery is confirmed or automatically after the protection period.', 2),
  ('privacy', 'Privacy policy', 'We only store the data needed to process your orders and keep your account secure.\n\n## Contact\nWrite to us through the contact page for any privacy question.', 3);

INSERT INTO banners (title, subtitle, image_url, link_url, button_label, placement, sort_order)
SELECT * FROM (
  SELECT 'Level up for less' AS title, 'Game currency, keys and top-ups delivered instantly.' AS subtitle,
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600' AS image_url, '/search?q=' AS link_url, 'Shop now' AS button_label, 'both' AS placement, 1 AS sort_order
  UNION ALL
  SELECT 'Gift cards for everyone', 'Send the perfect gift in seconds.',
    'https://images.pexels.com/photos/5926431/pexels-photo-5926431.jpeg?auto=compress&cs=tinysrgb&w=1600', '/search?q=gift', 'Browse gift cards', 'home', 2
) seed WHERE NOT EXISTS (SELECT 1 FROM banners);
