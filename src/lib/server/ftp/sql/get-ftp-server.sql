SELECT id,
       protocol,
       host,
       port,
       username,
       password_env_var     AS "passwordEnvVar",
       encryption,
       host_key_fingerprint AS "hostKeyFingerprint",
       remote_dir           AS "remoteDir",
       public_url           AS "publicUrl",
       last_tested_at       AS "lastTestedAt",
       last_test_ok         AS "lastTestOk",
       last_test_message    AS "lastTestMessage",
       updated_at           AS "updatedAt"
FROM ftp_server
WHERE id = 1;
