import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { db, WallPostItem, handleFirestoreError, OperationType } from '../services/firebase';
import { FLOWER_STICKERS, QUICK_EMOJIS } from '../constants/friends';
import { formatFriendlyTime, filterPostsBySticker } from '../utils/friendship';
import { Heart, Trash2, Send, Smile, AlertCircle, Camera, Sparkles } from 'lucide-react';
import { PhotoWall } from '../components/PhotoWall';

interface WallScreenProps {
  initialView?: 'notes' | 'photos';
}

export const WallScreen: React.FC<WallScreenProps> = ({ initialView = 'notes' }) => {
  const { member, user, isAdmin } = useAuth();
  const [wallTab, setWallTab] = useState<'notes' | 'photos'>(initialView);
  const [posts, setPosts] = useState<WallPostItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [content, setContent] = useState<string>('');
  const [selectedSticker, setSelectedSticker] = useState<string>(FLOWER_STICKERS[0].id);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  useEffect(() => {
    if (initialView) {
      setWallTab(initialView);
    }
  }, [initialView]);

  const currentUid = user?.uid;
  const currentDisplayName = member?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Friend';
  const currentAvatar = member?.avatarUrl || 'bg-pink-100 text-pink-600 border-pink-300';

  // Real-time Firestore listener for Wall posts
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'wall_posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: WallPostItem[] = [];
        snapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as WallPostItem);
        });
        setPosts(fetched);
        setLoading(false);
      },
      (err) => {
        console.warn('Error fetching wall posts:', err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Submit memory post with real Firestore persistence
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid) return;

    if (!content.trim()) {
      setErrorMsg('Please write a sweet memory or note before blooming! 🌸');
      return;
    }
    if (content.length > 2000) {
      setErrorMsg('Memories can be up to 2000 characters. Please shorten slightly.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newPost: WallPostItem = {
      id: postId,
      authorId: currentUid,
      authorName: currentDisplayName,
      authorAvatar: currentAvatar,
      content: content.trim(),
      flowerSticker: selectedSticker,
      likesCount: 0,
      likedBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'wall_posts', postId), newPost);
      setContent('');
      setShowEmojiPicker(false);
    } catch (err: any) {
      console.error('Failed to post memory:', err);
      try {
        handleFirestoreError(err, OperationType.CREATE, `wall_posts/${postId}`);
      } catch (e: any) {
        setErrorMsg('Could not share memory: ' + (e.message || 'Permission denied'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Heart reaction with server-enforced bounds
  const handleToggleLike = async (post: WallPostItem) => {
    if (!currentUid) return;
    const isLiked = post.likedBy?.includes(currentUid);
    const postRef = doc(db, 'wall_posts', post.id);

    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likedBy: arrayRemove(currentUid),
          likesCount: increment(-1),
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(postRef, {
          likedBy: arrayUnion(currentUid),
          likesCount: increment(1),
          updatedAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.warn('Error liking post in Firestore:', err.message);
    }
  };

  // Delete post (author or admin only)
  const handleDeletePost = async (postId: string, authorId: string) => {
    if (authorId !== currentUid && !isAdmin) return;
    if (!window.confirm('Are you sure you want to remove this memory? 🌷')) return;

    try {
      await deleteDoc(doc(db, 'wall_posts', postId));
    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `wall_posts/${postId}`);
      } catch (e: any) {
        setErrorMsg('Could not remove memory: ' + e.message);
      }
    }
  };

  const filteredPosts = filterPostsBySticker(posts, activeFilter);

  return (
    <div className="space-y-4 pb-6">
      {/* Top Segmented View Switcher */}
      <div className="grid grid-cols-2 gap-1.5 bg-[#FFF0F6] p-1.5 rounded-2xl border border-[#FFD2E4]">
        <button
          onClick={() => setWallTab('notes')}
          className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
            wallTab === 'notes'
              ? 'bg-[#C44780] text-white shadow-xs'
              : 'text-[#927F8C] hover:text-[#493744]'
          }`}
        >
          <span>🌸</span>
          <span>Memory Notes</span>
        </button>
        <button
          onClick={() => setWallTab('photos')}
          className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
            wallTab === 'photos'
              ? 'bg-[#C44780] text-white shadow-xs'
              : 'text-[#927F8C] hover:text-[#493744]'
          }`}
        >
          <span>📸</span>
          <span>Photo Wall</span>
        </button>
      </div>

      {wallTab === 'photos' ? (
        <PhotoWall />
      ) : (
        <>
          {/* Wall Header Banner */}
          <div className="bg-gradient-to-r from-[#FFE5EF] via-[#FFF5F8] to-[#F0E8FF] rounded-3xl p-4 border border-[#FFD2E4] shadow-soft">
            <div className="flex items-center space-x-2.5">
              <span className="text-2xl select-none animate-petal">🌸</span>
              <div>
                <h2 className="text-base font-bold text-[#493744]">
                  Friendship Wall
                </h2>
                <p className="text-xs text-[#927F8C]">
                  Leave loving notes, core memories & daily smiles for the four of us 🌷
                </p>
              </div>
            </div>
          </div>

      {/* Composer Card */}
      <div className="bg-white rounded-3xl p-4 border border-[#F3E6EE] shadow-soft">
        <form onSubmit={handleCreatePost} className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${currentAvatar}`}>
              {currentDisplayName ? currentDisplayName[0].toUpperCase() : '🌸'}
            </div>
            <span className="text-xs font-bold text-[#493744]">
              Blooming as <span className="text-[#C44780]">{currentDisplayName}</span>
            </span>
          </div>

          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a sweet memory, inside joke, or heartfelt gratitude... 🌸"
              rows={3}
              className="w-full p-3 text-xs text-[#493744] bg-[#FFF8F5] border border-[#F3E6EE] rounded-2xl focus:outline-none focus:border-[#C44780] focus:ring-1 focus:ring-[#FFE5EF] resize-none transition-all placeholder:text-[#927F8C]"
              maxLength={2000}
            />
            <div className="absolute right-3 bottom-2 text-[10px] text-[#927F8C]">
              {content.length}/2000
            </div>
          </div>

          {/* Sticker & Tag Selector */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#927F8C] block mb-1.5">
              Choose a Flower Tag 🌸
            </span>
            <div className="flex flex-wrap gap-1.5">
              {FLOWER_STICKERS.map((stk) => {
                const isSelected = selectedSticker === stk.id;
                return (
                  <button
                    type="button"
                    key={stk.id}
                    onClick={() => setSelectedSticker(stk.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all flex items-center space-x-1 ${
                      isSelected
                        ? 'bg-[#C44780] text-white shadow-xs font-semibold'
                        : 'bg-[#FFF8F5] text-[#493744] border border-[#F3E6EE] hover:border-[#FFD2E4]'
                    }`}
                  >
                    <span>{stk.emoji}</span>
                    <span>{stk.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Emojis Drawer */}
          {showEmojiPicker && (
            <div className="p-2 bg-[#FFF8F5] rounded-2xl border border-[#F3E6EE] flex flex-wrap gap-2">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setContent((prev) => prev + emoji)}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-[#FFE5EF] flex items-center justify-center text-base transition-transform hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-500 hover:text-rose-800 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Post Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 rounded-xl text-[#927F8C] hover:text-[#C44780] hover:bg-[#FFE5EF]/50 transition-colors flex items-center space-x-1 text-xs"
            >
              <Smile size={16} />
              <span>Emojis</span>
            </button>

            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-4 py-2 bg-gradient-to-r from-[#C44780] to-[#B03A70] hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-soft flex items-center space-x-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{submitting ? 'Blooming...' : 'Post Memory'}</span>
              <Send size={13} />
            </button>
          </div>
        </form>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 px-1 scrollbar-none">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'all'
              ? 'bg-[#493744] text-white shadow-xs'
              : 'bg-white text-[#927F8C] border border-[#F3E6EE]'
          }`}
        >
          All Stories ({posts.length})
        </button>
        {FLOWER_STICKERS.map((stk) => {
          const isFilterActive = activeFilter === stk.id;
          const count = posts.filter(p => p.flowerSticker === stk.id).length;
          return (
            <button
              key={stk.id}
              onClick={() => setActiveFilter(stk.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1 ${
                isFilterActive
                  ? 'bg-[#C44780] text-white shadow-xs'
                  : 'bg-white text-[#927F8C] border border-[#F3E6EE]'
              }`}
            >
              <span>{stk.emoji}</span>
              <span>{stk.label}</span>
              {count > 0 && <span className="opacity-75 text-[10px]">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Feed List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-[#F3E6EE]">
            <span className="text-2xl animate-spin inline-block">🌸</span>
            <p className="text-xs text-[#927F8C] mt-2 font-medium">Gathering our sweetest memories...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white rounded-3xl border border-[#F3E6EE] shadow-soft">
            <span className="text-4xl select-none inline-block animate-petal">🌷</span>
            <h3 className="text-sm font-bold text-[#493744] mt-2">
              No memories bloomed here yet
            </h3>
            <p className="text-xs text-[#927F8C] mt-1 max-w-xs mx-auto">
              Our friendship wall is ready for your stories, polaroid memories, and loving notes!
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isLiked = currentUid ? post.likedBy?.includes(currentUid) : false;
            const canDelete = post.authorId === currentUid || isAdmin;

            return (
              <div
                key={post.id}
                className="bg-white rounded-3xl p-4 border border-[#F3E6EE] shadow-soft hover:shadow-card transition-all relative overflow-hidden"
              >
                {/* Post Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs border ${
                        post.authorAvatar || 'bg-pink-100 text-pink-600 border-pink-300'
                      }`}
                    >
                      {post.authorName ? post.authorName[0].toUpperCase() : '🌸'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h4 className="text-xs font-bold text-[#493744]">
                          {post.authorName}
                        </h4>
                        {post.flowerSticker && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FFE5EF] text-[#C44780] text-[10px] font-semibold">
                            {post.flowerSticker}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#927F8C] mt-0.5">
                        {formatFriendlyTime(post.createdAt)}
                      </p>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeletePost(post.id, post.authorId)}
                      aria-label="Delete memory"
                      className="text-[#927F8C] hover:text-rose-500 p-1.5 rounded-xl hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Content */}
                <p className="text-xs text-[#493744] leading-relaxed whitespace-pre-wrap mt-3 pl-1">
                  {post.content}
                </p>

                {/* Footer Reactions */}
                <div className="mt-3 pt-3 border-t border-[#F7EDF3] flex items-center justify-between">
                  <button
                    onClick={() => handleToggleLike(post)}
                    className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      isLiked
                        ? 'bg-[#FFE5EF] text-[#C44780] scale-105 shadow-xs'
                        : 'bg-[#FFF8F5] text-[#927F8C] hover:text-[#C44780] hover:bg-[#FFE5EF]/50'
                    }`}
                  >
                    <Heart
                      size={14}
                      className={isLiked ? 'fill-[#C44780] text-[#C44780]' : ''}
                    />
                    <span>{post.likesCount || 0}</span>
                    <span className="text-[11px] font-medium">
                      {isLiked ? 'Loved' : 'Love'}
                    </span>
                  </button>

                  <span className="text-[10px] text-[#927F8C] italic">
                    TrioBloom Sanctuary
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
        </>
      )}
    </div>
  );
};
