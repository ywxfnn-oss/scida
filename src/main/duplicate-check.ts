import type { PrismaClient } from '@prisma/client';
import type {
  CheckDuplicateExperimentPayload,
  DuplicateExperimentCheckResult
} from '../electron-api';

const DUPLICATE_MATCH_LIMIT = 5;

export async function findLikelyDuplicateExperiments(
  prisma: PrismaClient,
  payload: CheckDuplicateExperimentPayload
): Promise<DuplicateExperimentCheckResult> {
  const matches = await prisma.experiment.findMany({
    where: {
      sampleCode: payload.sampleCode,
      testProject: payload.testProject,
      testTime: payload.testTime,
      ...(payload.excludeExperimentId
        ? {
            NOT: {
              id: payload.excludeExperimentId
            }
          }
        : {})
    },
    orderBy: [
      { updatedAt: 'desc' },
      { id: 'desc' }
    ],
    take: DUPLICATE_MATCH_LIMIT,
    select: {
      id: true,
      displayName: true,
      sampleCode: true,
      testProject: true,
      testTime: true,
      tester: true,
      instrument: true
    }
  });

  return {
    matches
  };
}
