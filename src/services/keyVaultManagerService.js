import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { Constants } from '../common/constants.js';

export class KeyVaultManager {
    constructor() {
        this.keyVaultName = Constants.KEY_VAULT_NAME;
        this.keyVaultUrl = `https://${this.keyVaultName}.vault.azure.net/`;
        this.credential = new DefaultAzureCredential();
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