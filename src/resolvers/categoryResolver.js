import { addCategory, deleteCategory, editCategory, getCategories, getCategory } from "../dataAccess/categoryRepository.js";
import { getUserByID } from "../dataAccess/userRepository.js";
import { isAdministrator } from "../utils/authUtils.js";
import { getContainer } from "../utils/generalUtils.js";

export const categoryQueryResolvers = {
    categories: async (_, __, context) => await getCategories({ ...context, container: getContainer('CATEGORY', context.containers) }),
};

export const categoryMutationResolvers = {
    addCategory: async (_, { title, description }, context) => {
        const { user } = context;
        if (!user) throw new Error("Unauthorized");
        const userId = user.id;
        return await addCategory({ ...context, container: getContainer('CATEGORY', context.containers) }, { title, description, userId });
    },
    editCategory: async (_, { id, title, description, userId }, context) => {
        const { user } = context;
        if (!user) throw new Error("Unauthorized");
        const category = await getCategory({ ...context, container: getContainer('CATEGORY', context.containers) }, id);
        if (!category) throw new Error("Category not found");
        if (category.userId !== user.id && !isAdministrator(user)) throw new Error("Unauthorized");
        let updateValues = { ...category, title };
        if (description !== undefined) updateValues.description = description;
        if (userId) updateValues.userId = userId;
        return await editCategory({ ...context, container: getContainer('CATEGORY', context.containers) }, id, updateValues);
    },
    deleteCategory: async (_, { id }, context) => {
        const { user } = context;
        if (!user) throw new Error("Unauthorized");
        const category = await getCategory({ ...context, container: getContainer('CATEGORY', context.containers) }, id);
        if (!category) throw new Error("Category not found");
        if (category.userId !== user.id && !isAdministrator(user)) throw new Error("Unauthorized");
        return await deleteCategory({ ...context, container: getContainer('CATEGORY', context.containers) }, category);
    },
};

export const categoryResolvers = {
    Query: categoryQueryResolvers,
    Mutation: categoryMutationResolvers,
    Category: {
        user: async (parent, _, context) => await getUserByID({ ...context, container: getContainer('USER', context.containers) }, parent.userId),
    }
};