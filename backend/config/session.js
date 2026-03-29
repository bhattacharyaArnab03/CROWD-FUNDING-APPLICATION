import session from 'express-session';
import MongoStore from 'connect-mongo';

export function getSessionMiddleware(mongoUrl) {
  return session({
    secret: 'crowd-fund-session-secret-key', // Change this in production
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl,
      collectionName: 'sessions',
      ttl: 60 * 60 * 24, // 1 day
    }),
    cookie: {
      secure: false, // Set to true if using HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  });
}
