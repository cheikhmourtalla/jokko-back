import dotenv from "dotenv";

if (process.env.NODE_ENV === "production") {
  dotenv.config();
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
  },
  secret: {
    jwt: data.JWT_SECRET as string,
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

// console.log(env);
