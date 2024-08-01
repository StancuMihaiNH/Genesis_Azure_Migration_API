import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { Constants } from "../common/constants.js";

const ISSUER = "https://sts.windows.net/01f9eba2-9007-43a8-9560-d7b94ee76c3f/";
const AUDIENCE = "00000003-0000-0000-c000-000000000000";
const JWK_URL = `${ISSUER}discovery/v2.0/keys`;
const SALT_ROUNDS = 10;

const client = jwksClient({
    jwksUri: JWK_URL
});

function getKey(header, callback) {
    client.getSigningKey(header.kid, function (err, key) {
        if (err) {
            callback(err, null);
        } else {
            const signingKey = key.getPublicKey();
            callback(null, signingKey);
        }
    });
};

export const verifyToken = async (token) => {
    return jwt.decode(token, { complete: true });
    // return new Promise((resolve, reject) => {
    //     jwt.verify(token, getKey, { algorithms: ["RS256"], audience: AUDIENCE, issuer: ISSUER }, (err, decoded) => {
    //         if (err) {
    //             console.error("Token verification error:", err);
    //             reject(err);
    //         } else {
    //             console.log("Token successfully verified:", decoded);
    //             resolve(decoded);
    //         }
    //     });
    // });
};

export const generateToken = (id) => {
    return jwt.sign({ id }, Constants.JWT_SECRET, { expiresIn: "100y" });
};

export const validateEmail = (email) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
};

export const isAdministrator = (user) => {
    if (!user) {
        return false;
    }

    return user.role === "admin";
};