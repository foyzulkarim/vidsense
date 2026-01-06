import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../index';
import type { VideoAttributes, VideoStatus } from '@/types';

// Define optional attributes for creation
interface VideoCreationAttributes extends Optional<VideoAttributes, 'id' | 'webmPath' | 'durationSeconds' | 'resolution' | 'hasAudio' | 'fileSizeBytes' | 'errorMessage' | 'frameCount' | 'framePaths' | 'createdAt' | 'deletedAt'> {}

class Video extends Model<VideoAttributes, VideoCreationAttributes> implements VideoAttributes {
  declare id: string;
  declare originalFilename: string;
  declare filePath: string;
  declare webmPath: string | null;
  declare durationSeconds: number | null;
  declare resolution: string | null;
  declare hasAudio: boolean;
  declare fileSizeBytes: number | null;
  declare status: VideoStatus;
  declare errorMessage: string | null;
  declare frameCount: number | null;
  declare framePaths: string[] | null;
  declare createdAt: Date;
  declare expiresAt: Date;
  declare deletedAt: Date | null;
}

Video.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    originalFilename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'original_filename',
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'file_path',
    },
    webmPath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'webm_path',
    },
    durationSeconds: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'duration_seconds',
    },
    resolution: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    hasAudio: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_audio',
    },
    fileSizeBytes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'file_size_bytes',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'uploading',
      validate: {
        isIn: [['uploading', 'converting', 'extracting', 'processing', 'ready', 'error', 'deleted']],
      },
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message',
    },
    frameCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'frame_count',
    },
    framePaths: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'frame_paths',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    sequelize,
    tableName: 'videos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    paranoid: false,
  }
);

export default Video;
