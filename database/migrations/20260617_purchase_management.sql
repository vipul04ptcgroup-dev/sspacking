-- Purchase Management schema for a future relational database layer.
-- This repo currently stores products and inventory in Firebase Firestore,
-- so there is no existing SQL `products` table to reference yet.
-- Because of that, `purchase_items.product_id` is indexed for lookup but does
-- not declare an executable foreign key in this migration.

START TRANSACTION;

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  supplier_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255) NULL,
  mobile VARCHAR(20) NULL,
  email VARCHAR(255) NULL,
  address TEXT NULL,
  gst_number VARCHAR(50) NULL,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_suppliers_name (supplier_name),
  KEY idx_suppliers_status (status),
  KEY idx_suppliers_mobile (mobile),
  KEY idx_suppliers_email (email),
  KEY idx_suppliers_gst_number (gst_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_number VARCHAR(100) NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  purchase_date DATE NOT NULL,
  total_qty DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
  remarks TEXT NULL,
  created_by VARCHAR(191) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_purchases_purchase_number (purchase_number),
  KEY idx_purchases_supplier_id (supplier_id),
  KEY idx_purchases_purchase_date (purchase_date),
  KEY idx_purchases_created_by (created_by),
  CONSTRAINT fk_purchases_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_id BIGINT UNSIGNED NOT NULL,
  product_id VARCHAR(191) NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_purchase_items_purchase_id (purchase_id),
  KEY idx_purchase_items_product_id (product_id),
  KEY idx_purchase_items_purchase_product (purchase_id, product_id),
  CONSTRAINT fk_purchase_items_purchase
    FOREIGN KEY (purchase_id) REFERENCES purchases (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
