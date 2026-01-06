require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'vidsense',
    password: process.env.DB_PASSWORD || 'localdev',
    database: process.env.DB_NAME || 'vidsense',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    define: {
      timestamps: true,
      underscored: true,
    },
  },
  test: {
    username: process.env.DB_USER || 'vidsense',
    password: process.env.DB_PASSWORD || 'localdev',
    database: process.env.DB_NAME || 'vidsense_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    define: {
      timestamps: true,
      underscored: true,
    },
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    define: {
      timestamps: true,
      underscored: true,
    },
  },
};
