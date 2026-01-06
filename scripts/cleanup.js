#!/usr/bin/env node

/**
 * Cleanup script for VidSense
 * Removes expired videos and their associated files
 *
 * Usage:
 *   node scripts/cleanup.js           # Run once
 *   node scripts/cleanup.js --daemon  # Run continuously (hourly)
 */

const { Sequelize, Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;

// Load environment variables
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://vidsense:localdev@localhost:5432/vidsense';
const UPLOAD_DIR = process.env.UPLOAD_DIR || './data/uploads';
const PROCESSED_DIR = process.env.PROCESSED_DIR || './data/processed';

// Initialize Sequelize
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

async function deleteDirectory(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    console.log(`  Deleted: ${dirPath}`);
    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`  Failed to delete ${dirPath}:`, error.message);
    }
    return false;
  }
}

async function cleanupExpiredVideos() {
  console.log(`[${new Date().toISOString()}] Starting cleanup...`);

  try {
    // Find expired videos
    const [videos] = await sequelize.query(`
      SELECT id, file_path, webm_path
      FROM videos
      WHERE expires_at < NOW()
        AND deleted_at IS NULL
    `);

    if (videos.length === 0) {
      console.log('No expired videos found.');
      return { deleted: 0, errors: 0 };
    }

    console.log(`Found ${videos.length} expired video(s) to clean up.`);

    let deleted = 0;
    let errors = 0;

    for (const video of videos) {
      console.log(`\nProcessing video: ${video.id}`);

      // Delete upload directory
      const uploadDir = path.join(process.cwd(), UPLOAD_DIR, video.id);
      await deleteDirectory(uploadDir);

      // Delete processed directory
      const processedDir = path.join(process.cwd(), PROCESSED_DIR, video.id);
      await deleteDirectory(processedDir);

      // Soft delete in database (or hard delete)
      try {
        await sequelize.query(`
          UPDATE videos
          SET deleted_at = NOW(), status = 'deleted'
          WHERE id = $1
        `, {
          bind: [video.id],
        });

        // Alternatively, hard delete (cascades to analysis, conversations, messages):
        // await sequelize.query('DELETE FROM videos WHERE id = $1', { bind: [video.id] });

        deleted++;
        console.log(`  Marked as deleted in database`);
      } catch (dbError) {
        console.error(`  Database error:`, dbError.message);
        errors++;
      }
    }

    console.log(`\nCleanup complete. Deleted: ${deleted}, Errors: ${errors}`);
    return { deleted, errors };
  } catch (error) {
    console.error('Cleanup failed:', error);
    return { deleted: 0, errors: 1 };
  }
}

async function main() {
  const isDaemon = process.argv.includes('--daemon');

  // Test database connection
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');
  } catch (error) {
    console.error('Unable to connect to database:', error);
    process.exit(1);
  }

  if (isDaemon) {
    console.log('Starting cleanup daemon (runs every hour)...');

    // Run immediately
    await cleanupExpiredVideos();

    // Then run every hour
    setInterval(async () => {
      await cleanupExpiredVideos();
    }, 60 * 60 * 1000); // 1 hour

    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\nShutting down cleanup daemon...');
      sequelize.close();
      process.exit(0);
    });
  } else {
    // Run once and exit
    const result = await cleanupExpiredVideos();
    await sequelize.close();
    process.exit(result.errors > 0 ? 1 : 0);
  }
}

main();
