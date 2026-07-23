-- scripts/chapter_stats_rpc.sql

-- Optimized RPC to fetch chapter statistics in a single query
-- Solves the N+1 API scalability bottleneck on the Chapters page
CREATE OR REPLACE FUNCTION get_chapter_stats()
RETURNS TABLE (
  id uuid,
  name text,
  school text,
  city text,
  state text,
  status text,
  founded_date date,
  lead_user_id uuid,
  created_at timestamptz,
  lead_name text,
  books_distributed integer,
  partnerships integer,
  org_count integer,
  book_count integer,
  dist_count integer,
  last_activity timestamptz
) AS $$
BEGIN
  RETURN QUERY
  WITH dist_stats AS (
    SELECT d.chapter_id, SUM(d.quantity)::integer AS books_distributed, COUNT(d.id)::integer AS dist_count
    FROM distributions d
    GROUP BY d.chapter_id
  ),
  org_stats AS (
    SELECT o.chapter_id, 
           COUNT(o.id)::integer AS org_count, 
           COUNT(o.id) FILTER (WHERE o.current_status = 'Partnership Established')::integer AS partnerships,
           MAX(o.created_at) AS last_org_activity
    FROM organizations o
    GROUP BY o.chapter_id
  ),
  book_stats AS (
    SELECT b.chapter_id, 
           SUM(b.quantity)::integer AS book_count,
           MAX(b.created_at) AS last_book_activity
    FROM books b
    GROUP BY b.chapter_id
  )
  SELECT 
    c.id,
    c.name,
    c.school,
    c.city,
    c.state,
    c.status,
    c.founded_date,
    c.lead_user_id,
    c.created_at,
    COALESCE(u.full_name, '—') AS lead_name,
    COALESCE(ds.books_distributed, 0) AS books_distributed,
    COALESCE(os.partnerships, 0) AS partnerships,
    COALESCE(os.org_count, 0) AS org_count,
    COALESCE(bs.book_count, 0) AS book_count,
    COALESCE(ds.dist_count, 0) AS dist_count,
    GREATEST(os.last_org_activity, bs.last_book_activity) AS last_activity
  FROM chapters c
  LEFT JOIN users u ON u.id = c.lead_user_id
  LEFT JOIN dist_stats ds ON ds.chapter_id = c.id
  LEFT JOIN org_stats os ON os.chapter_id = c.id
  LEFT JOIN book_stats bs ON bs.chapter_id = c.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
