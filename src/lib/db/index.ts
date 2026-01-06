import { Sequelize } from 'sequelize';
import { config } from '@/config';

// Create Sequelize instance
const sequelize = new Sequelize(config.database.url, {
  dialect: 'postgres',
  logging: config.app.isDevelopment ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
}

export { sequelize };
export default sequelize;
