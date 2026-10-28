INSERT INTO oauth_clients (platform, client_id, client_secret_enc, updated_at)
VALUES ($platform, $client_id, $client_secret_enc, $updated_at)
ON CONFLICT (platform) DO UPDATE SET
    client_id         = excluded.client_id,
    client_secret_enc = excluded.client_secret_enc,
    updated_at        = excluded.updated_at;
