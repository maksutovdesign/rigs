-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('owner', 'manager', 'staff');

-- CreateEnum
CREATE TYPE "TeamMemberStatus" AS ENUM ('pending', 'active', 'removed');

-- AlterTable: add relations columns to users (no-op if already present)
-- The businessProfile and teamMemberships are Prisma-level relations,
-- FK constraints are on the child tables.

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "inn" TEXT,
    "legal_address" TEXT,
    "contact_email" TEXT,
    "website" TEXT,
    "description" TEXT,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "member_id" TEXT,
    "email" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'staff',
    "status" "TeamMemberStatus" NOT NULL DEFAULT 'pending',
    "invite_token" TEXT,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joined_at" TIMESTAMP(3),

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_invoices" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "business_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_user_id_key" ON "business_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_invite_token_key" ON "team_members"("invite_token");

-- CreateIndex
CREATE INDEX "team_members_owner_id_idx" ON "team_members"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_invoices_number_key" ON "business_invoices"("number");

-- CreateIndex
CREATE INDEX "business_invoices_profile_id_idx" ON "business_invoices"("profile_id");

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_invoices" ADD CONSTRAINT "business_invoices_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
