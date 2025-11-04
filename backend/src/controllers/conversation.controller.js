// ============================================
// RE-EXPORT FROM SUB-CONTROLLERS
// ============================================

// CRUD Operations
export {
  getUserConversations,
  getConversationById,
} from "./conversation/crud.controller.js";

// Create Conversations
export {
  createDirectConversation,
  createGroupConversation,
} from "./conversation/create.controller.js";

// Participant Management
export {
  addParticipant,
  removeParticipant,
  leaveConversation,
  updateParticipantRole,
  getParticipants,
} from "./conversation/participant.controller.js";

// Settings & Actions
export {
  updateConversation,
  deleteConversation,
  updateSettings,
  toggleMute,
  toggleArchive,
  markAsRead,
  togglePinMessage,
} from "./conversation/settings.controller.js";

// Search
export {
  searchConversations,
} from "./conversation/search.controller.js";

// Default export for backward compatibility
export default {
  // CRUD
  getUserConversations,
  getConversationById,

  // Create
  createDirectConversation,
  createGroupConversation,

  // Participants
  addParticipant,
  removeParticipant,
  leaveConversation,
  updateParticipantRole,
  getParticipants,

  // Settings
  updateConversation,
  deleteConversation,
  updateSettings,
  toggleMute,
  toggleArchive,
  markAsRead,
  togglePinMessage,

  // Search
  searchConversations,
};
