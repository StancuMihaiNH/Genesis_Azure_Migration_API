import { getCategory } from "../dataAccess/categoryRepository.js";
import { createTag, deleteTag, getTag, getTags, updateTag } from "../dataAccess/tagRepository.js";
import { getUserByID } from "../dataAccess/userRepository.js";
import { isAdministrator } from "../utils/authUtils.js";
import { getContainer } from "../utils/generalUtils.js";

export const tagQueryResolvers = {
    tags: async (_, __, context) => await getTags({ ...context, container: getContainer('TAG', context.containers) })
};

export const tagMutationResolvers = {
    createTag: async (parent, { input }, context) => {
        const { user } = context;
        if (!user) throw new Error("Unauthorized");
        const { userId } = input;
        if (!isAdministrator(user) && userId && userId !== user.id) throw new Error("Unauthorized");
        if (!userId) input.userId = user.id;
        return await createTag({ ...context, container: getContainer('TAG', context.containers) }, input);
    },
    updateTag: async (parent, { input }, context) => {
        const { user } = context;
        if (!user) throw new Error("Unauthorized");
        const tag = await getTag({ ...context, container: getContainer('TAG', context.containers) }, input.id);
        if (!tag) throw new Error("Tag not found");
        if (tag.userId !== user.id && !isAdministrator(user)) throw new Error("Unauthorized");
        const { userId } = input;
        if (!isAdministrator(user) && userId && userId !== user.id) throw new Error("Unauthorized");
        const updateValues = { ...tag, ...input };
        return await updateTag({ ...context, container: getContainer('TAG', context.containers) }, tag.id, updateValues);
    },
    deleteTag: async (parent, { id }, context) => {
        const { user } = context;
        if (!user) throw new Error("Unauthorized");
        const tag = await getTag({ ...context, container: getContainer('TAG', context.containers) }, id);
        if (!tag) throw new Error("Tag not found");
        if (tag.userId !== user.id && !isAdministrator(user)) throw new Error("Unauthorized");
        await deleteTag({ ...context, container: getContainer('TAG', context.containers) }, tag);
        return true;
    }
};

export const tagResolvers = {
    Query: tagQueryResolvers,
    Mutation: tagMutationResolvers,
    Tag: {
        category: async (parent, _, context) =>
            parent.categoryId ? await getCategory({ ...context, container: getContainer('CATEGORY', context.containers) }, parent.categoryId) : null,
        user: async (parent, _, context) => await getUserByID({ ...context, container: getContainer('USER', context.containers) }, parent.userId),
    }
};