import { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters } from "@azure/storage-blob";
import { KeyVaultManager } from "./keyVaultManagerService.js";
import { KeyVaultConstants } from "../common/constants.js";

export const getBlobServiceClient = async () => {
    const keyVaultManager = KeyVaultManager.getInstance();
    const AZURE_STORAGE_CONNECTION_STRING = await keyVaultManager.getSecret(KeyVaultConstants.AZURE_STORAGE_CONTAINER_CONNECTION_STRING);
    return BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
};

export const generatePresignedUrl = async (blobServiceClient, containerName, blobName, permissions, expiryTime) => {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const sasOptions = {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse(permissions),
        expiresOn: new Date(new Date().valueOf() + expiryTime),
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, blobServiceClient.credential).toString();
    return `${blockBlobClient.url}?${sasToken}`;
};