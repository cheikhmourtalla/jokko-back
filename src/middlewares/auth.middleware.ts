import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    shopId: number;
    email: string;
    role: string;
  };
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    // Support du token en query param pour EventSource (SSE)
    const queryToken = req.query.token as string | undefined;

    if (!authHeader && !queryToken) {
      return res.status(401).json({ message: "Accès non autorisé : token manquant" });
    }

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : queryToken;

    if (!token) {
      return res.status(401).json({ message: "Accès non autorisé : token manquant" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: number;
      shopId: number;
      email: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Accès non autorisé" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès interdit : permissions insuffisantes" });
    }
    next();
  };
};

// Middleware pour le Super Admin (JWT séparé)
export const protectSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Accès non autorisé" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: number;
      email: string;
      role: string;
    };

    if (decoded.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Réservé au super administrateur" });
    }

    req.user = { ...decoded, shopId: 0 };
    next();
  } catch {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};