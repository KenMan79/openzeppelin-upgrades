export * from './compat';

import { UpgradesError } from '../error';
import { StorageLayout, getDetailedLayout } from './layout';
import { StorageOperation, StorageItem, StorageLayoutComparator } from './compare';
import { LayoutCompatibilityReport } from './report';
import { ValidationOptions, withValidationDefaults } from '../validate/overrides';
import { logNote, logWarning } from '../utils/log';

export function assertStorageUpgradeSafe(
  original: StorageLayout,
  updated: StorageLayout,
  unsafeAllowCustomTypes: boolean,
): void;

export function assertStorageUpgradeSafe(
  original: StorageLayout,
  updated: StorageLayout,
  opts: Required<ValidationOptions>,
): void;

export function assertStorageUpgradeSafe(
  original: StorageLayout,
  updated: StorageLayout,
  opts: Required<ValidationOptions> | boolean = false,
): void {
  if (typeof opts === 'boolean') {
    const unsafeAllowCustomTypes = opts;
    opts = withValidationDefaults({ unsafeAllowCustomTypes });
  }

  const originalDetailed = getDetailedLayout(original);
  const updatedDetailed = getDetailedLayout(updated);
  const comparator = new StorageLayoutComparator(opts.unsafeAllowCustomTypes, opts.unsafeAllowRenames);
  const report = comparator.compareLayouts(originalDetailed, updatedDetailed);

  if (comparator.hasAllowedUncheckedCustomTypes) {
    logWarning(`Potentially unsafe deployment`, [
      `You are using \`unsafeAllowCustomTypes\` to force approve structs or enums with missing data.`,
      `Make sure you have manually checked the storage layout for incompatibilities.`,
    ]);
  } else if (opts.unsafeAllowCustomTypes) {
    logNote(`\`unsafeAllowCustomTypes\` is no longer necessary. Structs are enums are automatically checked.\n`);
  }

  if (!report.pass) {
    throw new StorageUpgradeErrors(report);
  }
}

class StorageUpgradeErrors extends UpgradesError {
  constructor(readonly report: LayoutCompatibilityReport) {
    super(`New storage layout is incompatible`, () => report.explain());
  }
}

// Kept for backwards compatibility and to avoid rewriting tests
export function getStorageUpgradeErrors(
  original: StorageLayout,
  updated: StorageLayout,
  opts: ValidationOptions = {},
): StorageOperation<StorageItem>[] {
  try {
    assertStorageUpgradeSafe(original, updated, withValidationDefaults(opts));
  } catch (e) {
    if (e instanceof StorageUpgradeErrors) {
      return e.report.ops;
    } else {
      throw e;
    }
  }
  return [];
}
