'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('video_analysis', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      video_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'videos',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      frame_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      entities_json: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      narrative_json: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      scene_context_json: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      transcript: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      comprehensive_summary: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      key_observations: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      raw_model_outputs: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      processing_time_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      model_version: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // Add index on video_id for fast lookups
    await queryInterface.addIndex('video_analysis', ['video_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('video_analysis');
  },
};
