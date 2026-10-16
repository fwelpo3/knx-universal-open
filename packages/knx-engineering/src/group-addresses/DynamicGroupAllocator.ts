export type DynamicAddress = {
  mainGroup: number;
  middleGroup: number;
  sub: number;
  middleSegmentIndex: number;
  mainSegmentIndex: number;
  startsMiddleGroup: boolean;
  startsMainGroup: boolean;
};

/**
 * Project-wide three-level GA allocator.
 *
 * This belongs to engineering policy, not KNX foundation: it decides how a
 * project consumes the legal KNX group-address space and intentionally keeps
 * 0/0/0 unused as a normal generated address.
 */
export class DynamicGroupAllocator {
  private nextFreeMain = 0;
  private currentMain: number | null = null;
  private nextFreeMiddle = 0;
  private currentMiddle: number | null = null;
  private nextSub = 0;
  private middleSegmentIndex = 0;
  private mainSegmentIndex = 0;
  private segmentHasAddress = false;
  private mainHasAddress = false;

  beginArea(preferredMain: number): void {
    const preferred = this.validMain(preferredMain) ? preferredMain : this.nextFreeMain;
    this.currentMain = Math.max(this.nextFreeMain, preferred);
    this.assertMainAvailable();
    this.nextFreeMiddle = 0;
    this.currentMiddle = null;
    this.mainSegmentIndex = 1;
    this.mainHasAddress = false;
  }

  beginLogicalGroup(preferredMiddle: number): void {
    this.assertAreaStarted();
    const preferred = this.validMiddle(preferredMiddle) ? preferredMiddle : this.nextFreeMiddle;
    const targetMiddle = Math.max(this.nextFreeMiddle, preferred);

    if (targetMiddle > 7) {
      this.openNextMain();
      this.currentMiddle = 0;
    } else {
      this.currentMiddle = targetMiddle;
    }

    this.middleSegmentIndex = 1;
    this.nextSub = this.firstSub();
    this.segmentHasAddress = false;
  }

  ensureCapacity(addressCount: number): boolean {
    if (this.currentMiddle === null || addressCount <= 0) return false;
    const remaining = 256 - this.nextSub;
    if (this.segmentHasAddress && addressCount <= 256 && remaining < addressCount) {
      this.openContinuationMiddle();
      return true;
    }
    return false;
  }

  allocateAddress(): DynamicAddress {
    this.assertLogicalGroupStarted();
    if (this.nextSub > 255) this.openContinuationMiddle();

    const startsMiddleGroup = !this.segmentHasAddress;
    const startsMainGroup = !this.mainHasAddress;
    const sub = this.nextSub++;
    this.segmentHasAddress = true;
    this.mainHasAddress = true;

    return {
      mainGroup: this.currentMain!,
      middleGroup: this.currentMiddle!,
      sub,
      middleSegmentIndex: this.middleSegmentIndex,
      mainSegmentIndex: this.mainSegmentIndex,
      startsMiddleGroup,
      startsMainGroup,
    };
  }

  endLogicalGroup(): void {
    if (this.currentMiddle !== null) this.nextFreeMiddle = this.currentMiddle + 1;
    this.currentMiddle = null;
    this.segmentHasAddress = false;
  }

  endArea(): void {
    if (this.currentMain !== null) this.nextFreeMain = this.currentMain + 1;
    this.currentMain = null;
    this.currentMiddle = null;
    this.segmentHasAddress = false;
    this.mainHasAddress = false;
  }

  private openContinuationMiddle(): void {
    if (this.currentMiddle === null) throw new Error('Keine logische Mittelgruppe gestartet.');
    if (this.currentMiddle >= 7) {
      this.openNextMain();
      this.currentMiddle = 0;
    } else {
      this.currentMiddle += 1;
    }
    this.middleSegmentIndex += 1;
    this.nextSub = this.firstSub();
    this.segmentHasAddress = false;
  }

  private openNextMain(): void {
    this.currentMain = (this.currentMain ?? -1) + 1;
    this.assertMainAvailable();
    this.nextFreeMiddle = 0;
    this.currentMiddle = null;
    this.mainSegmentIndex += 1;
    this.mainHasAddress = false;
  }

  private firstSub(): number {
    return this.currentMain === 0 && this.currentMiddle === 0 ? 1 : 0;
  }

  private validMain(value: number): boolean {
    return Number.isInteger(value) && value >= 0 && value <= 31;
  }

  private validMiddle(value: number): boolean {
    return Number.isInteger(value) && value >= 0 && value <= 7;
  }

  private assertAreaStarted(): void {
    if (this.currentMain === null) throw new Error('Kein Bereich für die GA-Vergabe gestartet.');
  }

  private assertLogicalGroupStarted(): void {
    this.assertAreaStarted();
    if (this.currentMiddle === null) throw new Error('Keine logische Mittelgruppe gestartet.');
  }

  private assertMainAvailable(): void {
    if (this.currentMain === null || this.currentMain > 31) {
      throw new Error('KNX-Gruppenadressraum 0/0/0 bis 31/7/255 ist vollständig belegt.');
    }
  }
}
