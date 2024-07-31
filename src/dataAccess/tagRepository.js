import { getUnixTime } from "date-fns";
import { ulid } from "ulid";

export const createTag = async (ctx, { displayName, userId, content, categoryId, attachments }) => {
    const { user, container } = ctx;
    const id = ulid();

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

export const getTags = async (ctx) => {
    const { container } = ctx;
    const { resources: items } = await container.items.query({
        query: "SELECT * FROM c WHERE c.PK = 'TAG'",
    }).fetchAll();

    return items;
};

export const getTag = async (ctx, id) => {
    const { container } = ctx;
    const { resources: items } = await container.items.query({
        query: "SELECT * FROM c WHERE c.PK = 'TAG' AND c.SK = @id",
        parameters: [{ name: "@id", value: `TAG#${id}` }],
    }).fetchAll();

    return items.length > 0 ? items[0] : null;
};