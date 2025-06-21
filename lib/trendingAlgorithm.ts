import { Post } from '../types/post';

interface TrendingScore {
  post: Post;
  score: number;
  breakdown: {
    engagementScore: number;
    velocityScore: number;
    recencyScore: number;
    userReputationScore: number;
    contentQualityScore: number;
    timeDecayScore: number;
    viralPotentialScore: number;
  };
}

interface UserReputation {
  [userId: string]: {
    totalLikes: number;
    totalPosts: number;
    avgLikesPerPost: number;
    followersCount?: number;
    accountAge: number;
    engagementRate: number;
  };
}

// Global cache for user reputation data
let userReputationCache: UserReputation = {};
let lastReputationUpdate = 0;
const REPUTATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Calculates user reputation score based on historical performance
 */
const calculateUserReputation = (post: Post): number => {
  const userId = post.user_id;
  const user = userReputationCache[userId];

  if (!user) return 1.0; // Default neutral score for new users

  // Base reputation from average likes per post
  const baseReputation = Math.min(user.avgLikesPerPost / 10, 3.0);

  // Account age bonus (older accounts get slight boost)
  const accountAgeBonus = Math.min(user.accountAge / 365, 0.5);

  // Engagement rate bonus
  const engagementBonus = Math.min(user.engagementRate * 2, 1.0);

  // Post frequency penalty (spammers get penalized)
  const postsPerDay = user.totalPosts / Math.max(user.accountAge / 365, 1);
  const frequencyPenalty = postsPerDay > 5 ? 0.7 : 1.0;

  return (baseReputation + accountAgeBonus + engagementBonus) * frequencyPenalty;
};

/**
 * Calculates content quality score based on various signals
 */
const calculateContentQuality = (post: Post): number => {
  let qualityScore = 1.0;

  // Caption quality (longer, more thoughtful captions)
  if (post.caption) {
    const captionLength = post.caption.length;
    const wordCount = post.caption.split(' ').length;

    // Optimal caption length (not too short, not too long)
    if (captionLength > 50 && captionLength < 500) {
      qualityScore += 0.3;
    } else if (captionLength > 20) {
      qualityScore += 0.1;
    }

    // Bonus for thoughtful captions with questions or calls to action
    const hasQuestion = /\?/.test(post.caption);
    const hasCallToAction =
      /\b(what|how|why|when|where|check|look|see|try|share|comment|like)\b/i.test(post.caption);

    if (hasQuestion) qualityScore += 0.2;
    if (hasCallToAction) qualityScore += 0.15;
  }

  // Dish name quality
  if (post.dish_name) {
    const dishNameLength = post.dish_name.length;
    if (dishNameLength > 5 && dishNameLength < 50) {
      qualityScore += 0.2;
    }
  }

  // Ingredients bonus (shows effort and detail)
  if (post.ingredients && post.ingredients.length > 10) {
    qualityScore += 0.25;
  }

  return Math.min(qualityScore, 2.5);
};

/**
 * Calculates engagement velocity (rate of engagement over time)
 */
const calculateEngagementVelocity = (post: Post, currentTime: Date = new Date()): number => {
  const postTime = new Date(post.created_at);
  const timeDiff = currentTime.getTime() - postTime.getTime();
  const timeDiffInHours = timeDiff / (1000 * 60 * 60);

  if (timeDiffInHours < 0.1) return 0; // Too new to calculate velocity

  const totalEngagement = post.likes_count + (post.comments_count || 0);
  const engagementPerHour = totalEngagement / timeDiffInHours;

  // Exponential velocity scoring
  return Math.min(engagementPerHour * 2, 50);
};

/**
 * Calculates viral potential based on engagement patterns
 */
const calculateViralPotential = (post: Post): number => {
  const likes = post.likes_count;
  const comments = post.comments_count || 0;

  // Comment-to-like ratio (high ratio suggests viral potential)
  const commentLikeRatio = likes > 0 ? comments / likes : 0;
  const viralRatio = Math.min(commentLikeRatio * 10, 5);

  // Engagement acceleration (posts gaining momentum)
  const totalEngagement = likes + comments;
  const engagementThreshold = 10; // Posts with >10 engagement have viral potential

  if (totalEngagement > engagementThreshold) {
    return viralRatio + Math.min(totalEngagement / 20, 3);
  }

  return viralRatio;
};

/**
 * Calculates time decay with sophisticated curve
 */
const calculateTimeDecay = (post: Post, currentTime: Date = new Date()): number => {
  const postTime = new Date(post.created_at);
  const timeDiff = currentTime.getTime() - postTime.getTime();
  const timeDiffInHours = timeDiff / (1000 * 60 * 60);
  const timeDiffInDays = timeDiffInHours / 24;

  // Sophisticated time decay curve
  if (timeDiffInDays > 7) {
    return 0.01; // Very old posts get minimal score
  } else if (timeDiffInDays > 3) {
    return Math.pow(0.7, timeDiffInDays - 3); // Steep decay after 3 days
  } else if (timeDiffInDays > 1) {
    return Math.pow(0.85, timeDiffInDays - 1); // Moderate decay after 1 day
  } else {
    return Math.pow(0.95, timeDiffInHours); // Gentle decay in first 24 hours
  }
};

/**
 * Calculates recency bonus with diminishing returns
 */
