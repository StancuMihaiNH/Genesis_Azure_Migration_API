import { Containers } from "../common/constants.js";
import { createUser, deleteUser, getUserByEmail, getUserByID, getUsers, saveUser } from "../dataAccess/userRepository.js";
import { generateToken, isAdministrator, validateEmail } from "../utils/authUtils.js";
import { getContainer, getSignedUrlForDownload } from "../utils/generalUtils.js";

export const userQueryResolvers = {
    viewer: async (parent, args, context) => {
        const { user, token } = context;
        return { user, token };
    },
    users: async (_, { nextToken }, context) => {
        const { user } = context;
        if (!user || !isAdministrator(user)) {
            throw new Error("Unauthorized");
        }

        return await getUsers({ ...context, container: getContainer(Containers.USER, context.containers) }, { nextToken });
    }
};

export const userMutationResolvers = {
    createUser: async (parent, { name, email }, context) => {
        const { user } = context;
        if (!user || !isAdministrator(user)) {
            throw new Error("Unauthorized");
        }

        return await createUser({ ...context, container: getContainer(Containers.USER, context.containers) }, { name, email });
    },
    deleteUser: async (parent, { id }, context) => {
        const { user } = context;
        if (!user || !isAdministrator(user)) throw new Error("Unauthorized");

        const userToDelete = await getUserByID({ ...context, container: getContainer(Containers.USER, context.containers) }, id);
        if (!userToDelete) {
            throw new Error("Invalid email");
        }

        await deleteUser({ ...context, container: getContainer(Containers.USER, context.containers) }, userToDelete);
        return true;
    },
    updateUser: async (parent, { id, input }, context) => {
        const { user } = context;
        const { role, name, phone, avatar } = input;
        if (!user) {
            throw new Error("Unauthorized");
        }

        if (user.role !== "admin" && user.id !== id) {
            throw new Error("Unauthorized");
        }

        if (role && !isAdministrator(user)) {
            throw new Error("Unauthorized");
        }

        const updateValues = {};
        if (avatar) updateValues.avatar = avatar;
        if (role) updateValues.role = role;
        if (name) updateValues.name = name;
        if (phone) updateValues.phone = phone;

        const u = await getUserByID({ ...context, container: getContainer(Containers.USER, context.containers) }, id);
        if (!u) throw new Error("User not found");
        if (input.email && input.email !== u.email) {
            if (!validateEmail(input.email)) throw new Error("Invalid email");
            updateValues.email = input.email.toLowerCase();
            const findByEmail = await getUserByEmail({ ...context, container: getContainer(Containers.USER, context.containers) }, updateValues.email);
            if (findByEmail && findByEmail.id !== id) throw new Error("Email already in use");
        }
        const result = { ...u, ...updateValues };
        await saveUser({ ...context, container: getContainer(Containers.USER, context.containers) }, result);
        return result;
    },
    updateMyAccount: async (parent, { input }, context) => {
        const { user } = context;
        if (!user) {
            throw new Error("Unauthorized");
        }

        const { name, phone, avatar } = input;
        if (input.email && input.email !== user.email) {
            if (!validateEmail(input.email)) {
                throw new Error("Invalid email");
            }

            user.email = input.email.toLowerCase();
            const findByEmail = await getUserByEmail({ ...context, container: getContainer(Containers.USER, context.containers) }, user.email);
            if (findByEmail && findByEmail.id !== user.id) {
                throw new Error("Email already in use");
            }
        }
        user.name = name || user.name;
        user.phone = phone || user.phone;
        user.avatar = avatar || user.avatar;
        user.updatedAt = getUnixTime(new Date());
        await saveUser({ ...context, container: getContainer(Containers.USER, context.containers) }, user);
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