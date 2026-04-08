Product Masters — MVP Documentation
Overview
The Product Masters page is the central catalog where you manage all your base products. A "product master" represents a general product (e.g., "Apple iPhone 16 Pro Max"), while "variants" represent the specific configurations you sell (e.g., 256GB Black, 512GB White).

1. Product Master List (Main Table)
What it shows:

A searchable, sortable table of all product masters in the system.
Each row shows the product name, category, subcategory, and how many variants exist.
What you can do:

Search by product name, SKU, model, brand, or category using the search bar.
Filter by variant count — show all products, only those with a single variant, or those with multiple variants.
Sort columns by clicking column headers (Name, Category, Variants).
Select products using checkboxes (used when generating variants).
Paginate through results if there are many products.

2. Adding a Product Master
How it works:

Click "Add Product Master" to open the creation form.
Fill in the required fields: Brand, Model, Category, Subcategory and Product Name.
The SKU (unique product code) is auto-generated based on the brand and model you pick.
The Product Name is also auto-suggested from the brand + model combination, but you can change it.
Optionally fill in: description, product image, and detailed technical specifications (display, camera, battery, connectivity, etc.).
If the brand or model you need doesn't exist yet, you can create a new brand or model right from the form without leaving the page.
The system checks for duplicates — you cannot create two product masters with the same brand + model combination.

3. Editing a Product Master
How it works:

Click the edit icon on any product row to open the same form, pre-filled with the existing data.
Make your changes and save. All fields are editable.

4. Viewing Product Specifications
How it works:

Click the eye icon on a product row to open a read-only view of the product's full details.
Shows: product image, name, SKU, brand, model, category, subcategory, description, and all technical specifications.

5. Generating Variants
What it does:

Automatically creates all possible variant combinations for a selected product master based on the options you choose.
How it works:

Select a product and click the "Generate Variants" (magic wand) icon.
Choose the RAM sizes, storage sizes, colors, and conditions (Brand New / Certified Pre-Owned) you want.
For computer products (laptops, desktops, etc.), additional fields appear: CPU, GPU, RAM type, ROM type, operating system, and screen.
The system shows a preview of how many variants will be created.
Click "Generate Variants" — the system creates all combinations, skipping any that already exist.
A progress indicator shows the creation status.
Each variant gets an auto-generated SKU and name. Pre-owned variants get a "CPO-" prefix on their SKU.
6. Viewing & Managing Variants
How it works:

Click the variant count badge on a product row to view all its variants.
A searchable, paginated list shows each variant's SKU, specifications (as tags), name, and condition.
Edit a variant — click the pencil icon to update its name, SKU, condition, or any attribute (color, RAM, storage, model code, CPU, GPU, etc.). The SKU auto-updates when you change attributes.
Delete a variant — click the trash icon. A confirmation prompt appears before deletion.
7. Importing Products
There are three import methods available:

a) CSV Import (Product Masters Only)
Upload a CSV file with at least Brand and Model columns. Category and Subcategory are optional.
A downloadable template is provided.
The system validates the file, checks for missing columns, deduplicates against existing products, and creates new product masters in bulk.
After import, a summary shows how many were created, skipped, or failed, and lists any new brands that were auto-created.
c) Full Export / Import (Masters + Variants)
Export: Downloads all product masters and their variants as a single CSV file.
Import: Upload a CSV (using the exported format or a template) to bulk-create or update product masters and their variants. Existing products matched by SKU are updated; new ones are created. New brands and categories are auto-created as needed.
A summary shows: masters created/updated, variants created/updated, new brands/categories created, and any errors.

Key Business Rules
Duplicate prevention: You cannot have two product masters with the same brand + model.
Auto-generated SKUs: Product master SKUs follow the format BRAND-MODEL. Variant SKUs extend this with RAM, storage, and color info.
Certified Pre-Owned (CPO): Pre-owned variants get a "CPO-" prefix on their SKU to distinguish them from brand-new stock.
Computer detection: If a product's category or subcategory contains keywords like "laptop", "desktop", or "computer", the variant generation form automatically shows extra specification fields (CPU, GPU, etc.).
Variant deduplication: When generating variants, any combination that already exists (matched by SKU) is automatically skipped.