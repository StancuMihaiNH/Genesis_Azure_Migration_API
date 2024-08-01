import { getUnixTime } from "date-fns";
import { ulid } from "ulid";

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

    const { resources: items } = await container.items.query({
        query: "SELECT * FROM c WHERE c.PK = @pk AND c.SK = @sk",
        parameters: [
            { name: "@pk", value: `USER#${user.id}` },
            { name: "@sk", value: `TOPIC#${id}` }
        ],
    }).fetchAll();

    if (items.length === 0) {
        throw new Error("Topic not found");
    }

    const existingTopic = items[0];

    const item = {
        ...existingTopic,
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

export const deleteTopic = async (ctx, userId, id) => {
    const { container } = ctx;
    await container.item(id, `USER#${userId}`).delete();
};

export const pinTopic = async (ctx, topic) => {
    const { container } = ctx;
    const unix = getUnixTime(new Date());

    topic.pinned = true;
    topic.pinnedAt = unix;

    await container.items.upsert(topic);

    return topic;
};

export const unpinTopic = async (ctx, topic) => {
    const { container } = ctx;

    topic.pinned = false;
    topic.pinnedAt = null;

    await container.items.upsert(topic);

    return topic;
};


export const getTopicsByTag = async (ctx, tagId) => {
    const { container } = ctx;

    const querySpec = {
        query: `SELECT c FROM c JOIN tag IN c.tags WHERE tag.id = '${tagId}'`,
    };

    const { resources: topics } = await container.items.query(querySpec).fetchAll();
    return topics.map(topic => topic.c);
};