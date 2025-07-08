import { uploadToCloudinary } from './cloudinary';
import { supabase } from './supabase';

// Azure Computer Vision configuration
const subscriptionKey = process.env.EXPO_PUBLIC_AZURE_VISION_KEY || '';
const endpoint = process.env.EXPO_PUBLIC_AZURE_VISION_ENDPOINT || '';

// Food-related labels that indicate the image contains food
const FOOD_LABELS = [
  'food',
  'dish',
  'meal',
  'cuisine',
  'cooking',
  'recipe',
  'ingredient',
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'dessert',
  'beverage',
  'drink',
  'fruit',
  'vegetable',
  'meat',
  'fish',
  'pasta',
  'rice',
  'bread',
  'cake',
  'pizza',
  'burger',
  'sandwich',
  'salad',
  'soup',
  'stew',
  'curry',
  'sushi',
  'taco',
  'burrito',
  'noodles',
  'pancake',
  'waffle',
  'omelette',
  'steak',
  'chicken',
  'seafood',
  'appetizer',
  'main course',
  'side dish',
  'garnish',
  'condiment',
  'sauce',
  'dressing',
  'spice',
  'herb',
  'seasoning',
  'flavoring',
  'cooking oil',
  'butter',
  'cheese',
  'dairy',
  'protein',
  'carbohydrate',
  'vitamin',
  'mineral',
  'nutrient',
  'organic food',
  'fresh food',
  'homemade',
  'restaurant food',
  'street food',
  'fast food',
  'gourmet',
  'fine dining',
  'comfort food',
  'healthy food',
  'junk food',
  'processed food',
  'raw food',
  'cooked food',
  'baked goods',
  'pastry',
  'confectionery',
  'chocolate',
  'candy',
  'ice cream',
  'yogurt',
  'milk',
  'juice',
  'smoothie',
  'shake',
  'coffee',
  'tea',
  'alcohol',
  'wine',
  'beer',
  'cocktail',
  'mocktail',
  'water',
  'soda',
  'pop',
  'energy drink',
  'protein shake',
  'meal replacement',
  'supplement',
  'probiotic',
  'prebiotic',
  'antioxidant',
  'omega-3',
  'fiber',
  'protein powder',
  'creatine',
  'amino acid',
  'electrolyte',
  'hydration',
  'nutrition',
  'diet',
  'weight loss',
  'weight gain',
  'muscle building',
  'athletic performance',
  'recovery',
  'pre-workout',
  'post-workout',
  'meal prep',
  'batch cooking',
  'leftovers',
  'takeout',
  'delivery',
  'catering',
  'buffet',
  'potluck',
  'picnic',
  'barbecue',
  'grill',
  'smoker',
  'oven',
  'stovetop',
  'microwave',
  'slow cooker',
  'instant pot',
  'air fryer',
  'blender',
  'food processor',
  'mixer',
  'whisk',
  'spatula',
  'knife',
  'cutting board',
  'pan',
  'pot',
  'baking sheet',
  'muffin tin',
  'cake pan',
  'pie dish',
  'casserole dish',
  'serving dish',
  'plate',
  'bowl',
  'cup',
  'glass',
  'mug',
  'utensil',
  'fork',
  'spoon',
  'chopstick',
  'napkin',
  'placemat',
  'tablecloth',
  'centerpiece',
  'decoration',
  'presentation',
  'plating',
  'garnishing',
  'sprinkling',
  'drizzling',
  'gravy',
  'broth',
  'stock',
  'bouillon',
  'salt',
  'pepper',
  'aromatic',
  'flavor',
  'taste',
  'savor',
  'palate',
  'culinary',
  'gastronomy',
  'food science',
  'nutrition science',
  'dietetics',
  'food safety',
  'food hygiene',
  'food storage',
  'food preservation',
  'canning',
  'freezing',
  'drying',
  'fermenting',
  'pickling',
  'curing',
  'smoking',
  'brining',
  'marinating',
  'aromatizing',
  'infusing',
  'extracting',
  'distilling',
  'brewing',
  'aging',
  'ripening',
  'maturing',
  'developing',
  'enhancing',
  'intensifying',
  'concentrating',
  'reducing',
  'thickening',
  'thinning',
  'diluting',
  'emulsifying',
  'whipping',
  'beating',
  'folding',
  'kneading',
  'rolling',
  'cutting',
  'chopping',
  'dicing',
  'mincing',
  'grating',
  'shredding',
  'slicing',
  'peeling',
  'seeding',
  'pitting',
  'shelling',
  'husking',
  'shucking',
  'cleaning',
  'washing',
  'rinsing',
  'draining',
  'straining',
  'filtering',
  'clarifying',
  'separating',
  'dividing',
  'portioning',
  'measuring',
  'weighing',
  'scaling',
  'adjusting',
  'balancing',
  'harmonizing',
  'complementing',
  'contrasting',
  'accenting',
  'highlighting',
  'emphasizing',
  'showcasing',
  'featuring',
  'spotlighting',
  'celebrating',
  'honoring',
  'respecting',
  'appreciating',
  'enjoying',
  'savoring',
  'relishing',
  'delighting',
  'pleasing',
  'satisfying',
  'fulfilling',
  'nourishing',
  'sustaining',
  'energizing',
  'refreshing',
  'revitalizing',
  'rejuvenating',
  'healing',
  'therapeutic',
  'medicinal',
  'curative',
  'restorative',
  'strengthening',
  'fortifying',
  'building',
  'developing',
  'growing',
  'maturing',
  'evolving',
  'progressing',
  'advancing',
  'improving',
  'upgrading',
  'refining',
  'perfecting',
  'mastering',
  'excelling',
  'achieving',
  'accomplishing',
  'succeeding',
  'thriving',
  'flourishing',
  'prospering',
  'blooming',
  'blossoming',
  'bearing fruit',
  'yielding',
  'producing',
  'generating',
  'creating',
  'making',
  'preparing',
  'baking',
  'roasting',
  'grilling',
  'frying',
  'boiling',
  'steaming',
  'poaching',
  'braising',
  'stewing',
  'simmering',
];

