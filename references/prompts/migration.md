# Server-Driven Migration Prompt

Migrate the current page implementation to a fully server-driven architecture while keeping it fully compatible with the existing **Laravel + Inertia + React** tech stack.

---

# Core Requirements

* Maintain full compatibility with the current stack:

  * **Laravel** for backend logic
  * **Inertia.js** for server-client delivery
  * **React** for frontend rendering
* Use **server-side table joins** instead of any client-side array joins or client-side data merging.
* Move **all calculations** to the server. No business logic, aggregation, derived values, totals, or computed fields should be calculated in the client unless purely presentational.
* Move **all functional data operations** to the server, including:

  * searching
  * sorting
  * filtering
  * pagination
  * export to CSV
  * data transformation
  * conditional query logic
* Do **not** change the overall UI/UX, layout, interaction flow, visual structure, styling behavior, or component arrangement of the page.
* Preserve the current user experience so that the migration behaves like a backend refactor rather than a redesign.

---

# Additional Context

* The current implementation performs part of the data processing on the client side, which causes scalability, maintainability, and consistency issues.
* The goal of this migration is to make the page reliable for large datasets and aligned with proper backend-driven data handling practices.
* The frontend should only be responsible for:

  * rendering server-provided data
  * sending query parameters
  * handling user interactions
  * displaying loading states
  * displaying empty states
  * displaying error states
* The frontend must **not**:

  * reconstruct relational data
  * perform joins
  * compute final business values
  * perform dataset aggregation

---

# Backend Expectations

* Build data retrieval using optimized **Laravel Query Builder / Eloquent** queries.
* Use proper **joins, filters, sorting, and pagination**.
* Centralize query logic where practical for reuse and maintainability.
* Return only necessary shaped data to minimize payload size.
* Prevent **N+1 query issues** using eager loading or joins.
* Keep response structure predictable and easy for React to consume.
* CSV export must use the **same server-side filter/search/sort conditions** as the table.
* Validate and sanitize all incoming parameters:

  * search
  * filters
  * sort
  * direction
  * pagination
* Return pagination metadata:

  * page
  * per_page
  * total
  * last_page

---

# Frontend Expectations

* Keep the existing page design and interaction model unchanged.
* Consume server-provided props via **Inertia**.
* Table actions must trigger server requests:

  * search
  * filter
  * sort
  * pagination
  * export
* Preserve existing component structure.
* Avoid unnecessary frontend state complexity.
* Server should be the **single source of truth**.
* Maintain current:

  * loading states
  * empty states
  * error states

---

# Performance and Maintainability

* Optimize for **large datasets**.
* Prioritize separation of concerns:

  * backend handles data logic
  * frontend handles presentation
* Avoid duplicated logic between frontend and backend.
* Ensure queries are indexed appropriately.
* Keep implementation consistent with **Laravel + Inertia best practices**.
* Ensure solution is easy to extend with:

  * additional filters
  * additional columns
  * additional joins
  * additional exports

---

# Non-Negotiable Constraints

* No UI redesign
* No client-side joins
* No client-side business calculations
* No client-side searching
* No client-side sorting
* No client-side filtering
* No client-side pagination
* No client-side exporting
* No breaking changes to existing page behavior

---

# Desired Outcome

The final implementation should:

* Look identical to the current UI
* Behave identical to the current UX
* Be fully server-driven
* Support large relational datasets
* Be scalable
* Be maintainable
* Be cleanly separated between frontend and backend
