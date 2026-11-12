-- Backstop for atomic credit spends: the balance can never go negative, even if app code regresses.
ALTER TABLE "User" ADD CONSTRAINT "User_creditsBalance_nonneg" CHECK ("creditsBalance" >= 0);
