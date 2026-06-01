import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { entityRegistryChannels } from "@features/entity-registry/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "entity-registry",
    namespace: "entityRegistry",
    methods: [
      {
        method: "createEntity",
        channel: entityRegistryChannels.createEntity,
        permission: "restricted"
      },
      {
        method: "listEntities",
        channel: entityRegistryChannels.listEntities,
        permission: "public"
      },
      {
        method: "getEntityDetails",
        channel: entityRegistryChannels.getEntityDetails,
        permission: "public"
      },
      {
        method: "updateEntity",
        channel: entityRegistryChannels.updateEntity,
        permission: "restricted"
      },
      {
        method: "deleteEntity",
        channel: entityRegistryChannels.deleteEntity,
        permission: "restricted"
      },
      {
        method: "createOwnershipRelation",
        channel: entityRegistryChannels.createOwnershipRelation,
        permission: "restricted"
      },
      {
        method: "updateOwnershipRelation",
        channel: entityRegistryChannels.updateOwnershipRelation,
        permission: "restricted"
      },
      {
        method: "deleteOwnershipRelation",
        channel: entityRegistryChannels.deleteOwnershipRelation,
        permission: "restricted"
      },
      {
        method: "createAccount",
        channel: entityRegistryChannels.createAccount,
        permission: "restricted"
      },
      {
        method: "updateAccount",
        channel: entityRegistryChannels.updateAccount,
        permission: "restricted"
      },
      {
        method: "deleteAccount",
        channel: entityRegistryChannels.deleteAccount,
        permission: "restricted"
      },
      {
        method: "listAccounts",
        channel: entityRegistryChannels.listAccounts,
        permission: "public"
      },
      {
        method: "listOwnerships",
        channel: entityRegistryChannels.listOwnerships,
        permission: "public"
      }
    ]
  };
}
