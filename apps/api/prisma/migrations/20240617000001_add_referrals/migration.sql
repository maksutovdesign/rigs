CREATE TABLE "referrals" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "referrer_id" TEXT NOT NULL REFERENCES "users"("id"),
  "referee_id" TEXT REFERENCES "users"("id"),
  "code" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "bonus_amount" DECIMAL(10,2) NOT NULL DEFAULT 500,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3)
);
