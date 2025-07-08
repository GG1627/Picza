import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Trending algorithm function
function calculateSinglePostTrendingScore(post: any): number {
  const now = new Date();
  const postAge = now.getTime() - new Date(post.created_at).getTime();
  const ageInHours = postAge / (1000 * 60 * 60);

  // Engagement score (likes + comments * 2)
  const engagementScore = (post.likes_count || 0) + (post.comments_count || 0) * 2;

  // Time decay factor (posts lose relevance over time)
  const timeDecay = Math.max(0.1, 1 / (1 + ageInHours / 24)); // Decay over days

  // Viral boost for highly engaging posts
  const viralBoost = engagementScore > 10 ? 1.5 : 1;

  const score = engagementScore * timeDecay * viralBoost;
  return Math.max(0, parseFloat(score.toFixed(2)));
}

Deno.serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('Starting trending scores update...');

    // Fetch all posts with their current data
    const { data: posts, error: fetchError } = await supabase.from('posts').select(`
        id,
        created_at,
        likes_count,
        comments:comments(count)
      `);

    if (fetchError) {
      console.error('Error fetching posts:', fetchError);
      throw fetchError;
    }

    if (!posts || posts.length === 0) {
      console.log('No posts found to update');
      return new Response(
        JSON.stringify({ success: true, message: 'No posts to update', updatedCount: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${posts.length} posts to update`);

    // Calculate new trending scores for all posts
    const updates = posts.map((post) => {
      const postWithCommentCount = {
        ...post,
        comments_count: post.comments?.[0]?.count || 0,
      };

      const newTrendingScore = calculateSinglePostTrendingScore(postWithCommentCount);

      return {
        id: post.id,
        trending_score: newTrendingScore,
      };
    });

    // Update all posts in batch
    let successCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ trending_score: update.trending_score })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Error updating post ${update.id}:`, updateError);
        errorCount++;
      } else {
        successCount++;
      }
    }

    console.log(`Update complete: ${successCount} successful, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Trending scores updated successfully`,
        updatedCount: successCount,
        errorCount: errorCount,
        totalPosts: posts.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in trending scores update:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
