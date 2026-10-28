-- Pin the SFTP host key on the first successful test; never overwrite an existing pin here.
UPDATE ftp_server
SET last_tested_at       = $tested_at,
    last_test_ok         = $ok,
    last_test_message    = $message,
    host_key_fingerprint = CASE
        WHEN $ok = 1 THEN COALESCE(host_key_fingerprint, $host_key_fingerprint)
        ELSE host_key_fingerprint
    END
WHERE id = 1;
