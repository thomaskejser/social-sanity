INSERT INTO app_setting (app_setting, value)
VALUES ($app_setting, $value)
ON CONFLICT (app_setting) DO UPDATE SET value = excluded.value;
