import { createTopic, updateTopic, deleteTopic, getTopic, getUserTopics, pinTopic, unpinTopic } from "../dataAccess/topicRepository.js";
import { getContainer } from "../utils/generalUtils.js";

export const topicQueryResolvers = {
    topics: async (parent, { search, pinned, asc }, context) => {
        const { user } = context;
        if (!user) {
            throw new Error("Unauthorized");
        }

        return await getUserTopics({ ...context, container: getContainer('TOPIC', context.containers) }, user.id, pinned, asc, search);
    },
    topic: async (parent, { id }, context) => {
        return await getTopic({ ...context, container: getContainer('TOPIC', context.containers) }, id);
    },
};

export const topicMutationResolvers = {
    createTopic: async (parent, { input }, context) => {
        const { user } = context;
        if (!user) {
            throw new Error("Unauthorized");
        }

        return await createTopic({ ...context, container: getContainer('TOPIC', context.containers) }, input);
    },
    updateTopic: async (parent, { id, input }, context) => {
        const topic = await getTopic({ ...context, container: getContainer('TOPIC', context.containers) }, id);
        if (!topic) {
            throw new Error("Topic not found");
        }

        const updateValues = { ...topic, ...input };
        return await updateTopic({ ...context, container: getContainer('TOPIC', context.containers) }, id, updateValues);
    },
    deleteTopic: async (parent, { id }, context) => {
        const { user } = context;
        if (!user) {
            throw new Error("Unauthorized");
        }

        try {
            await deleteTopic({ ...context, container: getContainer('TOPIC', context.containers) }, user.id, id);
            return true;
        } catch (err) {
            console.log(err);
        }
    },
    pinTopic: async (parent, { id }, context) => {
        const { user } = context;
        if (!user) {
            throw new Error("Unauthorized");
        }

        const topic = await getTopic({ ...context, container: getContainer('TOPIC', context.containers) }, id);
        if (!topic) {
            throw new Error("Topic not found");
        }

        if (user.role !== "admin" && topic.userId !== user.id) {
            throw new Error("Unauthorized");
        }

        return await pinTopic({ ...context, container: getContainer('TOPIC', context.containers) }, topic);
    },
    unpinTopic: async (parent, { id }, context) => {
        const { user } = context;
        if (!user) {
            throw new Error("Unauthorized");
        }

        const topic = await getTopic({ ...context, container: getContainer('TOPIC', context.containers) }, id);
        if (!topic) {
            throw new Error("Topic not found");
        }

        if (user.role !== "admin" && topic.userId !== user.id) {
            throw new Error("Unauthorized");
        }

        return await unpinTopic({ ...context, container: getContainer('TOPIC', context.containers) }, topic);
    }
};

export const topicResolvers = {
    Query: topicQueryResolvers,
    Mutation: topicMutationResolvers,
};