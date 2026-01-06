import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../index';
import type { VideoAnalysisAttributes, EntitiesData, NarrativeEvent, SceneContext } from '@/types';

// Define optional attributes for creation
interface VideoAnalysisCreationAttributes extends Optional<VideoAnalysisAttributes, 'id' | 'entitiesJson' | 'narrativeJson' | 'sceneContextJson' | 'transcript' | 'comprehensiveSummary' | 'keyObservations' | 'rawModelOutputs' | 'processingTimeMs' | 'modelVersion' | 'createdAt'> {}

class VideoAnalysis extends Model<VideoAnalysisAttributes, VideoAnalysisCreationAttributes> implements VideoAnalysisAttributes {
  declare id: string;
  declare videoId: string;
  declare frameCount: number;
  declare entitiesJson: EntitiesData | null;
  declare narrativeJson: NarrativeEvent[] | null;
  declare sceneContextJson: SceneContext | null;
  declare transcript: string | null;
  declare comprehensiveSummary: string | null;
  declare keyObservations: string[] | null;
  declare rawModelOutputs: Record<string, unknown> | null;
  declare processingTimeMs: number | null;
  declare modelVersion: string | null;
  declare createdAt: Date;
}

VideoAnalysis.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    videoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'video_id',
      references: {
        model: 'videos',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    frameCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'frame_count',
    },
    entitiesJson: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'entities_json',
    },
    narrativeJson: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'narrative_json',
    },
    sceneContextJson: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'scene_context_json',
    },
    transcript: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    comprehensiveSummary: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'comprehensive_summary',
    },
    keyObservations: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'key_observations',
    },
    rawModelOutputs: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'raw_model_outputs',
    },
    processingTimeMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'processing_time_ms',
    },
    modelVersion: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'model_version',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'video_analysis',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

export default VideoAnalysis;
