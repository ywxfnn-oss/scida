-- CreateTable
CREATE TABLE "EditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "experimentId" INTEGER NOT NULL,
    "editor" TEXT NOT NULL,
    "editReason" TEXT NOT NULL,
    "editedFieldsJson" TEXT NOT NULL,
    "editedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EditLog_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
