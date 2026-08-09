// ---cut---
import { createClient } from "@supabase/supabase-js";
import { env } from "./env-config";
import multer from "multer";

export const LOGO_BUCKET = "logo"
export const PRODUCT_BUCKET = "products"

//  Supabase client
export const supabase = createClient(
  env.storage.superbaseUrl,
  env.storage.superbaseSecretKey,
);

//  multer
export const upload = multer({
  storage: multer.memoryStorage(),
});


