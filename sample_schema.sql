-- ============================================================
-- Corrected Schema
-- Changes from original:
--   1. Moved product_categories to the top (referenced by others)
--   2. Added missing `slug` column to product_categories
--   3. Fixed self-referencing FK: categories(id) → product_categories(id)
--   4. Removed trailing comma in product_variant_attributes
--   5. Fixed wrong FK target: variant_attributes(id) → product_variant_attributes(id)
--   6. Added category_id to product_variant_values PK + FK to
--      category_variant_attributes to scope attributes per category
-- ============================================================


-- 1. Categories (must come first — referenced by product_masters, category_variant_attributes)
CREATE TABLE product_categories (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    parent_id   BIGINT UNSIGNED NULL,
    name        VARCHAR(150) NOT NULL,
    slug        VARCHAR(200) NOT NULL,                   -- FIX: was missing, but referenced in UNIQUE KEY below
    PRIMARY KEY (id),

    UNIQUE KEY uq_categories_slug (slug),
    UNIQUE KEY uq_categories_parent_name (parent_id, name),

    KEY idx_categories_parent (parent_id),

    CONSTRAINT fk_categories_parent
        FOREIGN KEY (parent_id) REFERENCES product_categories(id)  -- FIX: was categories(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 2. Brands
CREATE TABLE product_brands (
    id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name    VARCHAR(150) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_brands_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 3. Models (belongs to a brand)
CREATE TABLE product_models (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    brand_id    BIGINT UNSIGNED NOT NULL,
    model_name  VARCHAR(150) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_models_brand_model (brand_id, model_name),
    KEY idx_product_models_brand (brand_id),
    CONSTRAINT fk_product_models_brand
        FOREIGN KEY (brand_id) REFERENCES product_brands(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 4. Product Masters (a model listed under a specific subcategory)
CREATE TABLE product_masters (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    model_id        BIGINT UNSIGNED NOT NULL,
    subcategory_id  BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_product_master_model
        FOREIGN KEY (model_id) REFERENCES product_models(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_product_master_subcategory
        FOREIGN KEY (subcategory_id) REFERENCES product_categories(id)  -- FIX: was product_categories(id) — already correct, retained
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 5. Product Variants (varying specs under a product master)
CREATE TABLE product_variants (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_master_id BIGINT UNSIGNED NOT NULL,
    variant_name      VARCHAR(150) NOT NULL,
    sku               VARCHAR(100) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_variants_sku (sku),
    KEY idx_variants_product (product_master_id),
    CONSTRAINT fk_variants_product
        FOREIGN KEY (product_master_id) REFERENCES product_masters(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 6. Variant Attribute Definitions (e.g. "Color", "RAM", "Weight")
CREATE TABLE product_variant_attributes (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    data_type   ENUM('text', 'number', 'boolean') NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_variant_attributes_name (name)  -- FIX: removed trailing comma
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 7. Which attributes apply to which category
CREATE TABLE category_variant_attributes (
    category_id          BIGINT UNSIGNED NOT NULL,
    variant_attribute_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (category_id, variant_attribute_id),
    CONSTRAINT fk_cva_category
        FOREIGN KEY (category_id) REFERENCES product_categories(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_cva_attribute
        FOREIGN KEY (variant_attribute_id) REFERENCES product_variant_attributes(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 8. Variant Attribute Values
--    FIX: Added category_id to PK and FK to category_variant_attributes.
--    This ensures:
--      - A variant can only store values for attributes valid in its category.
--      - A variant can hold different attribute sets per category
--        (e.g. same variant under "Gaming" and "Business" with different specs).
CREATE TABLE product_variant_values (
    variant_id            BIGINT UNSIGNED NOT NULL,
    category_id           BIGINT UNSIGNED NOT NULL,      -- FIX: added to scope attributes per category
    variant_attribute_id  BIGINT UNSIGNED NOT NULL,
    value_text            VARCHAR(255) NULL,
    value_number          DECIMAL(12,2) NULL,
    value_boolean         TINYINT(1) NULL,

    PRIMARY KEY (variant_id, category_id, variant_attribute_id),

    -- Enforces that only attributes valid for the given category can be stored
    CONSTRAINT fk_pvv_category_attribute
        FOREIGN KEY (category_id, variant_attribute_id)
        REFERENCES category_variant_attributes(category_id, variant_attribute_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_pvv_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
