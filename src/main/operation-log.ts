import type { PrismaClient } from '@prisma/client';
import { getSettingValue } from './auth-settings';

const DEFAULT_OPERATION_ACTOR = 'admin';

type OperationLogPayload = {
  operationType: string;
  experimentId?: number | null;
  actor?: string | null;
  summary: string;
};

export async function getOperationActor(prisma: PrismaClient) {
  return getSettingValue(prisma, 'loginUsername', DEFAULT_OPERATION_ACTOR);
}

export async function writeOperationLog(
  prisma: PrismaClient,
  payload: OperationLogPayload
) {
  return prisma.operationLog.create({
    data: {
      operationType: payload.operationType,
      experimentId: payload.experimentId ?? null,
      actor: payload.actor ?? null,
      summary: payload.summary
    }
  });
}
