import fs from "fs";

/**
 * Vérifie les "magic bytes" (signature binaire) d'un fichier pour s'assurer
 * qu'il s'agit bien d'une image du type attendu, indépendamment de son
 * extension déclarée (qui peut être falsifiée facilement).
 *
 * Couvre les formats acceptés par l'app : JPEG, PNG, WebP, GIF, SVG.
 */
export function isValidImageFile(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(12);
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    )
      return true;
    // GIF: GIF87a / GIF89a
    if (buffer.toString("ascii", 0, 3) === "GIF") return true;
    // WebP: RIFF....WEBP
    if (
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    )
      return true;
    // SVG (texte, pas de magic bytes binaires fiables) : vérification légère
    const head = buffer.toString("utf8", 0, 12).trim().toLowerCase();
    if (head.startsWith("<?xml") || head.startsWith("<svg")) return true;

    return false;
  } catch {
    return false;
  }
}
