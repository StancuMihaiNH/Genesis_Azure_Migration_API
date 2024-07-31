import { saveUser, createUser, getUsers, getUserByID, getUserByEmail, deleteUser } from "../dataAccess/userRepository.js";
import { hashPassword, validateEmail, validatePassword, comparePassword, generateToken, isAdministrator } from "../utils/authUtils.js";
import { getSignedUrlForDownload, getContainer } from "../utils/generalUtils.js";

export const userQueryResolvers = {
    viewer: async (parent, args, context) => {
        const { user, token } = context;
        return { user, token };
    },
    users: async (_, { nextToken }, context) => {
        const { user } = context;
        if (!user || !isAdministrator(user)) throw new Error("Unauthorized");
        return await getUsers({ ...context, container: getContainer('USER', context.containers) }, { nextToken });
    }
};

export const userMutationResolvers = {
    register: async (_, { name, email, password }, context) => {
        try {
            const user = await createUser({ ...context, container: getContainer('USER', context.containers) }, { name, email, password });
            const token = generateToken(user.id);
            return { user, token };
        } catch (e) {
            throw e;
        }
    },
    login: async (parent, { email, password }, context) => {
        const user = await getUserByEmail({ ...context, container: getContainer('USER', context.containers) }, email);
        if (!user) throw new Error("Invalid email or password");
        if (!comparePassword(password, user.password)) throw new Error("Invalid email or password");
        const token = generateToken(user.id);
        return { user, token };
    },
    createUser: async (parent, { name, email, password }, context) => {
        const { user } = context;
        if (!user || !isAdministrator(user)) throw new Error("Unauthorized");
        return await createUser({ ...context, container: getContainer('USER', context.containers) }, { name, email, password });
    },
    deleteUser: async (parent, { id }, context) => {
        const { user } = context;
        if (!user || !isAdministrator(user)) throw new Error("Unauthorized");

        const userToDelete = await getUserByID({ ...context, container: getContainer('USER', context.containers) }, id);
        if (!userToDelete) throw new Error("Invalid email or password");

        await deleteUser({ ...context, container: getContainer('USER', context.containers) }, userToDelete);
        return true;
    },
    updateUser: async (parent, { id, input }, context) => {
        const { user } = context;
        const { role, name, phone, avatar, newPassword, currentPassword } = input;
        if (!user) throw new Error("Unauthorized");
        if (user.role !== "admin" && user.id !== id) throw new Error("Unauthorized");
        if (role && !isAdministrator(user)) throw new Error("Unauthorized");
        const updateValues = {};
        if (avatar) updateValues.avatar = avatar;
        if (role) updateValues.role = role;
        if (name) updateValues.name = name;
        if (phone) updateValues.phone = phone;
        if (newPassword) {
            if (!validatePassword(newPassword)) throw new Error("Password must be at least 5 characters long");
            if (!isAdministrator()) {
                if (!currentPassword) throw new Error("Current password is required");
                if (!comparePassword(currentPassword, user.password)) throw new Error("Invalid current password");
            }
            updateValues.password = hashPassword(newPassword);
        }
        const u = await getUserByID({ ...context, container: getContainer('USER', context.containers) }, id);
        if (!u) throw new Error("User not found");
        if (input.email && input.email !== u.email) {
            if (!validateEmail(input.email)) throw new Error("Invalid email");
            updateValues.email = input.email.toLowerCase();
            const findByEmail = await getUserByEmail({ ...context, container: getContainer('USER', context.containers) }, updateValues.email);
            if (findByEmail && findByEmail.id !== id) throw new Error("Email already in use");
        }
        const result = { ...u, ...updateValues };
        await saveUser({ ...context, container: getContainer('USER', context.containers) }, result);
        return result;
    },
    updateMyAccount: async (parent, { input }, context) => {
        const { user } = context;
        if (!user) throw new Error("Unauthorized");
        const { name, phone, currentPassword, newPassword, avatar } = input;
        if (currentPassword && !comparePassword(currentPassword, user.password)) throw new Error("Invalid current password");
        if (newPassword) {
            if (!validatePassword(newPassword)) throw new Error("Password must be at least 5 characters long");
            user.password = hashPassword(newPassword);
        }
        if (input.email && input.email !== user.email) {
            if (!validateEmail(input.email)) throw new Error("Invalid email");
            user.email = input.email.toLowerCase();
            const findByEmail = await getUserByEmail({ ...context, container: getContainer('USER', context.containers) }, user.email);
            if (findByEmail && findByEmail.id !== user.id) throw new Error("Email already in use");
        }
        user.name = name || user.name;
        user.phone = phone || user.phone;
        user.avatar = avatar || user.avatar;
        user.updatedAt = getUnixTime(new Date());
        await saveUser({ ...context, container: getContainer('USER', context.containers) }, user);
        return {
            user,
            token: generateToken(user.id),
        };
    }
};

export const userResolvers = {
    Query: userQueryResolvers,
    Mutation: userMutationResolvers,
    User: {
        role: (parent) => parent.role || "user",
        avatarUrl: (parent, _, context) =>
            parent.avatar ? getSignedUrlForDownload(context, parent.avatar) : null
    }
};