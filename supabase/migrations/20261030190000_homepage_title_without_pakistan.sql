-- Handover 61 Part 8.2: the homepage title no longer says Pakistan. It was
-- the single biggest location signal, and the site serves clients
-- worldwide. The footer still says where the company is based.
update public.page_seo set title = 'Online Skin Assessment, Read by Hand', updated_at = now()
 where path = '/' and title = 'Online Skin Assessment Pakistan, Read by Hand';
