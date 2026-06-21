export type VideoProjectStatus = 'draft' | 'generating' | 'ready' | 'scheduled' | 'posted' | 'failed';
export type VideoAssetType = 'video' | 'image' | 'audio' | 'caption' | 'voiceover';
export type TimelineTrackType = 'video' | 'audio' | 'caption' | 'overlay';

export interface MediaAsset {
  id: string;
  type: VideoAssetType;
  name: string;
  url?: string;
  duration?: number;
}

export interface TimelineItem {
  id: string;
  assetId: string;
  startTime: number;
  endTime: number;
  trimStart?: number;
  trimEnd?: number;
  position?: {
    x: number;
    y: number;
    scale: number;
  };
}

export interface TimelineTrack {
  id: string;
  type: TimelineTrackType;
  items: TimelineItem[];
}

export interface VideoProjectMetadata {
  assets?: MediaAsset[];
  caption?: string;
  hashtags?: string[];
}

export interface VideoTimeline {
  tracks: TimelineTrack[];
}

export interface VideoProject {
  id: number;
  companyId: number;
  userServiceId?: number | null;
  serviceId: number;
  title: string;
  status: VideoProjectStatus;
  scheduledFor?: string | null;
  platform: string;
  outputUrl?: string | null;
  metadata?: VideoProjectMetadata;
  timeline?: VideoTimeline;
  timelineVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface RenderVideoProjectResponse {
  executionId: number;
  status: string;
  mode: 'mock' | 'live';
  message: string;
}
