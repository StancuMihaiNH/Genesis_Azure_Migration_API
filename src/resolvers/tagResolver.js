import { Containers } from "../common/constants.js";
import { getCategory } from "../dataAccess/categoryRepository.js";
import { createTag, deleteTag, getTag, getTags, updateTag, updateTopicTags } from "../dataAccess/tagRepository.js";
import { getTopicsByTag, updateTopic } from "../dataAccess/topicRepository.js";
import { getUserByID } from "../dataAccess/userRepository.js";
import { isAdministrator } from "../utils/authUtils.js";
import { getContainer } from "../utils/generalUtils.js";

export const tagQueryResolvers = {
    tags: async (_, __, context) => await getTags({ ...context, container: getContainer(Containers.TAG, context.containers) })
};

export const tagMutationResolvers = {
    createTag: async (parent, { input }, context) => {
        const { user } = context;
        if (!user) {
            throw new Error("Unauthorized");
        }

        const { userId } = input;
        if (!isAdministrator(user) && userId && userId !== user.id) {
            throw new Error("Unauthorized");
        }

        if (!userId) {
            input.userId = user.id;
        }

        return await createTag({ ...context, container: getContainer(Containers.TAG, context.containers) }, input);
    },
    updateTag: async (parent, { input }, context) => {
        const { user } = context;
        if (!user) {
            throw new Error("Unauthorized");
        }

        const tag = await getTag({ ...context, container: getContainer(Containers.TAG, context.containers) }, input.id);
        if (!tag) {
            throw new Error("Tag not found");
        }

        if (tag.userId !== user.id && !isAdministrator(user)) {
            throw new Error("Unauthorized");
        }

        const { userId } = input;
        if (!isAdministrator(user) && userId && userId !== user.id) {
            throw new Error("Unauthorized");
        }

        const updatedTag = await updateTag({ ...context, container: getContainer(Containers.TAG, context.containers) }, tag.id, { ...tag, ...input });

        const topicsWithTag = await getTopicsByTag({ ...context, container: getContainer(Containers.TOPIC, context.containers) }, tag.id);
        for (const topic of topicsWithTag) {
            const updatedTags = topic.tags.map(t => t.id === updatedTag.id ? updatedTag : t);
            await updateTopicTags({ ...context, container: getContainer(Containers.TOPIC, context.containers) }, topic.id, updatedTags);
        }

        return updatedTag;
    },
    deleteTag: async (parent, { id }, context) => {
        const { user } = context;
        if (!user) {
            throw new Error("Unauthorized");
        }

        const tag = await getTag({ ...context, container: getContainer(Containers.TAG, context.containers) }, id);
        if (!tag) {
            throw new Error("Tag not found");
        }

        if (tag.userId !== user.id && !isAdministrator(user)) {
            throw new Error("Unauthorized");
        }
        const topicsWithTag = await getTopicsByTag({ ...context, container: getContainer(Containers.TOPIC, context.containers) }, id);
        if (topicsWithTag.length > 0) {
            for (const topic of topicsWithTag) {
                topic.tags = topic.tags.filter(t => t.id !== id);
                topic.tagIds = topic.tags.map(t => t.id);
                await updateTopic({ ...context, container: getContainer(Containers.TOPIC, context.containers) }, topic.id, topic);
            }
        }

        await deleteTag({ ...context, container: getContainer(Containers.TAG, context.containers) }, tag);
        return true;
    }
};

export const tagResolvers = {
    Query: tagQueryResolvers,
    Mutation: tagMutationResolvers,
    Tag: {
        category: async (parent, _, context) =>
            parent.categoryId ? await getCategory({ ...context, container: getContainer(Containers.CATEGORY, context.containers) }, parent.categoryId) : null,
        user: async (parent, _, context) => await getUserByID({ ...context, container: getContainer(Containers.USER, context.containers) }, parent.userId),
    }
};