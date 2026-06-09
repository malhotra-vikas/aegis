-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "workosOrgId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "workosUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_workosOrgId_key" ON "Organization"("workosOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "User_workosUserId_key" ON "User"("workosUserId");

