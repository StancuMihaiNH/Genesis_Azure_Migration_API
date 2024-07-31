import { CosmosClient } from "@azure/cosmos";
import { KeyVaultManager } from "./keyVaultManagerService.js";
import { KeyVaultConstants } from "../common/constants.js";

let containers;

export const initCosmosClient = async () => {
    const keyVaultManager = KeyVaultManager.getInstance();
    const COSMOS_DB_ENDPOINT = await keyVaultManager.getSecret(KeyVaultConstants.COSMOS_DB_ENDPOINT);
    const COSMOS_DB_KEY = await keyVaultManager.getSecret(KeyVaultConstants.COSMOS_DB_KEY);

    const client = new CosmosClient({ endpoint: COSMOS_DB_ENDPOINT, key: COSMOS_DB_KEY });
    const database = client.database("NHChat");

    containers = {
        tagContainer: database.container("Tag"),
        topicContainer: database.container("Topic"),
        userContainer: database.container("User"),
        promptContainer: database.container("Prompt"),
        categoryContainer: database.container("Category"),
        messageContainer: database.container("Message"),
    };
};

export const getContainer = (name) => containers[name];