import { ClientSecretCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { Constants } from '../common/constants.js';

export class KeyVaultManager {
    constructor() {
        this.keyVaultName = Constants.KEY_VAULT_NAME;
        this.keyVaultUrl = `https://${this.keyVaultName}.vault.azure.net/`;
        this.tenant_id = process.env.AZURE_TENANT_ID;
        this.client_id = process.env.AZURE_CLIENT_ID;
        this.client_secret = process.env.AZURE_CLIENT_SECRET;
        this.credential = new ClientSecretCredential(this.tenant_id, this.client_id, this.client_secret)
        this.client = new SecretClient(this.keyVaultUrl, this.credential);
    }

    async getSecret(secretName) {
        const secret = await this.client.getSecret(secretName);
        return secret.value;
    }

    static getInstance() {
        if (!KeyVaultManager.instance) {
            KeyVaultManager.instance = new KeyVaultManager();
        }
        return KeyVaultManager.instance;
    }
}

export default KeyVaultManager;