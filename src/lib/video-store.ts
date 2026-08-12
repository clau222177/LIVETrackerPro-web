// Port of ViewModels/VideoStore.swift (pure functions, state hosted by the DB)
import type { VideoItem } from "./models"
import { topicById, TOPICS } from "./models"

export const approvedVideos = (videos: VideoItem[]): VideoItem[] =>
  videos.filter((v) => v.status === "approvato")

export const totalGuadagno = (videos: VideoItem[]): number =>
  approvedVideos(videos).reduce((sum, v) => sum + v.guadagno, 0)

export const approvatiCount = (videos: VideoItem[]): number =>
  approvedVideos(videos).length

export const inRevisioneCount = (videos: VideoItem[]): number =>
  videos.filter((v) => v.status === "inRevisione").length

export const videosForTopic = (videos: VideoItem[], topicID: number): VideoItem[] =>
  videos.filter((v) => v.topicID === topicID)

export const earnedForTopic = (videos: VideoItem[], topicID: number): number =>
  videosForTopic(videos, topicID)
    .filter((v) => v.status === "approvato")
    .reduce((sum, v) => sum + v.guadagno, 0)

export const percentClaimed = (videos: VideoItem[], topicID: number): number => {
  const topic = topicById(topicID)
  const earned = earnedForTopic(videos, topicID)
  const base = topic.remainingPool + earned
  if (base <= 0) return 0
  return Math.min(earned / base, 1)
}

export const videosRemaining = (videos: VideoItem[], topicID: number): number => {
  const topic = topicById(topicID)
  const remaining = topic.remainingPool - Math.max(earnedForTopic(videos, topicID), 0)
  return Math.max(Math.floor(remaining / topic.rewardPerVideo), 0)
}

export const poolRemaining = (videos: VideoItem[], topicID: number): number =>
  Math.max(topicById(topicID).remainingPool - earnedForTopic(videos, topicID), 0)

export const totalPool = (): number =>
  TOPICS.reduce((sum, t) => sum + t.remainingPool, 0)

export const averageRewardPerVideo = (): number =>
  TOPICS.reduce((sum, t) => sum + t.rewardPerVideo, 0) / TOPICS.length

export const monthlyProjection = (videosPerDay: number): number =>
  videosPerDay * 30 * averageRewardPerVideo()
