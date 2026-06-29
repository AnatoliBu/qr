import type { QRType, QRTypeDefinition } from "./qrTypes";

export const QR_TYPES: QRTypeDefinition[];

/**
 * Returns the definition for the given QR type.
 * Throws `Error("Unsupported QR type: ...")` if the type is unknown,
 * so the return value is always a valid definition.
 */
export function getTypeDefinition(type: QRType): QRTypeDefinition;
