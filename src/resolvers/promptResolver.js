import {
    getPrompts,
    createPrompt,
    deletePrompt,
} from "../dataAccess/promptRepository.js";
import { getContainer } from "../utils/generalUtils.js";

export const promptQueryResolvers = {
    prompts: async (_, __, context) => await getPrompts({ ...context, container: getContainer('PROMPT', context.containers) }),
};

export const promptMutationResolvers = {
    createPrompt: async (_, { title, description }, context) => {
        const { user } = context;
        if (!user) throw new Error("Unauthorized");
        return await createPrompt({ ...context, container: getContainer('PROMPT', context.containers) }, { title, description });
    },
    deletePrompt: async (_, { id }, context) => {
        const { user } = context;
        if (!user) throw new Error("Unauthorized");
        return await deletePrompt({ ...context, container: getContainer('PROMPT', context.containers) }, id);
    },
};

export const promptResolvers = {
    Query: promptQueryResolvers,
    Mutation: promptMutationResolvers,
};