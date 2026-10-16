import { dptId } from '../../../knx-engineering/src/index.ts';
import type { VisualizationRoleBinding } from '../types.ts';

/** Different wire-format families on the selected GA cannot be resolved by ranking names. */
export function hasIncompatibleBindingDpts(binding: VisualizationRoleBinding): boolean {
  const families = new Set(binding.dpts.map((dpt) => dptId(dpt).split('.')[0]).filter(Boolean));
  return families.size > 1;
}
