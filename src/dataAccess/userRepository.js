import { getUnixTime } from "date-fns";
import { ulid } from "ulid";
import { hashPassword, validateEmail, validatePassword } from "../utils/authUtils.js";

export const saveUser = async (ctx, user) => {
    const { container } = ctx;
    await container.items.upsert({
        PK: `USER`,
        SK: `USER#${user.id}`,
        GSI1PK: `USER#${user.email}`,
        GSI1SK: `USER#${user.id}`,
        ...user,
    });
};

export const createUser = async (ctx, { name, email, password }) => {
    if (!validateEmail(email)) throw new Error("Invalid email");
    if (!validatePassword(password)) throw new Error("Password must be at least 5 characters long");

    const { container } = ctx;
    const id = ulid();
    const emailFormatted = email.toLowerCase();
    const unix = getUnixTime(new Date());
    const item = {
        PK: `USER`,
        SK: `USER#${id}`,
        GSI1PK: `USER#${emailFormatted}`,
        GSI1SK: `USER#${id}`,
        id,
        email: emailFormatted,
        name,
        role: "admin",
        entity: "USER",
        password: hashPassword(password),
        createdAt: unix,
        updatedAt: unix,
    };

    const { resources: existingUsers } = await container.items.query({
        query: "SELECT * FROM c WHERE c.GSI1PK = @Email",
        parameters: [{ name: "@Email", value: `USER#${emailFormatted}` }],
    }).fetchAll();

    if (existingUsers.length > 0) throw new Error("Email already exists");

    await container.items.create(item);
    return item;
};

export const getUsers = async (ctx, { nextToken }) => {
    const { container } = ctx;
    const querySpec = {
        query: "SELECT * FROM c WHERE c.PK = 'USER'",
        parameters: [],
    };

    const { resources: users } = await container.items.query(querySpec).fetchAll();

    const result = {
        items: users,
        nextToken: users.length > 0 ? users[users.length - 1].id : null,
    };

    return result;
};

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
        query: "SELECT * FROM c WHERE c.GSI1PK = @Email",
        parameters: [{ name: "@Email", value: `USER#${email}` }],
    }).fetchAll();

    return items.length > 0 ? items[0] : null;
};

export const deleteUser = async (ctx, user) => {
    const { container } = ctx;
    await container.item(user.id, user.PK).delete();
};