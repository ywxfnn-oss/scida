-- CreateTable
CREATE TABLE "Experiment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "testProject" TEXT NOT NULL,
    "sampleCode" TEXT NOT NULL,
    "tester" TEXT NOT NULL,
    "instrument" TEXT NOT NULL,
    "testTime" TEXT NOT NULL,
    "sampleOwner" TEXT,
    "displayName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExperimentCustomField" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "experimentId" INTEGER NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldValue" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExperimentCustomField_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExperimentDataItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "experimentId" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemValue" TEXT NOT NULL,
    "itemUnit" TEXT,
    "sourceFileName" TEXT,
    "sourceFilePath" TEXT,
    "originalFileName" TEXT,
    "originalFilePath" TEXT,
    "rowOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExperimentDataItem_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
