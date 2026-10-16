/*
 * Registry of the pile's item groups, so game rules (boosters, continue) can act on
 * physics bodies without the store depending on React, three or rapier.
 * Each GameObject registers an api for its item type while mounted:
 *
 *   {
 *     available(): number               items of this type still in the pile
 *     autoPick(n): number               pick the n top-most items (as if tapped); returns how many
 *     restore(instanceId): void         put a picked item back into the pile
 *     shuffle(rng): void                toss every remaining item
 *   }
 */

const groups = new Map();

export const registerGroup = (typeId, api) => {
    groups.set(typeId, api);
    return () => { if (groups.get(typeId) === api) groups.delete(typeId); };
}

export const getGroup = (typeId) => groups.get(typeId);

export const allGroups = () => [...groups.values()];
