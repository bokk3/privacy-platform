import argon2 from "argon2";
import { env } from "../config/env.js";

const ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: env.ARGON2_MEMORY_COST,
    timeCost: env.ARGON2_TIME_COST,
    parallelism: env.ARGON2_PARALLELISM,
};

export async function hashPassword(password) {
    return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash, password) {
    return argon2.verify(hash, password, ARGON2_OPTIONS);
}
