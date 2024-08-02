import { BlobSASPermissions, generateBlobSASQueryParameters } from "@azure/storage-blob";
import { ulid } from "ulid";
import { Containers, KeyVaultConstants } from "../common/constants.js";
import { KeyVaultManager } from "../services/keyVaultManagerService.js";

const keyVaultManager = KeyVaultManager.getInstance();


export const presignedUrl = async (context, { filename }) => {
  const { blobServiceClient } = context;
  const safeFilename = filename.replace(/[^a-zA-Z0-9\-_\.]/g, "_"); // Replace invalid characters
  const key = `${ulid()}_${safeFilename}`;

  const containerName = "ai-coe-llm";
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(key);

  const expiry = new Date(new Date().valueOf() + 3600 * 1000);

  const sasUrl = await blockBlobClient.generateSasUrl({
    permissions: BlobSASPermissions.parse("w"),
    expiresOn: expiry,
  });

  return { key, url: sasUrl };
};

export const getSignedUrlForDownload = async (context, key) => {
  const { blobServiceClient } = context;
  const containerName = "ai-coe-llm";
  const prefix = "north-highland/text/raw/";
  const containerClient = blobServiceClient.getContainerClient(containerName);

  const blobName = `${prefix}${key}`;

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const sasOptions = {
    containerName: containerClient.containerName,
    blobName: blockBlobClient.name,
    permissions: BlobSASPermissions.parse("r"),
    expiresOn: new Date(new Date().valueOf() + 24 * 60 * 60 * 1000),
  };

  const sasToken = generateBlobSASQueryParameters(sasOptions, blobServiceClient.credential).toString();
  const url = `${blockBlobClient.url}?${sasToken}`;
  return url;
};

export const getFileContent = async (context, key) => {
  const { blobServiceClient } = context;
  const AZURE_STORAGE_CONNECTION_STRING = await keyVaultManager.getSecret(KeyVaultConstants.AZURE_STORAGE_CONTAINER_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONNECTION_STRING);
  const blockBlobClient = containerClient.getBlockBlobClient(key);

  const downloadBlockBlobResponse = await blockBlobClient.download(0);
  const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody);

  return downloaded;
};

const streamToString = async (readableStream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", (data) => {
      chunks.push(data.toString());
    });
    readableStream.on("end", () => {
      resolve(chunks.join(""));
    });
    readableStream.on("error", reject);
  });
};

export const uniqueIds = (ids) => {
  let _ids = [];
  let _idMap = {};
  ids.forEach((id) => {
    if (!_idMap[id]) {
      _idMap[id] = true;
      _ids.push(id);
    }
  });
  return _ids;
};


export const getContainer = (entityType, containers) => {
  switch (entityType) {
    case Containers.CATEGORY:
      return containers.categoryContainer;
    case Containers.MESSAGE:
      return containers.messageContainer;
    case Containers.PROMPT:
      return containers.promptContainer;
    case Containers.TAG:
      return containers.tagContainer;
    case Containers.TOPIC:
      return containers.topicContainer;
    case Containers.USER:
      return containers.userContainer;
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
};