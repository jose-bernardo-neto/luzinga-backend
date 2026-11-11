import type { BiometricOwnerType } from "@luzinga/contracts";

export interface BiometricOwnerAccessPort {
  assertCanManage(
    ownerType: BiometricOwnerType,
    ownerId: string,
    actorId: string,
  ): Promise<void>;
}
