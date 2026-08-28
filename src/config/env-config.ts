import dotenv from "dotenv";

if (process.env.NODE_ENV === "production") {
  dotenv.config({
    path : `.env.${process.env.NODE_ENV}`
  });
} else {
  dotenv.config({
    path: `.env.${process.env.NODE_ENV}.local`, // env file name + path
  });
}

const data = process.env;

const envMode = data.NODE_ENV;
export const env = {
  server: data.SERVER,
  port: Number(data.PORT) || 5000,
  logLevel: data.LOG_LEVEL,
  db: {
    url: data.DATABASE_URL,
    // directUrl : data.DIRECT_URL
  },
  secret: {
    jwt: data.JWT_SECRET as string,
  },
  storage : {
    superbaseUrl : data.SUPABASE_URL as string,
    superbaseSecretKey : data.SUPABASE_SECRET_KEY as string, 
    publicBucketsUrl : `${process.env.SUPABASE_URL}/storage/v1/object/public`
  },

  //  Mail
  mail: {
    host: data.MAIL_HOST,
    port: 2525,
    user: data.MAIL_USER,
    password: data.MAIL_PASSWORD,
    from: data.MAIL_FROM,
  },
  log: {
    logLevel: data.LOG_LEVEL,
  },
  frontendUrl: data.FRONTEND_URL,
  mode: envMode,
};


// console.log(env)