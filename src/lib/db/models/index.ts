import Video from './Video';
import VideoAnalysis from './VideoAnalysis';
import Conversation from './Conversation';
import Message from './Message';

// Define associations
Video.hasOne(VideoAnalysis, {
  foreignKey: 'videoId',
  as: 'analysis',
  onDelete: 'CASCADE',
});

VideoAnalysis.belongsTo(Video, {
  foreignKey: 'videoId',
  as: 'video',
});

Video.hasMany(Conversation, {
  foreignKey: 'videoId',
  as: 'conversations',
  onDelete: 'CASCADE',
});

Conversation.belongsTo(Video, {
  foreignKey: 'videoId',
  as: 'video',
});

Conversation.hasMany(Message, {
  foreignKey: 'conversationId',
  as: 'messages',
  onDelete: 'CASCADE',
});

Message.belongsTo(Conversation, {
  foreignKey: 'conversationId',
  as: 'conversation',
});

export { Video, VideoAnalysis, Conversation, Message };
