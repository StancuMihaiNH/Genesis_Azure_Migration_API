import { Containers } from "../common/constants.js";
import { addCategory, deleteCategory, editCategory, getCategories, getCategory } from "../dataAccess/categoryRepository.js";
import { getTagsByCategory } from "../dataAccess/tagRepository.js";
import { getUserByID } from "../dataAccess/userRepository.js";
import { isAdministrator } from "../utils/authUtils.js";
import { getContainer } from "../utils/generalUtils.js";
import { tagMutationResolvers } from "./tagResolver.js";

export const categoryQueryResolvers = {
    categories: async (_, __, context) => await getCategories({ ...context, container: getContainer(Containers.CATEGORY, context.containers) }),
};

export const categoryMutationResolvers = {
    addCategory: async (_, { title, description }, context) => {
        const { user } = context;
        if (!user) {
            throw new Error("Unauthorized");
        }

        const userId = user.id;
        return await addCategory({ ...context, container: getContainer(Containers.CATEGORY, context.containers) }, { title, description, userId });
    },
    editCategory: async (_, { id, title, description, userId }, context) => {
        const { user } = context;
        if (!user) {
            throw new Error("Unauthorized");
        }

        const category = await getCategory({ ...context, container: getContainer(Containers.CATEGORY, context.containers) }, id);
        if (!category) {
            throw new Error("Category not found");
        }

        if (category.userId !== user.id && !isAdministrator(user)) {
            throw new Error("Unauthorized");
        }

        let updateValues = { ...category, title };
        if (description !== undefined) {
            updateValues.description = description;
        }

        if (userId) {
            updateValues.userId = userId;
        }

        return await editCategory({ ...context, container: getContainer(Containers.CATEGORY, context.containers) }, id, updateValues);
    },
    deleteCategory: async (_, { id }, context) => {
        const { user } = context;
        if (!user) {
            throw new Error("Unauthorized");
        }

        const category = await getCategory({ ...context, container: getContainer(Containers.CATEGORY, context.containers) }, id);
        if (!category) {
            throw new Error("Category not found");
        }

        if (category.userId !== user.id && !isAdministrator(user)) {
            throw new Error("Unauthorized");
        }

        // Get tags by category
        const tagsWithCategory = await getTagsByCategory({ ...context, container: getContainer(Containers.TAG, context.containers) }, id);

        // Dynamically call deleteTag resolver for each tag
        for (const tag of tagsWithCategory) {
            await tagMutationResolvers.deleteTag(_, { id: tag.id }, context);
        }

        await deleteCategory({ ...context, container: getContainer(Containers.CATEGORY, context.containers) }, category);
        return true;
    },
};

export const categoryResolvers = {
    Query: categoryQueryResolvers,
    Mutation: categoryMutationResolvers,
    Category: {
        user: async (parent, _, context) => await getUserByID({ ...context, container: getContainer(Containers.USER, context.containers) }, parent.userId),
    }
};