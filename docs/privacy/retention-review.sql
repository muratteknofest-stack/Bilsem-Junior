-- Read-only operational review. No deletion, export of identities or retention automation.
-- Run as an authorized operator. Thresholds are proposals, not live settings.
select kind, status, count(*) as request_count
from public.support_requests
group by kind, status
order by kind, status;

select count(*) filter (where status in ('open','reviewing')) as pending,
       count(*) filter (where status in ('open','reviewing') and created_at < now() - interval '7 days') as first_review_target_exceeded,
       count(*) filter (where status in ('open','reviewing') and created_at < now() - interval '30 days') as resolution_target_exceeded
from public.support_requests
where kind = 'deletion';

-- Account deletion must use the existing ownership-checked application workflow.
-- This file intentionally contains no DELETE, TRUNCATE, UPDATE or schedule commands.
