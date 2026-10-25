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
  storage,
  ChatMessageItem,
  MemberProfile,
  handleFirestoreError,
  OperationType
} from '../services/firebase';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import {
  validateImageFile,
  processAndCompressImage,
  downloadPhoto
} from '../utils/imageHelper';
import { parseStorageError, checkStorageBucketHealth } from '../utils/storageErrorHelper';
import {
  Send,
  Smile,
  Users,
  User,
  ShieldAlert,
  Sparkles,
  Image as ImageIcon,
  Camera,
  Download,
  X,
  Loader2,
  Maximize2
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

  // Image message states
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [activePhotoModal, setActivePhotoModal] = useState<{
    url: string;
    caption?: string;
    sender: string;
    time?: any;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const activeChatUploadTaskRef = useRef<any>(null);

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

  const handleSelectImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Invalid file');
      return;
    }

    setSelectedImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);
  };

  const handleCancelImageAttachment = () => {
    if (isUploadingImage && activeChatUploadTaskRef.current) {
      try {
        activeChatUploadTaskRef.current.cancel();
      } catch (e) {
        console.warn('Chat upload cancel note:', e);
      }
    }
    activeChatUploadTaskRef.current = null;
    setSelectedImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    setImageCaption('');
    setUploadProgress(0);
    setIsUploadingImage(false);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleSendImageMessage = async () => {
    if (!selectedImageFile || !currentUid || !conversationId || isUploadingImage) return;

    setIsUploadingImage(true);
    setErrorMsg(null);
    setUploadProgress(5);

    let storagePath = '';
    let storageRef: any = null;

    try {
      // Fast check: verify Firebase Storage bucket is initialized
      await checkStorageBucketHealth();

      // Step 1: Compress image
      const processed = await processAndCompressImage(selectedImageFile);
      setUploadProgress(15);

      const timestamp = Date.now();
      const sanitizedName = selectedImageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      storagePath = `chat/${conversationId}/${currentUid}/${timestamp}_${sanitizedName}`;
      storageRef = ref(storage, storagePath);

      // Step 2: Upload bytes with real progress
      const uploadTask = uploadBytesResumable(storageRef, processed.blob, {
        contentType: processed.mimeType
      });
      activeChatUploadTaskRef.current = uploadTask;

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const byteRatio = snapshot.bytesTransferred / snapshot.totalBytes;
            const progress = Math.min(70, Math.round(byteRatio * 70));
            setUploadProgress(15 + progress);
          }
        },
        (storageErr) => {
          console.warn('[Chat uploadTask state_changed error]:', storageErr.code, storageErr.message);
        }
      );

      // Await uploadTask Promise
      await uploadTask;
      activeChatUploadTaskRef.current = null;
      setUploadProgress(88);

      // Step 3: Get permanent download URL
      const downloadUrl = await getDownloadURL(storageRef);
      setUploadProgress(94);

      // Step 4: Write message and update conversation
      const messageId = `msg_${timestamp}_${Math.random().toString(36).substring(2, 6)}`;
      const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);

      const convRef = doc(db, 'conversations', conversationId);
      const participantIds =
        chatType === 'group'
          ? []
          : selectedFriend
          ? [currentUid, selectedFriend.uid]
          : [currentUid];

      await setDoc(
        convRef,
        {
          id: conversationId,
          type: chatType,
          participantIds,
          lastMessage: imageCaption.trim() ? `📷 ${imageCaption.trim()}` : '📷 Photo',
          lastMessageSender: currentDisplayName,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      const newMsg: ChatMessageItem = {
        id: messageId,
        conversationId,
        senderId: currentUid,
        senderName: currentDisplayName,
        senderAvatar: currentAvatar,
        type: 'image',
        text: imageCaption.trim() || 'Photo snapshot',
        imageUrl: downloadUrl,
        storagePath,
        imageWidth: processed.width,
        imageHeight: processed.height,
        createdAt: serverTimestamp()
      };

      try {
        await setDoc(msgRef, newMsg);
      } catch (dbErr: any) {
        // Rollback orphaned Storage object if metadata save fails
        console.error('Chat message metadata write failed, rolling back storage file:', dbErr);
        if (storageRef) {
          try {
            await deleteObject(storageRef);
          } catch (cleanupErr) {
            console.warn('Chat storage cleanup rollback note:', cleanupErr);
          }
        }
        throw new Error(`Failed to deliver photo message: ${dbErr.message || 'Permission denied'}`);
      }

      setUploadProgress(100);
      handleCancelImageAttachment();
    } catch (err: any) {
      activeChatUploadTaskRef.current = null;
      const parsed = parseStorageError(err);
      setErrorMsg(parsed.userMessage);
      setUploadProgress(0);
    } finally {
      setIsUploadingImage(false);
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
                  className={`max-w-[78%] rounded-2xl p-2.5 shadow-xs transition-all ${
                    isMe
                      ? 'bg-gradient-to-br from-[#C44780] to-[#AD376E] text-white rounded-br-xs'
                      : 'bg-white text-[#493744] border border-[#F3E6EE] rounded-bl-xs'
                  }`}
                >
                  {!isMe && chatType === 'group' && (
                    <p className="text-[10px] font-bold text-[#C44780] mb-1 px-1">
                      {msg.senderName}
                    </p>
                  )}

                  {msg.type === 'image' && msg.imageUrl ? (
                    <div className="space-y-1.5">
                      <div
                        onClick={() =>
                          setActivePhotoModal({
                            url: msg.imageUrl!,
                            caption: msg.text !== 'Photo snapshot' ? msg.text : undefined,
                            sender: msg.senderName,
                            time: msg.createdAt
                          })
                        }
                        className="relative rounded-xl overflow-hidden bg-black/10 cursor-pointer group max-h-60"
                      >
                        <img
                          src={msg.imageUrl}
                          alt={msg.text || 'Photo attachment'}
                          loading="lazy"
                          className="w-full h-auto object-cover rounded-xl transition-transform group-hover:scale-102"
                        />
                        <div className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <Maximize2 size={12} />
                        </div>
                      </div>

                      {msg.text && msg.text !== 'Photo snapshot' && (
                        <p className="text-xs leading-relaxed px-1 whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed px-1 whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>
                  )}

                  <div
                    className={`flex items-center justify-end space-x-1 mt-1 text-[9px] px-1 ${
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

      {/* Image Attachment Preview Tray */}
      {imagePreviewUrl && (
        <div className="p-3 bg-[#FFE5EF]/60 border-t border-[#FFD2E4] shrink-0 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/10 shrink-0 border border-[#FFD2E4]">
                <img
                  src={imagePreviewUrl}
                  alt="Attachment preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#493744]">
                  Photo Attachment
                </p>
                <input
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  disabled={isUploadingImage}
                  placeholder="Add an optional caption... 🌸"
                  maxLength={500}
                  className="mt-1 w-full py-1 px-2.5 text-xs bg-white text-[#493744] border border-[#F3E6EE] rounded-xl focus:outline-none focus:border-[#C44780]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleCancelImageAttachment}
              disabled={isUploadingImage}
              className="p-1 rounded-full text-[#927F8C] hover:bg-[#FFE5EF] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {isUploadingImage && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-[#C44780]">
                <span>Sending photo...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-white h-1.5 rounded-full overflow-hidden border border-[#FFD2E4]">
                <div
                  className="bg-gradient-to-r from-[#C44780] to-[#E580B2] h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={handleCancelImageAttachment}
              disabled={isUploadingImage}
              className="py-1 px-3 bg-white text-[#493744] hover:bg-gray-100 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendImageMessage}
              disabled={isUploadingImage}
              className="py-1 px-3.5 bg-[#C44780] hover:bg-[#B03A70] text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1 transition-colors disabled:opacity-50"
            >
              {isUploadingImage ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send size={12} />
                  <span>Send Photo</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input for chat image attachment */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleSelectImageFile}
        className="hidden"
      />

      {/* Bottom Message Composer */}
      <form
        onSubmit={handleSendMessage}
        className="p-2.5 bg-[#FFF8F5] border-t border-[#F3E6EE] flex items-center space-x-1.5 shrink-0 safe-pb"
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          aria-label="Insert emoji"
          className="p-2 text-[#927F8C] hover:text-[#C44780] hover:bg-[#FFE5EF] rounded-xl transition-colors shrink-0"
        >
          <Smile size={19} />
        </button>

        {/* Image Attachment Button */}
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={!conversationId || isUploadingImage}
          aria-label="Attach photo"
          title="Share photo"
          className="p-2 text-[#927F8C] hover:text-[#C44780] hover:bg-[#FFE5EF] rounded-xl transition-colors shrink-0 disabled:opacity-50"
        >
          <ImageIcon size={19} />
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

      {/* Chat Photo Lightbox Modal */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-md w-full bg-[#1A1418] rounded-3xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
            <div className="p-3.5 flex items-center justify-between bg-black/40 border-b border-white/10 text-white">
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">
                  Sent by {activePhotoModal.sender}
                </p>
                <p className="text-[10px] text-white/60">
                  {formatFriendlyTime(activePhotoModal.time)}
                </p>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() =>
                    downloadPhoto(
                      activePhotoModal.url,
                      `chat_memory_${Date.now()}.jpg`
                    )
                  }
                  title="Download photo"
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => setActivePhotoModal(null)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-2 bg-black/60 overflow-hidden">
              <img
                src={activePhotoModal.url}
                alt={activePhotoModal.caption || 'Chat photo'}
                className="max-h-[60vh] max-w-full object-contain rounded-xl select-none"
              />
            </div>

            {activePhotoModal.caption && (
              <div className="p-3.5 bg-black/50 border-t border-white/10 text-white text-xs">
                <p className="italic text-white/90">
                  "{activePhotoModal.caption}"
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
