import { CosmosClient } from "@azure/cosmos";
import { ApolloServer } from "apollo-server";
import { getUnixTime } from "date-fns";
import { ulid } from "ulid";
import { Constants, KeyVaultConstants } from "../common/constants.js";
import { KeyVaultManager } from "../services/keyVaultManagerService.js";
import { getContainer, verifyToken } from "./utils.js";
import { BlobServiceClient } from "@azure/storage-blob";
import { userResolvers } from "../resolvers/userResolver.js";
import {
  getFileContent,
  getSignedUrlForDownload,
  isAdministrator,
  presignedUrl
} from "./utils.js";

import { typeDefs } from "../common/typedefs.js";

const resolvers = {
  User: {
    ...userResolvers.User,
  },
  File: {
    url: (parent, _, context) => getSignedUrlForDownload(context, parent.id),
  },
  Tag: {
    category: async (parent, _, context) =>
      parent.categoryId ? await getCategory({ ...context, container: getContainer('TAG', context.containers) }, parent.categoryId) : null,
    user: async (parent, _, context) => await getUserByID({ ...context, container: getContainer('USER', context.containers) }, parent.userId),
  },
  Category: {
    user: async (parent, _, context) => await getUserByID({ ...context, container: getContainer('USER', context.containers) }, parent.userId),
  },
  Topic: {
    tags: async (parent, _, context) => {
      if (!parent.tagIds || parent.tagIds.length === 0) return [];
      let tags = [];
      const container = getContainer('TAG', context.containers);
      const params = {
        query: `SELECT * FROM c WHERE c.PK = 'TAG' AND ARRAY_CONTAINS(@tagIds, c.SK)`,
        parameters: [{ name: "@tagIds", value: parent.tagIds.map((tagId) => `TAG#${tagId}`) }],
      };
      const { resources: items } = await container.items.query(params).fetchAll();
      tags = items.sort((t1, t2) => t1.displayName.localeCompare(t2.displayName));
      return tags;
    },
  },
  Query: {
    categories: async (_, __, context) => await getCategories({ ...context, container: getContainer('CATEGORY', context.containers) }),
    getFileContent: async (parent, { key }, context) => await getFileContent(context, key),
    topic: async (parent, { id }, context) => await getTopic({ ...context, container: getContainer('TOPIC', context.containers) }, id),
    topics: async (parent, { search, pinned, asc }, context) => {
      const { user } = context;
      if (!user) throw new Error("Unauthorized");
      return await getUserTopics({ ...context, container: getContainer('TOPIC', context.containers) }, user.id, pinned, asc, search);
    },
    messages: async (parent, { topicId, nextToken }, context) => {
      const { user } = context;
      if (!user) throw new Error("Unauthorized");
      return await getTopicMessages({ ...context, container: getContainer('TOPIC', context.containers) }, topicId, nextToken);
    },
    tags: async (_, __, context) => await getTags({ ...context, container: getContainer('TAG', context.containers) }),
    prompts: async (_, __, context) => await getPrompts({ ...context, container: getContainer('PROMPT', context.containers) }),
    ...userResolvers.Query
  },
  Mutation: {
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
    pinTopic: async (parent, { id }, context) => {
      const { user } = context;
      if (!user) throw new Error("Unauthorized");
      const topic = await getTopic({ ...context, container: getContainer('TOPIC', context.containers) }, id);
      if (!topic) throw new Error("Topic not found");
      if (user.role !== "admin" && topic.userId !== user.id) throw new Error("Unauthorized");
      const unixTime = getUnixTime(new Date());
      topic.pinned = true;
      topic.pinnedAt = unixTime;
      return await updateTopic({ ...context, container: getContainer('TOPIC', context.containers) }, id, topic);
    },
    unpinTopic: async (parent, { id }, context) => {
      const { user } = context;
      if (!user) throw new Error("Unauthorized");
      const topic = await getTopic({ ...context, container: getContainer('TOPIC', context.containers) }, id);
      if (!topic) throw new Error("Topic not found");
      if (user.role !== "admin" && topic.userId !== user.id) throw new Error("Unauthorized");
      topic.pinned = false;
      return await updateTopic({ ...context, container: getContainer('TOPIC', context.containers) }, id, topic);
    },
    createTopic: async (parent, { input }, context) => {
      const { user } = context;
      if (!user) throw new Error("Unauthorized");
      const topic = await createTopic({ ...context, container: getContainer('TOPIC', context.containers) }, input);
      await createMessage({ ...context, container: getContainer('TOPIC', context.containers) }, topic.id, {
        id: ulid(),
        role: "assistant",
        content: "Hello! How can I help you today?",
        files: [],
        sourceDocuments: [],
      });
      return topic;
    },
    updateTopic: async (parent, { id, input }, context) => {
      const topic = await getTopic({ ...context, container: getContainer('TOPIC', context.containers) }, id);
      if (!topic) throw new Error("Topic not found");
      const updateValues = { ...topic, ...input };
      return await updateTopic({ ...context, container: getContainer('TOPIC', context.containers) }, id, updateValues);
    },
    createMessage: async (parent, { topicId, input }, context) => {
      const { user } = context;
      if (!user) throw new Error("Unauthorized");
      return await createMessage({ ...context, container: getContainer('TOPIC', context.containers) }, topicId, input);
    },
    updateMessage: async (parent, { topicId, messageId, input }, context) => {
      const { user } = context;
      if (!user) throw new Error("Unauthorized");
      const message = await getMessage({ ...context, container: getContainer('TOPIC', context.containers) }, topicId, messageId);
      if (!message) throw new Error("Message not found");
      const updateValues = { ...message, ...input };
      const updated = await updateMessage({ ...context, container: getContainer('TOPIC', context.containers) }, topicId, messageId, updateValues);
      if (message.role === "user") {
        let messages = [];
        let nextToken = null;
        do {
          const response = await getTopicMessages({ ...context, container: getContainer('TOPIC', context.containers) }, topicId, nextToken);
          messages = messages.concat(response.items);
          nextToken = response.nextToken;
        } while (nextToken);
        let batchDelete = [];
        let shouldDelete = false;
        messages.map((m) => {
          if (shouldDelete) batchDelete.push(m.id);
          if (m.id === messageId) shouldDelete = true;
        });
        if (batchDelete.length > 0) await deleteMessages({ ...context, container: getContainer('TOPIC', context.containers) }, topicId, batchDelete);
      }
      return updated;
    },
    deleteTopic: async (parent, { id }, context) => {
      const { user } = context;
      if (!user) throw new Error("Unauthorized");
      try {
        await deleteTopic({ ...context, container: getContainer('TOPIC', context.containers) }, user.id, id);
        return true;
      } catch (err) {
        console.log(err);
      }
    },
    ...userResolvers.Mutation,
    presignedUploadUrl: async (parent, { filename, contentType, prefix }, context) => {
      return await presignedUrl(context, { filename, contentType, prefix });
    },
    createTag: async (parent, { input }, context) => {
      const { user } = context;
      if (!user) throw new Error("Unauthorized");
      const { userId } = input;
      if (!isAdministrator(user) && userId && userId !== user.id) throw new Error("Unauthorized");
      if (!userId) input.userId = user.id;
      return await createTag({ ...context, container: getContainer('TAG', context.containers) }, input);
    },
    updateTag: async (parent, { input }, context) => {
      const { user } = context;
      if (!user) throw new Error("Unauthorized");
      const tag = await getTag({ ...context, container: getContainer('TAG', context.containers) }, input.id);
      if (!tag) throw new Error("Tag not found");
      if (tag.userId !== user.id && !isAdministrator(user)) throw new Error("Unauthorized");
      const { userId } = input;
      if (!isAdministrator(user) && userId && userId !== user.id) throw new Error("Unauthorized");
      const updateValues = { ...tag, ...input };
      return await updateTag({ ...context, container: getContainer('TAG', context.containers) }, tag.id, updateValues);
    },
    deleteTag: async (parent, { id }, context) => {
      const { user } = context;
      if (!user) throw new Error("Unauthorized");
      const tag = await getTag({ ...context, container: getContainer('TAG', context.containers) }, id);
      if (!tag) throw new Error("Tag not found");
      if (tag.userId !== user.id && !isAdministrator(user)) throw new Error("Unauthorized");
      await deleteTag({ ...context, container: getContainer('TAG', context.containers) }, tag);
      return true;
    },
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
  },
};