const calculateRecencyBonus = (post: Post, currentTime: Date = new Date()): number => {
  const postTime = new Date(post.created_at);
  const timeDiff = currentTime.getTime() - postTime.getTime();
  const timeDiffInMinutes = timeDiff / (1000 * 60);

  // Exponential recency bonus that peaks early and diminishes quickly
  if (timeDiffInMinutes < 30) {
    return 100 * Math.exp(-timeDiffInMinutes / 10); // Peak bonus for very recent posts
  } else if (timeDiffInMinutes < 120) {
    return 50 * Math.exp(-(timeDiffInMinutes - 30) / 30); // High bonus for recent posts
  } else if (timeDiffInMinutes < 1440) {
    // 24 hours
    return 20 * Math.exp(-(timeDiffInMinutes - 120) / 200); // Moderate bonus
  } else {
    return 5 * Math.exp(-(timeDiffInMinutes - 1440) / 1440); // Low bonus for older posts
  }
};

/**
 * Calculates engagement score with sophisticated weighting
 */
const calculateEngagementScore = (post: Post): number => {
  const likes = post.likes_count;
  const comments = post.comments_count || 0;

  // Weighted engagement scoring
  const likeWeight = 1.0;
  const commentWeight = 3.5; // Comments are worth more than likes

  // Engagement quality multipliers
  const hasBothLikesAndComments = likes > 0 && comments > 0;
  const engagementQuality = hasBothLikesAndComments ? 1.5 : 1.0;

  // Engagement distribution bonus
  const totalEngagement = likes + comments;
  if (totalEngagement > 0) {
    const likeRatio = likes / totalEngagement;
    const commentRatio = comments / totalEngagement;
    const balanceBonus = 1 + Math.min(likeRatio, commentRatio) * 0.5;

    return (likes * likeWeight + comments * commentWeight) * engagementQuality * balanceBonus;
  }

  return likes * likeWeight * engagementQuality;
};

/**
 * Updates user reputation cache with fresh data
 */
const updateUserReputationCache = async (posts: Post[]): Promise<void> => {
  const now = Date.now();
  if (now - lastReputationUpdate < REPUTATION_CACHE_DURATION) {
    return; // Cache is still fresh
  }

  // Calculate user stats from current posts
  const userStats: { [userId: string]: { likes: number; posts: number; firstPost: Date } } = {};

  posts.forEach((post) => {
    if (!userStats[post.user_id]) {
      userStats[post.user_id] = { likes: 0, posts: 0, firstPost: new Date(post.created_at) };
    }
    userStats[post.user_id].likes += post.likes_count;
    userStats[post.user_id].posts += 1;
    if (new Date(post.created_at) < userStats[post.user_id].firstPost) {
      userStats[post.user_id].firstPost = new Date(post.created_at);
    }
  });

  // Calculate reputation metrics
  Object.keys(userStats).forEach((userId) => {
    const stats = userStats[userId];
    const accountAge = (Date.now() - stats.firstPost.getTime()) / (1000 * 60 * 60 * 24); // days

    userReputationCache[userId] = {
      totalLikes: stats.likes,
      totalPosts: stats.posts,
      avgLikesPerPost: stats.posts > 0 ? stats.likes / stats.posts : 0,
      accountAge: accountAge,
      engagementRate: stats.posts > 0 ? stats.likes / stats.posts / Math.max(accountAge, 1) : 0,
    };
  });

  lastReputationUpdate = now;
};

/**
 * Main trending score calculation function
 */
const calculateTrendingScore = (
  post: Post,
  currentTime: Date = new Date()
): { score: number; breakdown: any } => {
  // Calculate individual components
  const engagementScore = calculateEngagementScore(post);
  const velocityScore = calculateEngagementVelocity(post, currentTime);
  const recencyScore = calculateRecencyBonus(post, currentTime);
  const userReputationScore = calculateUserReputation(post);
  const contentQualityScore = calculateContentQuality(post);
  const timeDecayScore = calculateTimeDecay(post, currentTime);
  const viralPotentialScore = calculateViralPotential(post);

  // Weighted combination of all factors
  const weightedScore =
    engagementScore * 0.25 +
    velocityScore * 0.2 +
    recencyScore * 0.15 +
    userReputationScore * 0.1 +
    contentQualityScore * 0.1 +
    viralPotentialScore * 0.1 +
    engagementScore * timeDecayScore * 0.1;

  return {
    score: Math.max(weightedScore, 0),
    breakdown: {
      engagementScore,
      velocityScore,
      recencyScore,
      userReputationScore,
      contentQualityScore,
      timeDecayScore,
      viralPotentialScore,
    },
  };
};

/**
 * Sorts posts by their trending score with detailed breakdown
 * @param posts Array of posts to sort
 * @returns Sorted array of posts with their trending scores
 */
export const getTrendingPosts = async (posts: Post[]): Promise<Post[]> => {
  // Update user reputation cache
  await updateUserReputationCache(posts);

  // Cache current time to ensure all posts use the same timestamp for consistent scoring
  const currentTime = new Date();

  // Calculate scores for all posts
  const scoredPosts: TrendingScore[] = posts.map((post) => {
    const result = calculateTrendingScore(post, currentTime);
    return {
      post,
      score: result.score,
      breakdown: result.breakdown,
    };
  });

  // Sort by score in descending order (higher scores first)
  // Use stable sort to prevent order flipping when scores are equal
  return scoredPosts
    .sort((a, b) => {
      // Primary sort by score
      if (Math.abs(b.score - a.score) > 0.001) {
        return b.score - a.score;
      }
      // Secondary sort by creation date (newer first) for stable ordering
      return new Date(b.post.created_at).getTime() - new Date(a.post.created_at).getTime();
    })
    .filter((scoredPost) => scoredPost.score > 0.1) // Remove posts with very low scores
    .map((scoredPost) => scoredPost.post);
};

/**
 * Get trending score breakdown for debugging/analytics
 */
export const getTrendingScoreBreakdown = (post: Post, currentTime: Date = new Date()) => {
  return calculateTrendingScore(post, currentTime);
};
