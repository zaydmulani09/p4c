-- Add generated weight columns to enable correct native sorting of logical ENUM strings

-- 1. Books: Condition Weight
ALTER TABLE books ADD COLUMN condition_weight int GENERATED ALWAYS AS (
  CASE condition
    WHEN 'New' THEN 1
    WHEN 'Good' THEN 2
    WHEN 'Fair' THEN 3
    WHEN 'Poor' THEN 4
    ELSE 99
  END
) STORED;

-- 2. Books: Age Range Weight
ALTER TABLE books ADD COLUMN age_weight int GENERATED ALWAYS AS (
  CASE age_range
    WHEN '0-3' THEN 1
    WHEN '4-6' THEN 2
    WHEN '7-9' THEN 3
    WHEN '10-12' THEN 4
    WHEN '13+' THEN 5
    WHEN 'All Ages' THEN 6
    ELSE 99
  END
) STORED;

-- 3. Organizations: Pipeline Status Weight
ALTER TABLE organizations ADD COLUMN status_weight int GENERATED ALWAYS AS (
  CASE current_status
    WHEN 'Not Contacted' THEN 1
    WHEN 'Researching' THEN 2
    WHEN 'Initial Outreach Sent' THEN 3
    WHEN 'Follow-Up Sent' THEN 4
    WHEN 'Awaiting Response' THEN 5
    WHEN 'Contacted' THEN 6
    WHEN 'Interested' THEN 7
    WHEN 'In Progress' THEN 8
    WHEN 'Meeting Scheduled' THEN 9
    WHEN 'Partnership Established' THEN 10
    WHEN 'Not Interested' THEN 11
    WHEN 'Closed' THEN 12
    ELSE 99
  END
) STORED;
