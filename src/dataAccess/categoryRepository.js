import { getUnixTime } from "date-fns";
import { ulid } from "ulid";

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

export const getCategories = async (ctx) => {
    const { container } = ctx;
    const { resources: items } = await container.items.query({
        query: "SELECT * FROM c WHERE c.PK = 'CATEGORY' AND STARTSWITH(c.SK, 'CATEGORY#')",
    }).fetchAll();

    return items;
};

export const getCategory = async (ctx, id) => {
    const { container } = ctx;
    const { resources: items } = await container.items.query({
        query: "SELECT * FROM c WHERE c.PK = 'CATEGORY' AND c.SK = @id",
        parameters: [{ name: "@id", value: `CATEGORY#${id}` }],
    }).fetchAll();

    return items.length > 0 ? items[0] : null;
};