import Cryptr from "cryptr";

const cryptr = new Cryptr(process.env["ENCRYPTION_KEY"] as string);

function encrypt(text: string): string {
    return cryptr.encrypt(text);
}

function decrypt(encryptedText: string): string {
    return cryptr.decrypt(encryptedText);
}

export default {
    encrypt: encrypt,
    decrypt: decrypt,
};
