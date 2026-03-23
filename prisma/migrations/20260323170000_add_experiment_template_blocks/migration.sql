-- CreateTable
CREATE TABLE "ExperimentTemplateBlock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "experimentId" INTEGER NOT NULL,
    "templateType" TEXT NOT NULL,
    "blockTitle" TEXT NOT NULL,
    "blockOrder" INTEGER NOT NULL,
    "metaJson" TEXT NOT NULL,
    "dataJson" TEXT NOT NULL,
    "sourceFileName" TEXT,
    "sourceFilePath" TEXT,
    "originalFileName" TEXT,
    "originalFilePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExperimentTemplateBlock_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentTemplateBlock_experimentId_templateType_blockTitle_key"
ON "ExperimentTemplateBlock"("experimentId", "templateType", "blockTitle");
