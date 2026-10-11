-- pg-mem: skip
-- Trigram indexes make ILIKE '%term%' searches (website inquiries, product search) use an index instead of a table scan.
create extension if not exists pg_trgm;
create index if not exists idx_inquiries_name_trgm    on inquiries using gin (name gin_trgm_ops);
create index if not exists idx_inquiries_email_trgm   on inquiries using gin (email gin_trgm_ops);
create index if not exists idx_inquiries_company_trgm on inquiries using gin (company gin_trgm_ops);
create index if not exists idx_products_name_trgm     on products using gin (name gin_trgm_ops);
create index if not exists idx_employees_name_trgm    on employees using gin (name gin_trgm_ops);
-- Containment queries on the JSON documents (e.g. data @> '{"status":"Active"}')
create index if not exists idx_products_data_gin      on products using gin (data jsonb_path_ops);
