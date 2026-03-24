import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type {
  ActionResult,
  AddDictionaryItemPayload,
  AddDictionaryItemResult,
  DictionaryItem,
  DictionaryItemsByType,
  DictionaryType,
  ListDictionaryItemsPayload
} from '../electron-api';

const DICTIONARY_TYPES: DictionaryType[] = ['testProject', 'tester', 'instrument'];

const DICTIONARY_SETTING_KEYS: Record<DictionaryType, string> = {
  testProject: 'dictionary:testProject',
  tester: 'dictionary:tester',
  instrument: 'dictionary:instrument'
};

function buildEmptyDictionaryItemsByType(): DictionaryItemsByType {
  return {
    testProject: [],
    tester: [],
    instrument: []
  };
}

function isDictionaryType(value: string): value is DictionaryType {
  return DICTIONARY_TYPES.includes(value as DictionaryType);
}

function sortDictionaryItemsNewestFirst(items: DictionaryItem[]) {
  return [...items].sort((left, right) => {
    const createdCompare = right.createdAt.localeCompare(left.createdAt);
    if (createdCompare !== 0) {
      return createdCompare;
    }

    return right.id.localeCompare(left.id);
  });
}

function parseStoredDictionaryItems(
  rawValue: string,
  dictionaryType: DictionaryType
): DictionaryItem[] {
  if (!rawValue.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortDictionaryItemsNewestFirst(
      parsed.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') {
          return [];
        }

        const candidate = entry as Record<string, unknown>;
        const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
        const type = typeof candidate.type === 'string' ? candidate.type : '';
        const value = typeof candidate.value === 'string' ? candidate.value.trim() : '';
        const isActive = candidate.isActive;
        const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : '';
        const updatedAt = typeof candidate.updatedAt === 'string' ? candidate.updatedAt : '';
        const deactivatedAt = candidate.deactivatedAt;

        if (
          !id ||
          type !== dictionaryType ||
          !value ||
          typeof isActive !== 'boolean' ||
          !createdAt ||
          !updatedAt ||
          !(typeof deactivatedAt === 'string' || deactivatedAt === null)
        ) {
          return [];
        }

        const normalizedDeactivatedAt = typeof deactivatedAt === 'string' ? deactivatedAt : null;

        return [
          {
            id,
            type: dictionaryType,
            value,
            isActive,
            createdAt,
            updatedAt,
            deactivatedAt: normalizedDeactivatedAt
          }
        ];
      })
    );
  } catch {
    return [];
  }
}

async function readDictionaryItemsByType(
  prisma: PrismaClient,
  dictionaryType: DictionaryType
): Promise<DictionaryItem[]> {
  const record = await prisma.appSetting.findUnique({
    where: { settingKey: DICTIONARY_SETTING_KEYS[dictionaryType] }
  });

  return parseStoredDictionaryItems(record?.settingValue || '', dictionaryType);
}

async function writeDictionaryItemsByType(
  prisma: PrismaClient,
  dictionaryType: DictionaryType,
  items: DictionaryItem[]
) {
  const sortedItems = sortDictionaryItemsNewestFirst(items);

  await prisma.appSetting.upsert({
    where: { settingKey: DICTIONARY_SETTING_KEYS[dictionaryType] },
    update: {
      settingValue: JSON.stringify(sortedItems)
    },
    create: {
      settingKey: DICTIONARY_SETTING_KEYS[dictionaryType],
      settingValue: JSON.stringify(sortedItems)
    }
  });

  return sortedItems;
}

export async function listDictionaryItems(
  prisma: PrismaClient,
  payload?: ListDictionaryItemsPayload
): Promise<DictionaryItemsByType> {
  const includeInactive = payload?.includeInactive === true;
  const entries = await Promise.all(
    DICTIONARY_TYPES.map(async (dictionaryType) => {
      const items = await readDictionaryItemsByType(prisma, dictionaryType);
      return [
        dictionaryType,
        includeInactive ? items : items.filter((item) => item.isActive)
      ] as const;
    })
  );

  const groupedItems = buildEmptyDictionaryItemsByType();

  for (const [dictionaryType, items] of entries) {
    groupedItems[dictionaryType] = items;
  }

  return groupedItems;
}

export async function addDictionaryItem(
  prisma: PrismaClient,
  payload: AddDictionaryItemPayload
): Promise<AddDictionaryItemResult> {
  if (!isDictionaryType(payload.type)) {
    return { success: false, error: '词典类型无效' };
  }

  const trimmedValue = payload.value.trim();
  if (!trimmedValue) {
    return { success: false, error: '请输入词典项内容' };
  }

  const existingItems = await readDictionaryItemsByType(prisma, payload.type);
  const activeDuplicate = existingItems.find((item) => item.isActive && item.value === trimmedValue);
  if (activeDuplicate) {
    return { success: false, error: '该词典项已存在' };
  }

  const inactiveMatch = existingItems.find((item) => !item.isActive && item.value === trimmedValue);
  const now = new Date().toISOString();

  if (inactiveMatch) {
    const nextItems = existingItems.map((item) =>
      item.id === inactiveMatch.id
        ? {
            ...item,
            isActive: true,
            updatedAt: now,
            deactivatedAt: null
          }
        : item
    );
    const savedItems = await writeDictionaryItemsByType(prisma, payload.type, nextItems);
    const reactivatedItem = savedItems.find((item) => item.id === inactiveMatch.id);

    return {
      success: true,
      item: reactivatedItem
    };
  }

  const nextItem: DictionaryItem = {
    id: randomUUID(),
    type: payload.type,
    value: trimmedValue,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deactivatedAt: null
  };

  await writeDictionaryItemsByType(prisma, payload.type, [nextItem, ...existingItems]);

  return {
    success: true,
    item: nextItem
  };
}

export async function deactivateDictionaryItem(
  prisma: PrismaClient,
  payload: { id: string }
): Promise<ActionResult> {
  const targetId = payload.id.trim();
  if (!targetId) {
    return { success: false, error: '词典项标识无效' };
  }

  for (const dictionaryType of DICTIONARY_TYPES) {
    const items = await readDictionaryItemsByType(prisma, dictionaryType);
    const targetItem = items.find((item) => item.id === targetId);

    if (!targetItem) {
      continue;
    }

    if (!targetItem.isActive) {
      return { success: true };
    }

    const now = new Date().toISOString();
    await writeDictionaryItemsByType(
      prisma,
      dictionaryType,
      items.map((item) =>
        item.id === targetId
          ? {
              ...item,
              isActive: false,
              updatedAt: now,
              deactivatedAt: now
            }
          : item
      )
    );

    return { success: true };
  }

  return { success: false, error: '词典项不存在或已不可用' };
}
