/**
 * WebAuthn utilities for real biometric fingerprint authentication
 * Uses the Web Authentication API (FIDO2/U2F) for passwordless authentication
 */

import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

/**
 * Convert base64 string to ArrayBuffer for WebAuthn API
 */
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to base64 string for JSON transmission
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Convert standard base64 to base64url (no padding, url-safe chars) */
function base64ToBase64url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Convert a Uint8Array to base64url string */
function bytesToBase64url(bytes: Uint8Array): string {
  return base64ToBase64url(btoa(String.fromCharCode(...bytes)));
}

/**
 * Get the relying party ID based on current hostname
 */
function getRelyingPartyId(): string {
  // Always use the full hostname — the RP ID must exactly match the origin's host
  return window.location.hostname;
}

/**
 * Initiate fingerprint registration
 * This prompts the user to enroll their fingerprint
 * @param username - User's username
 * @param email - User's email
 * @param challenge - Challenge from server (base64 encoded)
 * @returns Attestation object to send to backend
 */
export async function registerBiometric(
  username: string,
  email: string,
  challenge: string
) {
  try {
    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      throw new Error(
        'WebAuthn not supported in this browser. Please use a modern browser with fingerprint support.'
      );
    }

    // Check if platform authenticator is available (biometric sensor)
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
      throw new Error(
        'Biometric authenticator not available on this device. Please enable fingerprint or face recognition.'
      );
    }

    // Create a simple byte array for the user ID — kept for reference
    
    const attestation = await startRegistration({
      optionsJSON: {
        challenge: base64ToBase64url(challenge),
        rp: {
          name: 'BioVault',
          id: getRelyingPartyId(),
        },
        user: {
          id: bytesToBase64url(new TextEncoder().encode(email)),
          name: email,
          displayName: username,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
        timeout: 60000,
        attestation: 'direct',
      },
    });

    return attestation;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Fingerprint registration failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Initiate fingerprint authentication (login)
 * This prompts the user to verify their fingerprint
 * @param challenge - Challenge from backend (base64 encoded)
 * @returns Assertion object to send to backend
 */
export async function authenticateBiometric(challenge: string) {
  try {
    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      throw new Error(
        'WebAuthn not supported in this browser. Please use a modern browser with fingerprint support.'
      );
    }

    const assertion = await startAuthentication({
      optionsJSON: {
        challenge: base64ToBase64url(challenge),
        timeout: 60000,
        userVerification: 'preferred',
        rpId: getRelyingPartyId(),
      },
    });

    return assertion;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Fingerprint authentication failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if device supports biometric authentication
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) {
      console.warn('WebAuthn not supported in this browser');
      return false;
    }

    // Check if we're on HTTP with non-localhost origin
    const isInsecureContext = !window.isSecureContext && 
                             window.location.hostname !== 'localhost' && 
                             window.location.hostname !== '127.0.0.1';
    
    if (isInsecureContext) {
      console.warn('WebAuthn requires HTTPS for non-localhost origins. Current URL:', window.location.href);
      console.warn('Solution: Access via https://, localhost, or 127.0.0.1');
      return false;
    }

    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    
    if (!available) {
      console.warn('Platform authenticator (biometric) not available. Details:');
      console.warn('- Check if device has fingerprint/face recognition enabled');
      console.warn('- Browser may not support WebAuthn (use Chrome, Firefox, Safari, or Edge)');
      console.warn('- On some devices, you may need to update the browser');
    }
    
    return available;
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return false;
  }
}

/**
 * Convert credential to JSON for API transmission
 */
export function credentialToJSON(credential: any) {
  if (!credential) return null;

  if (credential.response) {
    // Attestation (registration response) — all binary fields must be base64url
    return {
      id: credential.id,
      rawId: credential.rawId,  // already base64url from @simplewebauthn/browser
      response: {
        clientDataJSON: credential.response.clientDataJSON,
        attestationObject: credential.response.attestationObject,
        transports: credential.response.transports ?? [],
      },
      type: credential.type,
    };
  }

  // Assertion (authentication response)
  return {
    id: credential.id,
    rawId: credential.rawId,
    response: {
      clientDataJSON: credential.response.clientDataJSON,
      authenticatorData: credential.response.authenticatorData,
      signature: credential.response.signature,
      userHandle: credential.response.userHandle ?? null,
    },
    type: credential.type,
  };
}
