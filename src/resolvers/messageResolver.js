import { Containers } from "../common/constants.js";
import { createMessage, deleteMessages, getMessage, getTopicMessages, updateMessage } from "../dataAccess/messageRepository.js";
import { getContainer } from "../utils/generalUtils.js";

export const messageQueryResolvers = {
    messages: async (parent, { topicId, nextToken }, context) => {
        const { user } = context;
        if (!user) {
            throw new Error("Unauthorized");
        }

        return await getTopicMessages({ ...context, container: getContainer(Containers.MESSAGE, context.containers) }, topicId, nextToken);
    }
};

export const messageMutationResolvers = {
    createMessage: async (parent, { topicId, input }, context) => {
        const { user } = context;
        if (!user) {
            throw new Error("Unauthorized");
        }

        return await createMessage({ ...context, container: getContainer(Containers.MESSAGE, context.containers) }, topicId, input);
    },
    updateMessage: async (parent, { topicId, messageId, input }, context) => {
        const { user } = context;
        if (!user) {
            throw new Error("Unauthorized");
        }

        const message = await getMessage({ ...context, container: getContainer(Containers.MESSAGE, context.containers) }, topicId, messageId);
        if (!message) {
            throw new Error("Message not found");
        }

        const updateValues = { ...message, ...input };
        const updated = await updateMessage({ ...context, container: getContainer(Container.MESSAGE, context.containers) }, topicId, messageId, updateValues);

        if (message.role === "user") {
            let messages = [];
            let nextToken = null;
            do {
                const response = await getTopicMessages({ ...context, container: getContainer(Containers.MESSAGE, context.containers) }, topicId, nextToken);
                messages = messages.concat(response.items);
                nextToken = response.nextToken;
            } while (nextToken);

            let batchDelete = [];
            let shouldDelete = false;
            messages.map((m) => {
                if (shouldDelete) {
                    batchDelete.push(m.id);
                }

                if (m.id === messageId) {
                    shouldDelete = true;
                }
            });

            if (batchDelete.length > 0) {
                await deleteMessages({ ...context, container: getContainer(Containers.MESSAGE, context.containers) }, topicId, batchDelete);
            }
        }
        return updated;
    }
};

export const messageResolvers = {
    Query: messageQueryResolvers,
    Mutation: messageMutationResolvers
};