import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FOUR_FRIENDS, FriendPreset, QUICK_EMOJIS } from '../constants/friends';
import { getPrivateConversationId, formatFriendlyTime } from '../utils/friendship';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  db,
  ChatMessageItem,
  handleFirestoreError,
  OperationType
} from '../services/firebase';
import {
  Send,
  Smile,
  Users,
  User,
  CheckCheck,
  ShieldAlert,
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface ChatScreenProps {
  initialPrivateFriend?: FriendPreset | null;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ initialPrivateFriend }) => {
  const { member, activeFriend, user } = useAuth();
  const [chatType, setChatType] = useState<'group' | 'private'>(initialPrivateFriend ? 'private' : 'group');
  
  // Pick other friend for private chat (default to Palak, or initialPrivateFriend)
  const otherFriends = FOUR_FRIENDS.filter(
    (f) => f.email.toLowerCase() !== (member?.email || activeFriend.email).toLowerCase()
  );
  const [selectedFriend, setSelectedFriend] = useState<FriendPreset>(
    initialPrivateFriend || otherFriends[0] || FOUR_FRIENDS[0]
  );

  const [conversationsMap, setConversationsMap] = useState<Record<string, ChatMessageItem[]>>({});
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentUid = user?.uid || activeFriend.id;
  const currentDisplayName = member?.displayName || activeFriend.name;
  const currentAvatar = member?.avatarUrl || activeFriend.avatarBg;

  // Active conversation ID
  const conversationId = chatType === 'group'
    ? 'group_triobloom'
    : getPrivateConversationId(currentUid, selectedFriend.id);

  const messages = conversationsMap[conversationId] || [];

  // When initialPrivateFriend prop changes
  useEffect(() => {
    if (initialPrivateFriend) {
      setSelectedFriend(initialPrivateFriend);
      setChatType('private');
    }
  }, [initialPrivateFriend]);

  // Ensure conversation root document exists
  const ensureConversationDocument = async () => {
    const convRef = doc(db, 'conversations', conversationId);
    const participantIds = chatType === 'group'
      ? FOUR_FRIENDS.map(f => f.id).concat(user?.uid ? [user.uid] : [])
      : [currentUid, selectedFriend.id];

    try {
      await setDoc(convRef, {
        id: conversationId,
        type: chatType,
        participantIds: Array.from(new Set(participantIds)),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn('Conversation document init note:', e);
    }
  };

  // Real-time listener for messages
  useEffect(() => {
    setLoading(true);
    setErrorMsg(null);
    ensureConversationDocument();

    const messagesCol = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCol, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ChatMessageItem[] = [];
        snapshot.forEach((snap) => {
          list.push({ id: snap.id, ...snap.data() } as ChatMessageItem);
        });
        if (list.length > 0) {
          setConversationsMap((prev) => ({ ...prev, [conversationId]: list }));
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Chat listener note:', err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [conversationId, chatType]);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || sending) return;

    if (textToSend.length > 1000) {
      setErrorMsg('Message is too long (max 1000 characters).');
      return;
    }

    setSending(true);
    setErrorMsg(null);
    setInputText('');
    setShowEmojiPicker(false);

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);

    const newMsg: ChatMessageItem = {
      id: messageId,
      conversationId,
      senderId: currentUid,
      senderName: currentDisplayName,
      senderAvatar: currentAvatar,
      text: textToSend,
      readBy: [currentUid],
      createdAt: new Date()
    };

    // Optimistic UI update scoped strictly to active conversationId
    setConversationsMap((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMsg]
    }));

    try {
      // 1. Ensure conversation metadata is fresh
      const convRef = doc(db, 'conversations', conversationId);
      const participantIds = chatType === 'group'
        ? FOUR_FRIENDS.map(f => f.id).concat(user?.uid ? [user.uid] : [])
        : [currentUid, selectedFriend.id];

      await setDoc(convRef, {
        id: conversationId,
        type: chatType,
        participantIds: Array.from(new Set(participantIds)),
        lastMessage: textToSend.substring(0, 50),
        lastMessageSender: currentDisplayName,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 2. Insert message
      await setDoc(msgRef, {
        ...newMsg,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Firestore message save note (using local state):', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-125px)] max-h-[820px] bg-white rounded-3xl border border-[#F3E6EE] shadow-card overflow-hidden">
      {/* Chat Sub-Navigation Bar */}
      <div className="p-2.5 bg-[#FFF8F5] border-b border-[#F3E6EE] shrink-0">
        <div className="grid grid-cols-2 gap-2 bg-white/80 p-1 rounded-2xl border border-[#F3E6EE]">
          <button
            onClick={() => setChatType('group')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              chatType === 'group'
                ? 'bg-[#C44780] text-white shadow-xs'
                : 'text-[#927F8C] hover:text-[#493744]'
            }`}
          >
            <Users size={15} />
            <span>Group Chat 🌸</span>
          </button>

          <button
            onClick={() => setChatType('private')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              chatType === 'private'
                ? 'bg-[#C44780] text-white shadow-xs'
                : 'text-[#927F8C] hover:text-[#493744]'
            }`}
          >
            <User size={15} />
            <span>Private Chat 💌</span>
          </button>
        </div>

        {/* Private Chat Friend Selector */}
        {chatType === 'private' && (
          <div className="mt-2 pt-2 border-t border-[#F3E6EE] flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-bold text-[#927F8C] shrink-0 pl-1">
              With:
            </span>
            {otherFriends.map((friend) => {
              const isSelected = selectedFriend.id === friend.id;
              return (
                <button
                  key={friend.id}
                  onClick={() => setSelectedFriend(friend)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-[#FFE5EF] text-[#C44780] border border-[#FFD2E4] shadow-xs'
                      : 'bg-white text-[#927F8C] border border-[#F3E6EE] hover:border-[#FFD2E4]'
                  }`}
                >
                  <span className="text-xs">{friend.flowerEmoji}</span>
                  <span>{friend.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Header Info Pill */}
      <div className="px-4 py-2 bg-[#FFF8F5]/50 border-b border-[#F7EDF3] flex items-center justify-between text-[11px] text-[#927F8C] shrink-0">
        <div className="flex items-center space-x-1.5 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-[#493744] truncate">
            {chatType === 'group'
              ? 'TrioBloom Secret Room (Palak, Priya, Hanshika & You)'
              : `Private Whisper with ${selectedFriend.name} ${selectedFriend.flowerEmoji}`}
          </span>
        </div>
        <span className="text-[10px] text-[#C44780] bg-[#FFE5EF] px-2 py-0.5 rounded-full font-bold shrink-0 ml-2">
          End-to-End Isolated
        </span>
      </div>

      {/* Scrollable Messages Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FFFDFE] scroll-smooth"
      >
        {loading ? (
          <div className="text-center py-12">
            <span className="text-2xl animate-spin inline-block">🌸</span>
            <p className="text-xs text-[#927F8C] mt-2 font-medium">Listening to garden whispers...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FFE5EF] flex items-center justify-center text-3xl mb-3 border border-[#FFD2E4]">
              {chatType === 'group' ? '🌷' : selectedFriend.flowerEmoji}
            </div>
            <h4 className="text-sm font-bold text-[#493744]">
              {chatType === 'group' ? 'Start our group story' : `Say hi to ${selectedFriend.name}!`}
            </h4>
            <p className="text-xs text-[#927F8C] mt-1 max-w-xs mx-auto">
              {chatType === 'group'
                ? 'Send your first thought, plan tomorrow’s coffee, or share a sweet reel idea 🌸'
                : `A private and safe space just for you and ${selectedFriend.name}. No one else can read this.`}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUid;
            return (
              <div
                key={msg.id}
                className={`flex items-end space-x-2 ${
                  isMe ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Sender Avatar (only for others) */}
                {!isMe && (
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-[10px] border shrink-0 ${
                      msg.senderAvatar || 'bg-purple-100 text-purple-600 border-purple-300'
                    }`}
                  >
                    {msg.senderName ? msg.senderName[0] : '🌸'}
                  </div>
                )}

                <div
                  className={`max-w-[75%] rounded-2xl p-3 shadow-xs transition-all ${
                    isMe
                      ? 'bg-gradient-to-br from-[#C44780] to-[#AD376E] text-white rounded-br-xs'
                      : 'bg-white text-[#493744] border border-[#F3E6EE] rounded-bl-xs'
                  }`}
                >
                  {/* Sender Name in group chat for other users */}
                  {!isMe && chatType === 'group' && (
                    <p className="text-[10px] font-bold text-[#C44780] mb-0.5">
                      {msg.senderName}
                    </p>
                  )}

                  <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>

                  <div
                    className={`flex items-center justify-end space-x-1 mt-1 text-[9px] ${
                      isMe ? 'text-pink-100' : 'text-[#927F8C]'
                    }`}
                  >
                    <span>{formatFriendlyTime(msg.createdAt)}</span>
                    {isMe && <CheckCheck size={12} className="text-pink-200" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1.5">
            <ShieldAlert size={14} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Quick Emojis Drawer */}
      {showEmojiPicker && (
        <div className="p-2 bg-[#FFF8F5] border-t border-[#F3E6EE] flex items-center justify-around shrink-0">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setInputText((prev) => prev + emoji)}
              className="text-lg hover:scale-125 transition-transform p-1 select-none"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Message Composer */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-[#FFF8F5] border-t border-[#F3E6EE] flex items-center space-x-2 shrink-0 safe-pb"
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          aria-label="Insert emoji"
          className="p-2 text-[#927F8C] hover:text-[#C44780] hover:bg-[#FFE5EF] rounded-xl transition-colors shrink-0"
        >
          <Smile size={20} />
        </button>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            chatType === 'group'
              ? 'Message Palak, Priya, Hanshika & You...'
              : `Whisper something sweet to ${selectedFriend.name}...`
          }
          rows={1}
          maxLength={1000}
          className="flex-1 py-2 px-3 text-xs bg-white text-[#493744] border border-[#F3E6EE] rounded-2xl focus:outline-none focus:border-[#C44780] focus:ring-1 focus:ring-[#FFE5EF] resize-none max-h-20 placeholder:text-[#927F8C] transition-all"
        />

        <button
          type="submit"
          disabled={sending || !inputText.trim()}
          aria-label="Send message"
          className="p-2.5 bg-[#C44780] hover:bg-[#B03A70] text-white rounded-2xl shadow-soft disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
