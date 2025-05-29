import { Post } from '../types/post';

interface TrendingScore {
  post: Post;
  score: number;
}

/**
 * Calculates a trending score for a post based on various factors
 * @param post The post to calculate score for
 * @returns A number representing the post's trending score
 */
const calculateTrendingScore = (post: Post): number => {
  const currentTime = new Date();
  const postTime = new Date(post.created_at);
  const timeDiff = currentTime.getTime() - postTime.getTime();
  const timeDiffInHours = timeDiff / (1000 * 60 * 60);
  const timeDiffInDays = timeDiffInHours / 24;

  // If post is older than 2 days, significantly reduce its score
  if (timeDiffInDays > 2) {
    return 0.0001;
  }

  const numLikes = post.likes_count;
  const numComments = post.comments?.length || 0;

  // Base engagement score with balanced weights
  // Comments are worth more but not overwhelmingly so
  const baseEngagement = numLikes * 3 + numComments * 8;

  // Calculate engagement velocity (engagement per hour)
  const engagementVelocity = baseEngagement / Math.max(timeDiffInHours, 1);

  // Moderate time decay
  // Posts lose 40% of their score every 12 hours
  const timeDecayFactor = Math.pow(1.8, timeDiffInHours / 12);

  // Engagement quality multipliers
  const hasLikes = numLikes > 0;
  const hasComments = numComments > 0;
  // Higher multiplier for posts with both likes and comments
  const engagementQuality =
    hasLikes && hasComments ? 2.5 : hasComments ? 2.0 : hasLikes ? 1.0 : 0.5;

  // Engagement distribution favors balanced engagement
  const totalEngagement = numLikes + numComments;
  const likeRatio = totalEngagement > 0 ? numLikes / totalEngagement : 0;
  const commentRatio = totalEngagement > 0 ? numComments / totalEngagement : 0;
  // Bonus for balanced engagement between likes and comments
  const engagementDistribution = 1 + Math.min(likeRatio, commentRatio) * 1.5;

  // Calculate final score
  const finalScore =
    (baseEngagement * engagementQuality * engagementDistribution) / timeDecayFactor;

  // Velocity bonus for posts with high recent engagement
  const velocityBonus = Math.min(engagementVelocity * 3, 100);

  // Recency bonus that decreases over time
  const recencyBonus = 800 / (1 + timeDiffInHours);

  return finalScore + velocityBonus + recencyBonus;
};

/**
 * Sorts posts by their trending score
 * @param posts Array of posts to sort
 * @returns Sorted array of posts with their trending scores
 */
export const getTrendingPosts = (posts: Post[]): Post[] => {
  // Calculate scores for all posts
  const scoredPosts: TrendingScore[] = posts.map((post) => ({
    post,
    score: calculateTrendingScore(post),
  }));

  // Sort by score in descending order (higher scores first)
  return scoredPosts
    .sort((a, b) => b.score - a.score)
    .filter((scoredPost) => scoredPost.score > 0) // Remove posts with 0 score
    .map((scoredPost) => scoredPost.post);
};
