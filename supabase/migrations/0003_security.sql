-- pg-mem: skip
-- The API server connects as the database owner (or service role) and enforces authentication itself.
-- Enabling row level security with no policies blocks the public PostgREST/anon key from reading any business data.
do $$
declare t text;
begin
  foreach t in array array['products','materials','warehouses','movements','suppliers','requirements','purchase_orders','plans','employees','attendance','leaves','buyers','countries','orders','activities','bom','kv','collection_order','meta','inquiries','users']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
