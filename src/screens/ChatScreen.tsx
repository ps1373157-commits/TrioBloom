import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPrivateConversationId, formatFriendlyTime } from '../utils/friendship';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  where
} from 'firebase/firestore';
import {
  db,
  ChatMessageItem,
  MemberProfile,
  handleFirestoreError,
  OperationType
} from '../services/firebase';
import {
  Send,
  Smile,
  Users,
  User,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { QUICK_EMOJIS } from '../constants/friends';

interface ChatScreenProps {
  initialTargetMember?: MemberProfile | null;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ initialTargetMember }) => {
  const { member, user } = useAuth();
  const [chatType, setChatType] = useState<'group' | 'private'>(initialTargetMember ? 'private' : 'group');
  
  const [approvedFriends, setApprovedFriends] = useState<MemberProfile[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<MemberProfile | null>(initialTargetMember || null);

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentUid = user?.uid;
  const currentDisplayName = member?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Friend';
  const currentAvatar = member?.avatarUrl || 'bg-pink-100 text-pink-600 border-pink-300';

  // Listen to approved friends from Firestore
  useEffect(() => {
    if (!currentUid) return;

    try {
      const q = query(collection(db, 'members'), where('isApproved', '==', true));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: MemberProfile[] = [];
          snapshot.forEach((snap) => {
            const data = snap.data() as MemberProfile;
            if (data.uid !== currentUid) {
              list.push(data);
            }
          });
          setApprovedFriends(list);

          // If no friend selected yet or current selection is invalid, pick first
          setSelectedFriend((prev) => {
            if (prev && list.some(f => f.uid === prev.uid)) {
              return prev;
            }
            return initialTargetMember || list[0] || null;
          });
        },
        (err) => {
          console.warn('Chat friends listener note:', err.message);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Friends query note:', e);
    }
  }, [currentUid, initialTargetMember]);

  // Compute active conversation ID
  const conversationId = chatType === 'group'
    ? 'group_triobloom'
    : selectedFriend && currentUid
    ? getPrivateConversationId(currentUid, selectedFriend.uid)
    : null;

  // Real-time listener for messages in the active conversation
  useEffect(() => {
    if (!conversationId || !currentUid) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const messagesCol = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCol, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ChatMessageItem[] = [];
        snapshot.forEach((snap) => {
          list.push({ id: snap.id, ...snap.data() } as ChatMessageItem);
        });
        setMessages(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Chat messages listener note:', err.message);
        setErrorMsg('Private conversation channel syncing or awaiting your first message.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [conversationId, currentUid]);

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
    if (!textToSend || sending || !currentUid || !conversationId) return;

    if (textToSend.length > 1000) {
      setErrorMsg('Message is too long (maximum 1000 characters).');
      return;
    }

    setSending(true);
    setErrorMsg(null);
    setInputText('');
    setShowEmojiPicker(false);

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);

    try {
      // 1. Ensure conversation metadata exists and is updated
      const convRef = doc(db, 'conversations', conversationId);
      const participantIds = chatType === 'group'
        ? [] // group chat is verified by isCurrentApprovedMember in rules
        : selectedFriend
        ? [currentUid, selectedFriend.uid]
        : [currentUid];

      await setDoc(
        convRef,
        {
          id: conversationId,
          type: chatType,
          participantIds,
          lastMessage: textToSend.substring(0, 50),
          lastMessageSender: currentDisplayName,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      // 2. Add message document
      const newMsg: ChatMessageItem = {
        id: messageId,
        conversationId,
        senderId: currentUid,
        senderName: currentDisplayName,
        senderAvatar: currentAvatar,
        text: textToSend,
        createdAt: serverTimestamp()
      };

      await setDoc(msgRef, newMsg);
    } catch (err: any) {
      console.error('Send message error:', err);
      try {
        handleFirestoreError(err, OperationType.CREATE, `conversations/${conversationId}/messages/${messageId}`);
      } catch (e: any) {
        setErrorMsg('Could not send message: ' + (e.message || 'Permission denied'));
        setInputText(textToSend); // Restore unsent text
      }
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
    <div className="flex flex-col h-[calc(100vh-130px)] max-h-[820px] bg-white rounded-3xl border border-[#F3E6EE] shadow-card overflow-hidden">
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
            {approvedFriends.length > 0 ? (
              approvedFriends.map((friend) => {
                const isSelected = selectedFriend?.uid === friend.uid;
                const letter = friend.displayName ? friend.displayName[0].toUpperCase() : '🌸';

                return (
                  <button
                    key={friend.uid}
                    onClick={() => setSelectedFriend(friend)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-[#FFE5EF] text-[#C44780] border border-[#FFD2E4] shadow-xs'
                        : 'bg-white text-[#927F8C] border border-[#F3E6EE] hover:border-[#FFD2E4]'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-[#FFE5EF] text-[10px] flex items-center justify-center font-bold text-[#C44780]">
                      {letter}
                    </span>
                    <span>{friend.displayName}</span>
                  </button>
                );
              })
            ) : (
              <span className="text-[11px] text-[#927F8C] italic">
                Awaiting other friends to be approved in circle.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Header Info Pill */}
      <div className="px-4 py-2 bg-[#FFF8F5]/50 border-b border-[#F7EDF3] flex items-center justify-between text-[11px] text-[#927F8C] shrink-0">
        <div className="flex items-center space-x-1.5 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-semibold text-[#493744] truncate">
            {chatType === 'group'
              ? 'TrioBloom Group Sanctuary'
              : selectedFriend
              ? `Private Chat with ${selectedFriend.displayName} 🌸`
              : 'Select a friend to begin private whisper'}
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
            <p className="text-xs text-[#927F8C] mt-2 font-medium">Connecting to garden chat...</p>
          </div>
        ) : !conversationId ? (
          <div className="text-center py-12 px-4">
            <p className="text-xs text-[#927F8C]">Please select an approved friend above to start chatting.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FFE5EF] flex items-center justify-center text-3xl mb-3 border border-[#FFD2E4]">
              {chatType === 'group' ? '🌷' : '💌'}
            </div>
            <h4 className="text-sm font-bold text-[#493744]">
              {chatType === 'group'
                ? 'Start our circle story'
                : selectedFriend
                ? `Say hi to ${selectedFriend.displayName}!`
                : 'Start a whisper'}
            </h4>
            <p className="text-xs text-[#927F8C] mt-1 max-w-xs mx-auto">
              {chatType === 'group'
                ? 'Send a warm thought, plan tomorrow’s coffee, or share your day 🌸'
                : 'A private and safe space just for the two of you. Isolated on Firestore.'}
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
                  className={`max-w-[78%] rounded-2xl p-3 shadow-xs transition-all ${
                    isMe
                      ? 'bg-gradient-to-br from-[#C44780] to-[#AD376E] text-white rounded-br-xs'
                      : 'bg-white text-[#493744] border border-[#F3E6EE] rounded-bl-xs'
                  }`}
                >
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
          disabled={!conversationId}
          placeholder={
            !conversationId
              ? 'Select an approved friend above...'
              : chatType === 'group'
              ? 'Message the circle...'
              : `Whisper to ${selectedFriend?.displayName || 'friend'}...`
          }
          rows={1}
          maxLength={1000}
          className="flex-1 py-2 px-3 text-xs bg-white text-[#493744] border border-[#F3E6EE] rounded-2xl focus:outline-none focus:border-[#C44780] focus:ring-1 focus:ring-[#FFE5EF] resize-none max-h-20 placeholder:text-[#927F8C] transition-all disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={sending || !inputText.trim() || !conversationId}
          aria-label="Send message"
          className="p-2.5 bg-[#C44780] hover:bg-[#B03A70] text-white rounded-2xl shadow-soft disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
