import {hash} from "@node-rs/argon2";
import * as crypto from "node:crypto";

const passwordHash = await hash("password", {
    // recommended minimum parameters
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
});

console.log(crypto.randomUUID(), passwordHash)