import { ulid } from "ulid";
import { getUnixTime } from "date-fns";

export const getPrompts = async (ctx) => {
    const { container } = ctx;
    const { resources: items } = await container.items.query({
        query: "SELECT * FROM c WHERE c.PK = @pk AND STARTSWITH(c.SK, 'PROMPT#')",
        parameters: [{ name: "@pk", value: `USER#${ctx.user.id}` }],
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