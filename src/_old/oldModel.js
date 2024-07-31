import { getUnixTime } from "date-fns";
import { ulid } from "ulid";

export const getUserByID = async (container, id) => {
    if (!container) {
        throw new Error("Container is undefined");
    }
    const containerItems = container.items ? container.items : container.container.items;

    if (!containerItems) {
        throw new Error("Items are undefined");
    }

    const { resources: items } = await containerItems.query({
        query: "SELECT * FROM c WHERE c.PK = 'USER' AND c.SK = @id",
        parameters: [{ name: "@id", value: `USER#${id}` }],
    }).fetchAll();

    return items.length > 0 ? items[0] : null;
};

export const getUserByEmail = async (ctx, email) => {
    const { container } = ctx;
    const { resources: items } = await container.items.query({
        query: "SELECT * FROM c WHERE c.GSI1PK = @email",
        parameters: [{ name: "@email", value: `USER#${email}` }],
    }).fetchAll();

    return items.length > 0 ? items[0] : null;
};

export const deleteUser = async (ctx, user) => {
    const { container } = ctx;
    await container.item(user.id, user.PK).delete();
};

export const getUserTopics = async (ctx, userId, pinned, asc, search) => {
    const { container } = ctx;
    let query = "SELECT * FROM c WHERE c.PK = @pk AND STARTSWITH(c.SK, 'TOPIC#')";
    const parameters = [{ name: "@pk", value: `USER#${userId}` }];

    if (search) {
        query += " AND (CONTAINS(LOWER(c.name), @search) OR CONTAINS(LOWER(c.description), @search))";
        parameters.push({ name: "@search", value: search.toLowerCase() });
    }

    if (pinned) {
        query += " AND c.pinned = true";
    }

    query += ` ORDER BY c.lastMessageAt ${asc ? "ASC" : "DESC"}`;

    const { resources: topics } = await container.items.query({ query, parameters }).fetchAll();

    return topics;
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

export const createTopic = async (ctx, { name, description, tagIds }) => {
    const { user, container } = ctx;
    const id = ulid();
    const unix = getUnixTime(new Date());
    const item = {
        PK: `USER#${user.id}`,
        SK: `TOPIC#${id}`,
        id,
        name,
        description,
        userId: user.id,
        pinned: false,
        pinnedAt: unix,
        entity: "TOPIC",
        createdAt: unix,
        updatedAt: unix,
    };

    await container.items.create(item);
    return item;
};

export const updateTopic = async (ctx, id, input) => {
    const { user, container } = ctx;
    const unix = getUnixTime(new Date());
    const item = {
        PK: `USER#${user.id}`,
        SK: `TOPIC#${id}`,
        id,
        ...input,
        updatedAt: unix,
    };

    await container.items.upsert(item);
    return item;
};

export const getTopic = async (ctx, id) => {
    const { container, user } = ctx;
    const { resources: items } = await container.items.query({
        query: "SELECT * FROM c WHERE c.PK = @pk AND c.SK = @sk",
        parameters: [
            { name: "@pk", value: `USER#${user.id}` },
            { name: "@sk", value: `TOPIC#${id}` },
        ],
    }).fetchAll();

    return items.length > 0 ? items[0] : null;
};

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

export const deleteTopic = async (ctx, userId, id) => {
    const { container } = ctx;
    await container.item(id, `USER#${userId}`).delete();
};

export const getTags = async (ctx) => {
    const { container } = ctx;
    const { resources: items } = await container.items.query({
        query: "SELECT * FROM c WHERE c.PK = 'TAG'",
    }).fetchAll();

    return items;
};
export const createTag = async (ctx, { id, displayName, userId, content, categoryId, attachments }) => {
    const { user, container } = ctx;
    const unix = getUnixTime(new Date());
    const item = {
        PK: `TAG`,
        SK: `TAG#${id}`,
        id,
        displayName,
        content,
        categoryId,
        attachments,
        userId: userId || user.id,
        entity: "TAG",
        createdAt: unix,
        updatedAt: unix,
    };

    await container.items.create(item);
    return item;
};

export const getTag = async (ctx, id) => {
    const { container } = ctx;
    const { resources: items } = await container.items.query({
        query: "SELECT * FROM c WHERE c.PK = 'TAG' AND c.SK = @id",
        parameters: [{ name: "@id", value: `TAG#${id}` }],
    }).fetchAll();

    return items.length > 0 ? items[0] : null;
};

export const updateTag = async (ctx, id, input) => {
    const { container } = ctx;
    const unix = getUnixTime(new Date());
    const item = {
        PK: `TAG`,
        SK: `TAG#${id}`,
        id,
        ...input,
        updatedAt: unix,
    };

    await container.items.upsert(item);
    return item;
};

export const deleteTag = async (ctx, tag) => {
    const { container } = ctx;
    await container.item(tag.id, tag.PK).delete();
};

export const getPrompts = async (ctx) => {
    const { user, container } = ctx;
    const { resources: items } = await container.items.query({
        query: "SELECT * FROM c WHERE c.PK = @pk AND STARTSWITH(c.SK, 'PROMPT#')",
        parameters: [{ name: "@pk", value: `USER#${user.id}` }],
    }).fetchAll();

    return items;
};

export const createPrompt = async (ctx, { title, description }) => {
    const { user, container } = ctx;
    const id = ulid();
    const unix = getUnixTime(new Date());
    const item = {
        PK: `USER#${user.id}`,
        SK: `PROMPT#${id}`,
        id,
        title,
        description,
        userId: user.id,
        entity: "PROMPT",
        createdAt: unix,
        updatedAt: unix,
    };

    await container.items.create(item);
    return item;
};

export const deletePrompt = async (ctx, id) => {
    const { user, container } = ctx;
    await container.item(id, `USER#${user.id}`).delete();
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

export const getCategories = async (ctx) => {
    const { container } = ctx;
    const { resources: items } = await container.items.query({
        query: "SELECT * FROM c WHERE c.PK = 'CATEGORY' AND STARTSWITH(c.SK, 'CATEGORY#')",
    }).fetchAll();

    return items;
};

export const addCategory = async (ctx, { title, description, userId }) => {
    const { user, container } = ctx;
    const unix = getUnixTime(new Date());
    const id = ulid();
    const item = {
        PK: `CATEGORY`,
        SK: `CATEGORY#${id}`,
        id,
        title,
        description,
        userId: userId || user.id,
        createdAt: unix,
        updatedAt: unix,
    };

    await container.items.create(item);
    return item;
};

export const editCategory = async (ctx, id, input) => {
    const { container } = ctx;
    const unix = getUnixTime(new Date());
    const item = {
        PK: `CATEGORY`,
        SK: `CATEGORY#${id}`,
        id,
        ...input,
        updatedAt: unix,
    };

    await container.items.upsert(item);
    return item;
};

export const deleteCategory = async (ctx, category) => {
    const { container } = ctx;
    await container.item(category.id, category.PK).delete();
};

export const getCategory = async (ctx, id) => {
    const { container } = ctx;
    const { resources: items } = await container.items.query({
        query: "SELECT * FROM c WHERE c.PK = 'CATEGORY' AND c.SK = @id",
        parameters: [{ name: "@id", value: `CATEGORY#${id}` }],
    }).fetchAll();

    return items.length > 0 ? items[0] : null;
};