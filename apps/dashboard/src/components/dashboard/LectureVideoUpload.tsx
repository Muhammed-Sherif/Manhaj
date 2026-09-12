import React, { useState, useRef } from 'react';
import {
  Video,
  UploadCloud,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  Film,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import {
  uploadLectureVideo,
  type UploadProgress,
} from '@/lib/videoUploadClient';

export interface MaterialLink {
  id?: string;
  url: string;
  sourceName: string;
}

export interface PendingVideoFile {
  file: File;
  sourceName: string;
}

interface LectureVideoUploadProps {
  lectureId?: string | null;
  videos: MaterialLink[];
  onVideosChange: (videos: MaterialLink[]) => void;
  pendingFiles: PendingVideoFile[];
  onPendingFilesChange: (files: PendingVideoFile[]) => void;
  isSaving?: boolean;
}

export function LectureVideoUpload({
  lectureId,
  videos,
  onVideosChange,
  pendingFiles,
  onPendingFilesChange,
  isSaving,
}: LectureVideoUploadProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceName, setSourceName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!sourceName) {
      // Default source name to file name without extension
      const defaultName = file.name.replace(/\.[^/.]+$/, '');
      setSourceName(defaultName);
    }
  };

  const handleUploadImmediate = async () => {
    if (!selectedFile || !lectureId) return;

    setIsUploading(true);
    try {
      const createdVideo = await uploadLectureVideo(
        lectureId,
        selectedFile,
        (progress) => setUploadProgress(progress)
      );

      toast.success('Video uploaded and processed successfully!');
      onVideosChange([
        ...videos,
        {
          id: createdVideo.id,
          url: createdVideo.url,
          sourceName: createdVideo.sourceName || sourceName || selectedFile.name,
        },
      ]);
      setSelectedFile(null);
      setSourceName('');
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      toast.error(error.message || 'Video upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleQueueUpload = () => {
    if (!selectedFile) return;
    onPendingFilesChange([
      ...pendingFiles,
      {
        file: selectedFile,
        sourceName: sourceName.trim() || selectedFile.name.replace(/\.[^/.]+$/, ''),
      },
    ]);
    setSelectedFile(null);
    setSourceName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded bg-purple-100 text-purple-700">
            <Video size={14} />
          </span>
          <span className="text-sm font-semibold text-slate-800">Lecture Videos</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              activeTab === 'upload'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              activeTab === 'link'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            External Link
          </button>
        </div>
      </div>

      {/* Tab: Upload File */}
      {activeTab === 'upload' && (
        <div className="rounded-md border border-dashed border-purple-200 bg-purple-50/40 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="video/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isUploading || isSaving}
              className="text-xs h-9 bg-white cursor-pointer"
            />
          </div>

          {selectedFile && (
            <div className="space-y-2 bg-white p-3 rounded border border-purple-100 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-medium text-slate-700 truncate max-w-[280px]">
                  <Film size={14} className="text-purple-600 shrink-0" />
                  <span className="truncate">{selectedFile.name}</span>
                </div>
                <span className="text-slate-500 shrink-0 font-mono">
                  {formatBytes(selectedFile.size)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Video Title / Source Name (e.g. Lecture Recording)"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  disabled={isUploading}
                  className="text-xs h-8 bg-slate-50"
                />

                {lectureId ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleUploadImmediate}
                    disabled={isUploading}
                    className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white shrink-0 gap-1"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud size={13} /> Upload Now
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleQueueUpload}
                    disabled={isUploading}
                    className="h-8 text-xs shrink-0 text-purple-700 border-purple-300 hover:bg-purple-50"
                  >
                    <Plus size={13} className="mr-1" /> Add to Queue
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploadProgress && isUploading && (
            <div className="space-y-1.5 bg-white p-2.5 rounded border border-purple-100 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-medium text-purple-700">
                  {uploadProgress.status === 'initializing' && 'Preparing upload...'}
                  {uploadProgress.status === 'uploading' &&
                    `Uploading chunk ${uploadProgress.currentChunk} of ${uploadProgress.totalChunks}...`}
                  {uploadProgress.status === 'merging' && 'Verifying & merging video on server...'}
                  {uploadProgress.status === 'completed' && 'Upload completed!'}
                  {uploadProgress.status === 'error' && 'Upload error'}
                </span>
                <span className="font-mono font-semibold text-purple-700">
                  {uploadProgress.percent}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 text-right">
                {formatBytes(uploadProgress.uploadedBytes)} / {formatBytes(uploadProgress.totalBytes)}
              </div>
            </div>
          )}

          {!lectureId && (
            <p className="text-[11px] text-slate-500">
              💡 File will be streamed and uploaded automatically once you save this new lecture.
            </p>
          )}
        </div>
      )}

      {/* Tab: External Link */}
      {activeTab === 'link' && (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onVideosChange([...videos, { url: '', sourceName: '' }])}
          >
            <Plus size={13} className="mr-1" /> Add Video URL
          </Button>
        </div>
      )}

      {/* List of pending queued files (for new lectures) */}
      {pendingFiles.length > 0 && (
        <div className="space-y-1.5 mt-2">
          <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wide">
            Queued for Upload ({pendingFiles.length})
          </span>
          {pendingFiles.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-2 p-2 rounded bg-purple-50 border border-purple-200 text-xs"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Film size={13} className="text-purple-600 shrink-0" />
                <span className="font-medium text-slate-800 truncate">{item.sourceName}</span>
                <span className="text-slate-400 font-mono text-[11px]">
                  ({formatBytes(item.file.size)})
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-red-600"
                onClick={() => onPendingFilesChange(pendingFiles.filter((_, i) => i !== idx))}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Existing / added video list */}
      <div className="space-y-2 mt-2">
        {videos.length === 0 && pendingFiles.length === 0 ? (
          <p className="text-xs text-slate-400 py-1">No videos added yet.</p>
        ) : (
          videos.map((item, idx) => {
            const isUploaded = item.url.startsWith('/uploads/');
            return (
              <div key={item.id || idx} className="flex items-center gap-2">
                <Input
                  placeholder="Source / Title (e.g. YouTube, Dr. Ahmed)"
                  value={item.sourceName}
                  disabled={!!item.id}
                  onChange={(e) => {
                    const updated = [...videos];
                    updated[idx].sourceName = e.target.value;
                    onVideosChange(updated);
                  }}
                  className="w-1/3 text-xs h-9 bg-white"
                />
                <div className="flex-1 relative flex items-center">
                  <Input
                    placeholder="Video URL"
                    value={item.url}
                    disabled={!!item.id || isUploaded}
                    onChange={(e) => {
                      const updated = [...videos];
                      updated[idx].url = e.target.value;
                      onVideosChange(updated);
                    }}
                    className={`text-xs h-9 bg-white ${isUploaded ? 'pr-24 font-mono text-purple-700' : ''}`}
                  />
                  {isUploaded && (
                    <span className="absolute right-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                      Uploaded File
                    </span>
                  )}
                </div>
                {!item.id && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-slate-400 hover:text-red-600"
                    onClick={() => onVideosChange(videos.filter((_, i) => i !== idx))}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
