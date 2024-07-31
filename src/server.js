
import { CosmosClient } from "@azure/cosmos";
import { ApolloServer } from "apollo-server";
import { Constants, KeyVaultConstants } from "./common/constants.js";
import { KeyVaultManager } from "./services/keyVaultManagerService.js";
import { BlobServiceClient } from "@azure/storage-blob";
import { userResolvers } from "./resolvers/userResolver.js";
import { categoryResolvers } from "./resolvers/categoryResolver.js";
import { tagResolvers } from "./resolvers/tagResolver.js";
import { promptResolvers } from "./resolvers/promptResolver.js";
import { topicResolvers } from "./resolvers/topicResolver.js";
import { messageResolvers } from "./resolvers/messageResolver.js";
import { getFileContent, getSignedUrlForDownload, presignedUrl } from "./utils/generalUtils.js";
import { verifyToken } from "./utils/authUtils.js";
import { typeDefs } from "./common/typedefs.js";
import { getUserByID } from "./dataAccess/userRepository.js";

const resolvers = {
    User: {
        ...userResolvers.User
    },
    File: {
        url: (parent, _, context) => getSignedUrlForDownload(context, parent.id)
    },
    Tag: {
        ...tagResolvers.Tag
    },
    Category: {
        ...categoryResolvers.Category
    },
    Topic: {
        ...topicResolvers.Topic
    },
    Query: {
        getFileContent: async (parent, { key }, context) => await getFileContent(context, key),
        ...userResolvers.Query,
        ...categoryResolvers.Query,
        ...tagResolvers.Query,
        ...promptResolvers.Query,
        ...topicResolvers.Query,
        ...messageResolvers.Query
    },
    Mutation: {
        ...userResolvers.Mutation,
        ...categoryResolvers.Mutation,
        ...tagResolvers.Mutation,
        ...promptResolvers.Mutation,
        ...topicResolvers.Mutation,
        ...messageResolvers.Mutation,
        presignedUploadUrl: async (parent, { filename, contentType, prefix }, context) => {
            return await presignedUrl(context, { filename, contentType, prefix });
        }
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
        STORAGE_CONTAINER_NAME
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
                containers
            };
        },
    });

    server.listen(8080).then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`);
    });
};

export default init;