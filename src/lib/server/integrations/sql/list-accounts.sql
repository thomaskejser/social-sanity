SELECT platform,
       external_id       AS "externalId",
       display_name      AS "displayName",
       access_token_enc  AS "accessTokenEnc",
       refresh_token_enc AS "refreshTokenEnc",
       expires_at        AS "expiresAt",
       scopes,
       connected_at      AS "connectedAt",
       refreshed_at      AS "refreshedAt"
FROM accounts
ORDER BY platform;
