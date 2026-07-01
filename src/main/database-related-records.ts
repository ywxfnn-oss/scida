import type { PrismaClient } from '@prisma/client';
import type { ExperimentListItem, RelatedExperimentRecords } from '../electron-api';

const RELATED_RECORD_LIMIT = 8;

function mapExperimentListItem(value: {
  id: number;
  testProject: string;
  sampleCode: string;
  tester: string;
  instrument: string;
  testTime: string;
  sampleOwner: string | null;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}): ExperimentListItem {
  return {
    id: value.id,
    testProject: value.testProject,
    sampleCode: value.sampleCode,
    tester: value.tester,
    instrument: value.instrument,
    testTime: value.testTime,
    sampleOwner: value.sampleOwner,
    displayName: value.displayName,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString()
  };
}

async function listRelatedByField(
  prisma: PrismaClient,
  experimentId: number,
  field: 'testProject' | 'sampleCode' | 'tester',
  value: string
) {
  if (!value.trim()) {
    return [];
  }

  const records = await prisma.experiment.findMany({
    where: {
      [field]: value,
      NOT: {
        id: experimentId
      }
    },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: RELATED_RECORD_LIMIT
  });

  return records.map((record) => mapExperimentListItem(record));
}

export async function listRelatedExperimentRecords(
  prisma: PrismaClient,
  experimentId: number
): Promise<RelatedExperimentRecords> {
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    select: {
      id: true,
      testProject: true,
      sampleCode: true,
      tester: true
    }
  });

  if (!experiment) {
    return {
      sameProject: [],
      sameSampleCode: [],
      sameTester: []
    };
  }

  const [sameProject, sameSampleCode, sameTester] = await Promise.all([
    listRelatedByField(prisma, experiment.id, 'testProject', experiment.testProject),
    listRelatedByField(prisma, experiment.id, 'sampleCode', experiment.sampleCode),
    listRelatedByField(prisma, experiment.id, 'tester', experiment.tester)
  ]);

  return {
    sameProject,
    sameSampleCode,
    sameTester
  };
}
