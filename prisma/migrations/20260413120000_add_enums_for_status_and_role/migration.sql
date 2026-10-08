-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Admin', 'Office', 'Worker');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('active', 'completed');

-- AlterTable: Convert User.role from text to UserRole enum (preserving data)
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'Worker';

-- AlterTable: Convert Order.status from text to OrderStatus enum (preserving data)
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::"OrderStatus";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'active';
