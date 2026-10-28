SELECT client_id         AS "clientId",
       client_secret_enc AS "clientSecretEnc"
FROM oauth_clients
WHERE platform = $platform;
