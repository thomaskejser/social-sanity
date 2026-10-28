INSERT INTO company (company_id, company, website, notes, kudos, created_at, updated_at)
VALUES ((SELECT COALESCE(MAX(company_id), 0) + 1 FROM company), $company, $website, $notes, $kudos,
        $now, $now)
RETURNING company_id AS "companyId";