const getSecrets = async (keyVaultManager) => {
  const COSMOS_DB_ENDPOINT = await keyVaultManager.getSecret(KeyVaultConstants.COSMOS_DB_ENDPOINT);
  const COSMOS_DB_KEY = await keyVaultManager.getSecret(KeyVaultConstants.COSMOS_DB_KEY);
  const AZURE_STORAGE_CONNECTION_STRING = await keyVaultManager.getSecret(KeyVaultConstants.AZURE_STORAGE_CONTAINER_CONNECTION_STRING);
  const STORAGE_CONTAINER_NAME = Constants.STORAGE_CONTAINER_NAME;

  return {
    COSMOS_DB_ENDPOINT,
    COSMOS_DB_KEY,
    AZURE_STORAGE_CONNECTION_STRING,
    STORAGE_CONTAINER_NAME,
  };
};

export const init = async () => {
  const keyVaultManager = KeyVaultManager.getInstance();
  const secrets = await getSecrets(keyVaultManager);

  const AZURE_STORAGE_CONNECTION_STRING = await keyVaultManager.getSecret(KeyVaultConstants.AZURE_STORAGE_CONTAINER_CONNECTION_STRING);
  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

  const client = new CosmosClient({ endpoint: secrets.COSMOS_DB_ENDPOINT, key: secrets.COSMOS_DB_KEY });
  const database = client.database("NHChat");

  const tagContainer = database.container("Tag");
  const topicContainer = database.container("Topic");
  const userContainer = database.container("User");
  const promptContainer = database.container("Prompt");
  const categoryContainer = database.container("Category");
  const messageContainer = database.container("Message");

  const containers = { tagContainer, topicContainer, userContainer, promptContainer, categoryContainer, messageContainer };

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      const token = req.headers.authorization || "";
      let user = null;

      if (token) {
        try {
          const userId = await verifyToken(token.replace("Bearer ", ""));
          if (userId) {
            user = await getUserByID(containers.userContainer, userId);
          }
        } catch (e) {
          console.error("Token verification failed:", e);
        }
      }

      return {
        blobServiceClient,
        user,
        token,
        containers,
      };
    },
  });

  server.listen(8080).then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
};

export default init;