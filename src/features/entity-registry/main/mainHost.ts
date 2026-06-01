import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { entityRegistryChannels } from "@features/entity-registry/contracts";
import type { EntityType, UpdateAccountInput, UpdateOwnershipInput } from "@features/entity-registry/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "entity-registry",
    allowedChannels: Object.values(entityRegistryChannels),
    handlers: [
      {
        channel: entityRegistryChannels.createEntity,
        permission: "restricted",
        handler: (_event, name: string, type: EntityType) => context.entityRegistryService.createEntity(name, type)
      },
      {
        channel: entityRegistryChannels.listEntities,
        permission: "public",
        handler: (_event, filter) => context.entityRegistryService.listEntities(filter)
      },
      {
        channel: entityRegistryChannels.getEntityDetails,
        permission: "public",
        handler: (_event, entityId: string) => context.entityRegistryService.getEntityDetails(entityId)
      },
      {
        channel: entityRegistryChannels.updateEntity,
        permission: "restricted",
        handler: (_event, input) => context.entityRegistryService.updateEntity(input)
      },
      {
        channel: entityRegistryChannels.deleteEntity,
        permission: "restricted",
        handler: (_event, entityId: string) => context.entityRegistryService.deleteEntity(entityId)
      },
      {
        channel: entityRegistryChannels.createOwnershipRelation,
        permission: "restricted",
        handler: (_event, ownerEntityId: string, targetEntityId: string, sharePercent: number) =>
          context.entityRegistryService.createOwnershipRelation(ownerEntityId, targetEntityId, sharePercent)
      },
      {
        channel: entityRegistryChannels.updateOwnershipRelation,
        permission: "restricted",
        handler: (_event, input: UpdateOwnershipInput) => context.entityRegistryService.updateOwnershipRelation(input)
      },
      {
        channel: entityRegistryChannels.deleteOwnershipRelation,
        permission: "restricted",
        handler: (_event, relationId: string) => context.entityRegistryService.deleteOwnershipRelation(relationId)
      },
      {
        channel: entityRegistryChannels.createAccount,
        permission: "restricted",
        handler: (_event, entityId: string, name: string) => context.entityRegistryService.createAccount(entityId, name)
      },
      {
        channel: entityRegistryChannels.updateAccount,
        permission: "restricted",
        handler: (_event, input: UpdateAccountInput) => context.entityRegistryService.updateAccount(input)
      },
      {
        channel: entityRegistryChannels.deleteAccount,
        permission: "restricted",
        handler: (_event, accountId: string) => context.entityRegistryService.deleteAccount(accountId)
      },
      {
        channel: entityRegistryChannels.listAccounts,
        permission: "public",
        handler: (_event, entityId: string) => context.entityRegistryService.listAccounts(entityId)
      },
      {
        channel: entityRegistryChannels.listOwnerships,
        permission: "public",
        handler: (_event, filter) => context.entityRegistryService.listOwnerships(filter)
      }
    ]
  };
}
