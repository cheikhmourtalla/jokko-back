import type { Request } from "express";
import { env } from "../config/env-config.js";

/**
 * Construit l'URL publique de base (protocole + host) à utiliser pour
 * exposer les fichiers uploadés (logos, images produits...).
 *
 * On se base en priorité sur la requête entrante (req.protocol + req.get("host")),
 * ce qui reflète toujours l'adresse réellement utilisée par le client
 * (fonctionne aussi bien en local qu'en production, derrière un proxy comme
 * Render, sans jamais dupliquer le port comme le faisait l'ancien code:
 * `${env.server}:${env.port}` -> "http://localhost:5000:5000").
 *
 * En dernier recours (pas de req disponible), on retombe sur env.SERVER
 * tel quel, sans y accoler de port supplémentaire.
 */
export function buildPublicBaseUrl(req?: Request): string {
  if (req) {
    const forwardedProto = req.headers["x-forwarded-proto"] as string | undefined;
    const protocol = forwardedProto?.split(",")[0]?.trim() || req.protocol;
    const host = req.get("host");
    if (host) {
      return `${protocol}://${host}`;
    }
  }

  // Fallback : ne pas concaténer le port si SERVER le contient déjà.
  const server = env.server || `http://localhost:${env.port}`;
  return server;
}
