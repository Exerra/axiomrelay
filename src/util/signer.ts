import { GenerateHeadersOptions, Sha256Signer, SignedFetch } from 'activitypub-http-signatures';
import { createHash } from "node:crypto"

const generateDigestHeader = (body: string): string => {
    const hash = createHash('sha256').update(body).digest('base64');
    return `SHA-256=${hash}`;
}

export const experimentalSigner = () => {
    
}