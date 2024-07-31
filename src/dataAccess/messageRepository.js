import { getUnixTime } from "date-fns";

export const createMessage = async (ctx, topicId, { id, role, content, files, model, sourceDocuments }) => {
    const { user, container } = ctx;
    const unix = getUnixTime(new Date());
    const item = {
        PK: `TOPIC#${topicId}`,
        SK: `MESSAGE#${id}`,
        id,
        role,
        content,
        files,
        model,
        userId: user.id,
        topicId,
        sourceDocuments,
        entity: "MESSAGE",
        createdAt: unix,
        updatedAt: unix,
    };

    await container.items.create(item);
    await container.items.upsert({
        PK: `USER#${user.id}`,
        SK: `TOPIC#${topicId}`,
        lastMessageAt: unix,
    });

    return item;
};

export const updateMessage = async (ctx, topicId, messageId, message) => {
    const { container } = ctx;
    const unix = getUnixTime(new Date());
    const item = {
        PK: `TOPIC#${topicId}`,
        SK: `MESSAGE#${messageId}`,
        ...message,
        updatedAt: unix,
    };

    await container.items.upsert(item);
    return item;
};

export const deleteMessages = async (ctx, topicId, messageIds) => {
    const { container } = ctx;
    const operations = messageIds.map((id) => ({
        operationType: "delete",
        id: id,
        partitionKey: `TOPIC#${topicId}`,
    }));

    await container.items.bulk(operations);
};

export const getMessage = async (ctx, topicId, messageId) => {
    const { container } = ctx;
    const { resources: items } = await container.items.query({
        query: "SELECT * FROM c WHERE c.PK = @pk AND c.SK = @sk",
        parameters: [
            { name: "@pk", value: `TOPIC#${topicId}` },
            { name: "@sk", value: `MESSAGE#${messageId}` },
        ],
    }).fetchAll();

    return items.length > 0 ? items[0] : null;
};

export const getTopicMessages = async (ctx, topicId, nextToken) => {
    const { container } = ctx;
    let query = "SELECT * FROM c WHERE c.PK = @pk AND STARTSWITH(c.SK, 'MESSAGE#')";
    const parameters = [{ name: "@pk", value: `TOPIC#${topicId}` }];

    if (nextToken) {
        query += " AND c.id > @nextToken";
        parameters.push({ name: "@nextToken", value: nextToken });
    }

    const { resources: messages } = await container.items.query({ query, parameters }).fetchAll();

    const result = {
        items: messages,
        nextToken: messages.length > 0 ? messages[messages.length - 1].id : null,
    };

    return result;
};