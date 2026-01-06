'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('videos', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      original_filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      webm_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      duration_seconds: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      resolution: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      has_audio: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      file_size_bytes: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(20),
        defaultValue: 'uploading',
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      frame_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      frame_paths: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add index on status for cleanup queries
    await queryInterface.addIndex('videos', ['status']);
    // Add index on expires_at for cleanup queries
    await queryInterface.addIndex('videos', ['expires_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('videos');
  },
};
