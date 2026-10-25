import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  startAfter,
  getDocs
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import {
  db,
  storage,
  PhotoItem,
  handleFirestoreError,
  OperationType
} from '../services/firebase';
import {
  validateImageFile,
  processAndCompressImage,
  downloadPhoto
} from '../utils/imageHelper';
import { formatFriendlyTime } from '../utils/friendship';
import { parseStorageError, checkStorageBucketHealth } from '../utils/storageErrorHelper';
import {
  Camera,
  Image as ImageIcon,
  Heart,
  Trash2,
  Download,
  X,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  Maximize2,
  Sparkles,
  Loader2,
  Plus,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';

const PAGE_SIZE = 12;

export const PhotoWall: React.FC = () => {
  const { user, member, isAdmin } = useAuth();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<any>(null);

  // Upload modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isBucketIssue, setIsBucketIssue] = useState<boolean>(false);

  // Full-screen viewer state
  const [activePhoto, setActivePhoto] = useState<PhotoItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadTaskRef = useRef<any>(null);

  const currentUid = user?.uid;
  const currentDisplayName =
    member?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Friend';
  const currentAvatar = member?.avatarUrl || 'bg-pink-100 text-pink-600 border-pink-300';

  // Real-time listener for the latest photos
  useEffect(() => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'photos'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: PhotoItem[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as PhotoItem);
          });
          setPhotos(list);
          setLoading(false);

          if (!snapshot.empty) {
            setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length >= PAGE_SIZE);
          } else {
            setHasMore(false);
          }
        },
        (err) => {
          console.warn('Photos listener error:', err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Photos query setup error:', err);
      setLoading(false);
    }
  }, []);

  // Pagination: Load more photos
  const handleLoadMore = async () => {
    if (!lastVisibleDoc || loadingMore) return;
    setLoadingMore(true);

    try {
      const qNext = query(
        collection(db, 'photos'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisibleDoc),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(qNext);
      if (!snapshot.empty) {
        const nextList: PhotoItem[] = [];
        snapshot.forEach((docSnap) => {
          nextList.push({ id: docSnap.id, ...docSnap.data() } as PhotoItem);
        });

        setPhotos((prev) => [...prev, ...nextList]);
        setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.warn('Error loading more photos:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Handle file selection from gallery or camera
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleCloseUploadModal = () => {
    if (uploading && activeUploadTaskRef.current) {
      try {
        activeUploadTaskRef.current.cancel();
      } catch (e) {
        console.warn('Cancel upload note:', e);
      }
    }
    activeUploadTaskRef.current = null;
    setIsUploadModalOpen(false);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setCaption('');
    setUploadProgress(0);
    setUploadStage('');
    setUploadError(null);
    setIsBucketIssue(false);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Perform upload: client-side compression -> Firebase Storage -> Firestore metadata
  const handleUploadPhoto = async () => {
    if (!selectedFile || !currentUid) return;
    setUploading(true);
    setUploadError(null);
    setIsBucketIssue(false);
    setUploadProgress(5);
    setUploadStage('Validating image file...');

    let storagePath = '';
    let storageRef: any = null;

    try {
      // Fast check: verify Firebase Storage bucket is initialized before attempting upload
      await checkStorageBucketHealth();

      // Stage 1: Client-side compression and aspect-ratio extraction
      setUploadStage('Compressing image for mobile...');
      const processed = await processAndCompressImage(selectedFile);
      setUploadProgress(20);

      // Stage 2: Firebase Storage upload
      setUploadStage('Uploading to Garden Storage...');
      const timestamp = Date.now();
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      storagePath = `photos/${currentUid}/${timestamp}_${sanitizedName}`;
      storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, processed.blob, {
        contentType: processed.mimeType
      });
      activeUploadTaskRef.current = uploadTask;

      // Real byte-progress tracking
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const byteRatio = snapshot.bytesTransferred / snapshot.totalBytes;
            const progress = Math.min(65, Math.round(byteRatio * 65));
            setUploadProgress(20 + progress);
            setUploadStage(
              `Uploading photo bytes (${Math.round((snapshot.bytesTransferred / 1024))} KB / ${Math.round((snapshot.totalBytes / 1024))} KB)...`
            );
          }
        },
        (storageErr) => {
          console.warn('[uploadTask state_changed error]:', storageErr.code, storageErr.message);
        }
      );

      // Await standard StorageTask Promise
      await uploadTask;
      activeUploadTaskRef.current = null;
      setUploadProgress(85);

      // Stage 3: Retrieve permanent download URL
      setUploadStage('Retrieving photo download link...');
      const downloadUrl = await getDownloadURL(storageRef);
      setUploadProgress(92);

      // Stage 4: Save metadata document to Firestore /photos/{photoId}
      setUploadStage('Saving memory to Wall...');
      const photoId = `photo_${timestamp}_${Math.random().toString(36).substring(2, 6)}`;
      const photoData: PhotoItem = {
        id: photoId,
        uploaderId: currentUid,
        uploaderName: currentDisplayName,
        uploaderAvatar: currentAvatar,
        storagePath,
        downloadUrl,
        caption: caption.trim() || undefined,
        aspectRatio: processed.aspectRatio,
        fileSize: processed.fileSize,
        mimeType: processed.mimeType,
        likesCount: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      };

      try {
        await setDoc(doc(db, 'photos', photoId), photoData);
      } catch (dbErr: any) {
        // Rollback orphaned Storage object if metadata save fails
        console.error('Firestore photo metadata write failed, rolling back Storage file:', dbErr);
        if (storageRef) {
          try {
            await deleteObject(storageRef);
          } catch (cleanupErr) {
            console.warn('Storage cleanup rollback note:', cleanupErr);
          }
        }
        throw new Error(`Failed to save photo record to Wall: ${dbErr.message || 'Permission denied'}`);
      }

      setUploadProgress(100);
      setUploadStage('Bloomed on Wall! 🌸');

      // Confetti celebration
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#C44780', '#FFE5EF', '#FFD2E4', '#F0E8FF']
      });

      // Close modal gracefully
      setTimeout(() => {
        handleCloseUploadModal();
      }, 600);
    } catch (err: any) {
      activeUploadTaskRef.current = null;
      const parsed = parseStorageError(err);
      setUploadError(parsed.userMessage);
      setIsBucketIssue(parsed.isBucketMissing);
      setUploadProgress(0); // Reset stuck progress bar
      setUploadStage('');
      setUploading(false);
    }
  };

  // Heart toggle reaction
  const handleToggleLike = async (photo: PhotoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUid) return;

    const isLiked = (photo.likedBy || []).includes(currentUid);
    const photoRef = doc(db, 'photos', photo.id);

    try {
      await updateDoc(photoRef, {
        likedBy: isLiked ? arrayRemove(currentUid) : arrayUnion(currentUid),
        likesCount: isLiked ? increment(-1) : increment(1),
        updatedAt: serverTimestamp()
      });

      if (!isLiked) {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.8 },
          colors: ['#C44780', '#FF8FB1']
        });
      }
    } catch (err) {
      console.warn('Could not update photo reaction:', err);
    }
  };

  // Delete photo (only owner or admin)
  const handleDeletePhoto = async (photo: PhotoItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUid) return;

    const canDelete = photo.uploaderId === currentUid || isAdmin;
    if (!canDelete) {
      setErrorMsg('You can only delete your own memories.');
      return;
    }

    if (!window.confirm('Are you sure you want to remove this photo memory?')) {
      return;
    }

    setDeletingId(photo.id);
    setErrorMsg(null);

    try {
      // 1. Delete Firestore document
      await deleteDoc(doc(db, 'photos', photo.id));

      // 2. Delete Storage object if path is available
      if (photo.storagePath) {
        try {
          const storageRef = ref(storage, photo.storagePath);
          await deleteObject(storageRef);
        } catch (storageErr) {
          console.warn('Storage file deletion note:', storageErr);
        }
      }

      if (activePhoto?.id === photo.id) {
        setActivePhoto(null);
      }
    } catch (err: any) {
      setErrorMsg('Failed to delete photo.');
      console.error('Delete photo error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Photo Wall Header Banner */}
      <div className="bg-gradient-to-r from-[#FFE5EF] via-[#FFF0F6] to-[#F0E8FF] rounded-3xl p-4.5 border border-[#FFD2E4] shadow-soft flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[#C44780] tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles size={14} className="animate-spin" /> Friendship Snapshots
          </span>
          <h2 className="text-base font-bold text-[#493744] mt-0.5">
            Our Photo Garden 📸
          </h2>
          <p className="text-xs text-[#927F8C] mt-0.5">
            Moments, smiles & memories shared across the four of us.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="shrink-0 py-2 px-3.5 bg-gradient-to-r from-[#C44780] to-[#B03A70] hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-soft flex items-center space-x-1.5 transition-all"
        >
          <Camera size={15} />
          <span>Add Photo</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center space-x-2">
          <AlertCircle size={15} className="shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Photo Grid / Masonry */}
      {loading ? (
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-2 border border-[#F3E6EE] space-y-2 animate-pulse"
            >
              <div className="w-full aspect-square bg-[#FFF0F6] rounded-xl" />
              <div className="h-3 bg-[#FFF0F6] rounded-full w-2/3" />
              <div className="h-2 bg-[#FFF0F6] rounded-full w-1/2" />
            </div>
          ))}
        </div>
      ) : photos.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            {photos.map((photo) => {
              const isLiked = (photo.likedBy || []).includes(currentUid || '');
              const isOwner = photo.uploaderId === currentUid;
              const canDelete = isOwner || isAdmin;

              return (
                <div
                  key={photo.id}
                  onClick={() => setActivePhoto(photo)}
                  className="group bg-white rounded-2xl overflow-hidden border border-[#F3E6EE] shadow-xs hover:shadow-soft transition-all cursor-pointer flex flex-col justify-between"
                >
                  {/* Photo Container */}
                  <div className="relative aspect-square w-full bg-[#FFF8F5] overflow-hidden">
                    <img
                      src={photo.downloadUrl}
                      alt={photo.caption || 'Friendship photo'}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Like heart overlay */}
                    <button
                      onClick={(e) => handleToggleLike(photo, e)}
                      aria-label="Heart photo"
                      className={`absolute bottom-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all flex items-center space-x-1 ${
                        isLiked
                          ? 'bg-[#FFE5EF]/90 text-[#C44780] shadow-xs'
                          : 'bg-black/30 text-white hover:bg-black/40'
                      }`}
                    >
                      <Heart
                        size={14}
                        className={isLiked ? 'fill-[#C44780] stroke-[#C44780]' : ''}
                      />
                      {(photo.likesCount || 0) > 0 && (
                        <span className="text-[10px] font-bold pr-0.5">
                          {photo.likesCount}
                        </span>
                      )}
                    </button>

                    {/* Maximize zoom hint */}
                    <div className="absolute top-2 right-2 p-1 rounded-lg bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 size={12} />
                    </div>
                  </div>

                  {/* Caption & Uploader Details */}
                  <div className="p-2.5">
                    {photo.caption && (
                      <p className="text-xs text-[#493744] font-medium line-clamp-2 leading-snug mb-1">
                        {photo.caption}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-[#927F8C] pt-0.5">
                      <span className="font-semibold text-[#C44780] truncate max-w-[90px]">
                        {photo.uploaderName}
                      </span>
                      <span>{formatFriendlyTime(photo.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-2 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="py-2 px-5 bg-white hover:bg-[#FFE5EF] text-[#C44780] border border-[#FFD2E4] rounded-2xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {loadingMore ? 'Loading moments...' : 'Load More Memories 🌸'}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl p-8 border border-[#F3E6EE] text-center space-y-3 shadow-soft">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FFE5EF] border border-[#FFD2E4] flex items-center justify-center text-3xl">
            📷
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#493744]">
              No photo memories yet!
            </h3>
            <p className="text-xs text-[#927F8C] max-w-xs mx-auto mt-1 leading-relaxed">
              Our private photo album is ready. Snap or choose a picture from your gallery to bloom our shared wall.
            </p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="py-2.5 px-4 bg-gradient-to-r from-[#C44780] to-[#B03A70] hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-soft inline-flex items-center space-x-1.5 transition-all"
          >
            <Camera size={14} />
            <span>Upload First Memory 🌸</span>
          </button>
        </div>
      )}

      {/* Upload Photo Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 border border-[#F3E6EE] shadow-card max-w-sm w-full space-y-3.5 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">📸</span>
                <h3 className="text-sm font-bold text-[#493744]">
                  Share a Photo Memory
                </h3>
              </div>
              <button
                onClick={handleCloseUploadModal}
                disabled={uploading}
                className="p-1 rounded-full text-[#927F8C] hover:bg-[#FFF8F5] transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Drop / Selection Zone */}
            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#FFD2E4] rounded-2xl p-6 text-center bg-[#FFF8F5] hover:bg-[#FFE5EF]/40 transition-colors cursor-pointer space-y-2"
              >
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FFE5EF] text-[#C44780] flex items-center justify-center">
                  <UploadCloud size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#493744]">
                    Tap to Choose from Gallery or Camera
                  </p>
                  <p className="text-[10px] text-[#927F8C] mt-0.5">
                    Supports JPEG, PNG, WebP up to 10MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-black/5 max-h-52">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {!uploading && (
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#927F8C] uppercase tracking-wider block mb-1">
                    Caption (Optional)
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    disabled={uploading}
                    rows={2}
                    maxLength={500}
                    placeholder="Where was this? What made this moment unforgettable? 🌸"
                    className="w-full p-2.5 text-xs text-[#493744] bg-[#FFF8F5] border border-[#F3E6EE] rounded-xl focus:outline-none focus:border-[#C44780] disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            {uploadError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-2">
                <div className="flex items-start space-x-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold leading-tight">{uploadError}</p>
                    {isBucketIssue && (
                      <div className="text-[11px] text-rose-600/90 bg-white/70 p-2 rounded-xl border border-rose-200/60 leading-relaxed">
                        <p className="font-bold text-[#493744] mb-0.5">Firebase Console Setup Required:</p>
                        <p>1. Open Firebase Console &rarr; Storage</p>
                        <p>2. Click &quot;Get Started&quot;</p>
                        <p>3. Accept default Cloud Storage bucket</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {uploading && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#C44780]">
                  <span className="truncate max-w-[210px] text-[11px]">
                    {uploadStage || 'Uploading to Garden...'}
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-[#FFF8F5] h-2 rounded-full overflow-hidden border border-[#F3E6EE]">
                  <div
                    className="bg-gradient-to-r from-[#C44780] to-[#E580B2] h-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={handleCloseUploadModal}
                disabled={uploading}
                className="flex-1 py-2 bg-[#FFF8F5] hover:bg-[#F3E6EE] text-[#493744] rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadPhoto}
                disabled={!selectedFile || uploading}
                className="flex-1 py-2 bg-gradient-to-r from-[#C44780] to-[#B03A70] hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-soft flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Bloomed...</span>
                  </>
                ) : uploadError ? (
                  <>
                    <Camera size={13} />
                    <span>Retry Upload 🌸</span>
                  </>
                ) : (
                  <>
                    <Camera size={13} />
                    <span>Upload Snapshot</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Photo Lightbox Viewer */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-md w-full bg-[#1A1418] rounded-3xl overflow-hidden border border-white/10 flex flex-col max-h-[92vh]">
            {/* Top Toolbar */}
            <div className="p-3.5 flex items-center justify-between bg-black/40 border-b border-white/10 text-white">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#FFE5EF] text-[#C44780] flex items-center justify-center text-xs font-bold shrink-0">
                  {activePhoto.uploaderName ? activePhoto.uploaderName[0].toUpperCase() : '🌸'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {activePhoto.uploaderName}
                  </p>
                  <p className="text-[10px] text-white/60">
                    {formatFriendlyTime(activePhoto.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                {/* Download Button */}
                <button
                  onClick={() =>
                    downloadPhoto(
                      activePhoto.downloadUrl,
                      `triobloom_${activePhoto.id}.jpg`
                    )
                  }
                  title="Download Photo"
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <Download size={16} />
                </button>

                {/* Delete button (owner or admin) */}
                {(activePhoto.uploaderId === currentUid || isAdmin) && (
                  <button
                    onClick={() => handleDeletePhoto(activePhoto)}
                    disabled={deletingId === activePhoto.id}
                    title="Delete Photo"
                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setActivePhoto(null)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Photo Viewport */}
            <div className="flex-1 flex items-center justify-center p-2 bg-black/60 overflow-hidden">
              <img
                src={activePhoto.downloadUrl}
                alt={activePhoto.caption || 'Friendship photo'}
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-2xl select-none"
              />
            </div>

            {/* Bottom Caption & Reaction Bar */}
            <div className="p-4 bg-black/50 border-t border-white/10 text-white space-y-2">
              {activePhoto.caption && (
                <p className="text-xs text-white/90 leading-relaxed italic">
                  "{activePhoto.caption}"
                </p>
              )}

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  onClick={(e) => handleToggleLike(activePhoto, e)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all ${
                    (activePhoto.likedBy || []).includes(currentUid || '')
                      ? 'bg-[#FFE5EF] text-[#C44780] font-bold'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Heart
                    size={15}
                    className={
                      (activePhoto.likedBy || []).includes(currentUid || '')
                        ? 'fill-[#C44780] stroke-[#C44780]'
                        : ''
                    }
                  />
                  <span>
                    {(activePhoto.likesCount || 0) > 0
                      ? `${activePhoto.likesCount} Hearts`
                      : 'Heart'}
                  </span>
                </button>

                <span className="text-[10px] text-white/60">
                  Four hearts, one story 🌸
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
