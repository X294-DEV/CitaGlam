INSERT INTO "SubscriptionPackage" (id, name, description, price, interval, limits, features, "updatedAt") 
VALUES 
('pk_basic', 'Básico', 'Ideal para negocios individuales.', 199.0, 'monthly', '{"maxServices": 5, "maxBranches": 1}'::jsonb, '{"canWhatsApp": false}'::jsonb, NOW()),
('pk_std', 'Estándar', 'Para locales establecidos.', 449.0, 'monthly', '{"maxServices": 99, "maxBranches": 3}'::jsonb, '{"canWhatsApp": true}'::jsonb, NOW())
ON CONFLICT (name) DO NOTHING;
