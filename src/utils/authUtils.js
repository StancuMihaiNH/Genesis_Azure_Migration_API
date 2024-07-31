import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Constants } from "../common/constants.js";

const JWT_SECRET = Constants.JWT_SECRET;
const SALT_ROUNDS = 10;

export const generateToken = (id) => {
    return jwt.sign({ id }, JWT_SECRET, { expiresIn: "100y" });
};

export const verifyToken = (token) => {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded) {
        return decoded.id;
    }
    return null;
};

export const hashPassword = (password) => {
    return bcrypt.hashSync(password, SALT_ROUNDS);
};

export const comparePassword = (password, hash) => {
    return bcrypt.compareSync(password, hash);
};

export const validateEmail = (email) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
};

export const validatePassword = (password) => {
    return password.length >= 5;
};

export const isAdministrator = (user) => {
    if (!user) {
        return false;
    }

    return user.role === "admin";
};