/**
 * Converts a local image URI to base64 for Cloudinary upload
 * @param imageUri - The local image URI
 * @returns Promise<string> - Base64 encoded image
 */
const imageUriToBase64 = async (imageUri: string): Promise<string> => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data URL prefix to get just the base64 string
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

/**
 * Detects if an image contains food using Azure Computer Vision API via direct HTTP requests
 * @param imageUrl - The URL of the image to analyze (can be local URI or public URL)
 * @returns Promise<boolean> - True if food is detected, false otherwise
 */
export const detectFood = async (imageUrl: string): Promise<boolean> => {
  try {
    // Check if Azure credentials are configured
    if (!subscriptionKey || !endpoint) {
      console.warn('Azure Vision API credentials not configured. Skipping food detection.');
      return true; // Allow upload if no credentials (fallback)
    }

    let publicImageUrl = imageUrl;

    // For local file URIs, upload to Cloudinary first to get a public URL
    if (imageUrl.startsWith('file://') || imageUrl.startsWith('content://')) {
      console.log('Local file URI detected. Uploading to Cloudinary first...');
      try {
        const base64Image = await imageUriToBase64(imageUrl);
        publicImageUrl = await uploadToCloudinary(base64Image, 'post');
        console.log('Image uploaded to Cloudinary:', publicImageUrl);
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        return true; // Allow upload if Cloudinary fails (fallback)
      }
    }

    // Prepare the request URL
    const apiUrl = `${endpoint}/vision/v3.2/analyze?visualFeatures=Tags,Description&language=en`;

    console.log('Making Azure Vision API request to:', apiUrl);
    console.log('Image URL:', publicImageUrl);

    // Make the HTTP request to Azure Vision API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': subscriptionKey,
      },
      body: JSON.stringify({
        url: publicImageUrl,
      }),
    });

    console.log('Azure Vision API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure Vision API error response:', errorText);
      throw new Error(
        `Azure Vision API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log('Azure Vision API result:', result);

    // Check if any of the detected tags are food-related
    const detectedTags = result.tags?.map((tag: any) => tag.name.toLowerCase()) || [];
    const hasFoodTag = detectedTags.some((tag: string) => FOOD_LABELS.includes(tag));

    // Also check the image description for food-related keywords
    const description = result.description?.captions?.[0]?.text?.toLowerCase() || '';
    const hasFoodDescription = FOOD_LABELS.some((foodLabel) =>
      description.includes(foodLabel.toLowerCase())
    );

    const isFood = hasFoodTag || hasFoodDescription;

    console.log('Food detection result:', {
      originalImageUrl: imageUrl,
      publicImageUrl,
      detectedTags,
      description,
      isFood,
    });

    return isFood;
  } catch (error) {
    console.error('Error detecting food:', error);

    // If there's an error with Azure API, allow the upload (fallback)
    // This prevents blocking users if the service is down
    return true;
  }
};

/**
 * Validates an image to ensure it contains food with daily rate limiting
 * @param imageUrl - The URL of the image to validate
 * @returns Promise<{isValid: boolean, message: string, remaining?: number}> - Validation result
 */
export const validateFoodImage = async (
  imageUrl: string
): Promise<{ isValid: boolean; message: string; remaining?: number }> => {
  try {
    // Check daily limit before calling Azure
    const canProceed = await checkDailyLimit();

    if (!canProceed.allowed) {
      return {
        isValid: false,
        message: canProceed.message,
        remaining: canProceed.remaining || 0,
      };
    }

    // Call Azure Vision API
    const isFood = await detectFood(imageUrl);

    // Always increment counter for any validation attempt (whether Azure is configured or not)
    // This ensures we track all validation attempts to prevent abuse
    console.log('Incrementing Azure Vision usage count...');
    await incrementDailyCount();

    // Get updated remaining count after increment
    const updatedLimitCheck = await checkDailyLimit();
    const remainingAfterIncrement = updatedLimitCheck.remaining || 0;

    if (isFood) {
      return {
        isValid: true,
        message: 'Food detected! Your image looks great.',
        remaining: remainingAfterIncrement,
      };
    } else {
      return {
        isValid: false,
        message: 'No food detected in this image. Please upload a photo of food or a dish.',
        remaining: remainingAfterIncrement,
      };
    }
  } catch (error) {
    console.error('Error validating food image:', error);
    // Fallback: allow upload if validation fails (don't increment counter)
    return {
      isValid: true,
      message: 'Image validation unavailable - upload allowed',
    };
  }
};

/**
 * Get current remaining Azure Vision attempts for today (without validation)
 * @returns Promise<number> - Number of remaining attempts
 */
export const getRemainingAttempts = async (): Promise<number> => {
  try {
    const limitCheck = await checkDailyLimit();
    return limitCheck.remaining || 0;
  } catch (error) {
    console.error('Error getting remaining attempts:', error);
    return 5; // Default to full limit on error
  }
};

/**
 * Check if user has remaining Azure Vision API calls for today
 */
const checkDailyLimit = async (): Promise<{
  allowed: boolean;
  message: string;
  remaining?: number;
}> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { allowed: false, message: 'Authentication required' };
    }

    // Get user's current daily count
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('azure_vision_daily_count, azure_vision_last_reset')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error checking daily limit:', error);
      return { allowed: true, message: 'Proceeding without limit check' };
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const lastReset = profile?.azure_vision_last_reset;
    let dailyCount = profile?.azure_vision_daily_count || 0;

    // Reset count if it's a new day
    if (lastReset !== today) {
      await supabase
        .from('profiles')
        .update({
          azure_vision_daily_count: 0,
          azure_vision_last_reset: today,
        })
        .eq('id', user.id);

      dailyCount = 0;
    }

    const DAILY_LIMIT = 5;
    const remaining = DAILY_LIMIT - dailyCount;

    if (dailyCount >= DAILY_LIMIT) {
      return {
        allowed: false,
        message: `Daily limit reached! You've used all ${DAILY_LIMIT} food validations today. Try again tomorrow.`,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      message: `${remaining} validation${remaining !== 1 ? 's' : ''} remaining today.`,
      remaining: remaining,
    };
  } catch (error) {
    console.error('Error in checkDailyLimit:', error);
    // Allow on error to avoid blocking users
    return { allowed: true, message: 'Proceeding without limit check' };
  }
};

/**
 * Increment the daily Azure Vision API usage count
 */
const incrementDailyCount = async (): Promise<void> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log('❌ No user found for incrementing count');
      return;
    }

    console.log('✅ User found:', user.id);
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Today date:', today);

    // Get current count and increment it
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('azure_vision_daily_count, azure_vision_last_reset')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching current count:', fetchError);
      return;
    }

    console.log('📊 Current profile data:', profile);
    const currentCount = profile?.azure_vision_daily_count || 0;
    const newCount = currentCount + 1;
    console.log(`📈 Incrementing count from ${currentCount} to ${newCount}`);

    // Update with new count
    const { error } = await supabase
      .from('profiles')
      .update({
        azure_vision_daily_count: newCount,
        azure_vision_last_reset: today,
      })
      .eq('id', user.id);

    if (error) {
      console.error('❌ Error incrementing daily count:', error);
    } else {
      console.log('✅ Successfully incremented count to:', newCount);
    }
  } catch (error) {
    console.error('❌ Error in incrementDailyCount:', error);
  }
};
