import {asyncHandler} from '../utils/asyncHandler.js';
import {User} from '../models/User.js';
import {Conversation} from '../models/Conversation.js';
import {Message} from '../models/message.model.js';
import {apiResponse} from '../utils/apiResponse.js';
import{apiError} from '../utils/apiError.js';

const sendMessage = asyncHandler(async (req, res) => {
  const {conversationId, content} = req.body;
  if(!conversationId || !content){
    return apiError(res, 400, "conversationId and content are required");
  }
  const senderId = req.user._id;

});

const getMessages = asyncHandler(async (req, res) => {
  const {conversationId} = req.params;
  const userId = req.user._id;
});
 
const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
});

const markMessagesAsRead = async (conversationId, userId) => {
    await Message.updateMany(   
        { conversationId, senderId: { $ne: userId }, isRead: false },
        { isRead: true }
    );
};


export{
  sendMessage,
  getMessages,
  getConversations,
  markMessagesAsRead
};