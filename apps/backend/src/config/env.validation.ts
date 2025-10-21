import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  API_PORT: Joi.number().default(3000),
  API_GLOBAL_PREFIX: Joi.string().default('api'),
  ALLOWED_ORIGINS: Joi.string().allow('').default(''),

  MONGODB_URI: Joi.string().required(),
  MONGODB_DB_NAME: Joi.string().allow('', null),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: Joi.number().default(5000),

  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),
  FIREBASE_WEB_API_KEY: Joi.string().required(),
  FIREBASE_AUTH_EMULATOR_HOST: Joi.string().allow('', null),
});
