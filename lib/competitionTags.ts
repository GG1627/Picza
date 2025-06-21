export type CompetitionTag = {
  tag: string;
  color: string;
  bgColor: string;
  borderColor: string;
};

export const getCompetitionTag = (
  wins: number | null,
  username?: string,
  customTag?: {
    tag: string | null;
    color: string | null;
  },
  colorScheme?: 'light' | 'dark'
): CompetitionTag => {
  if (customTag && customTag.tag && customTag.color) {
    return {
      tag: customTag.tag,
      color: customTag.color,
      bgColor: colorScheme === 'dark' ? '#1a1a1a' : '#f3f4f6', // Darker background for dark mode
      borderColor: customTag.color, // Same as text color
    };
  }

  if (!wins)
    return {
      tag: 'Foodie Freshman',
      color: '#9ca3af',
      bgColor: colorScheme === 'dark' ? '#1a1a1a' : '#f3f4f6',
      borderColor: '#9ca3af',
    };

  if (wins >= 50)
    return {
      tag: 'Culinary Legend',
      color: '#FFD700',
      bgColor: colorScheme === 'dark' ? '#1a1a1a' : '#f3f4f6',
      borderColor: '#FFD700',
    };
  if (wins >= 20)
    return {
      tag: 'Master Chef',
      color: '#FF69B4',
      bgColor: colorScheme === 'dark' ? '#1a1a1a' : '#f3f4f6',
      borderColor: '#FF69B4',
    };
  if (wins >= 10)
    return {
      tag: 'Food Champion',
      color: '#FF4500',
      bgColor: colorScheme === 'dark' ? '#1a1a1a' : '#f3f4f6',
      borderColor: '#FF4500',
    };
  if (wins >= 5)
    return {
      tag: 'Rising Star',
      color: '#FF8C00',
      bgColor: colorScheme === 'dark' ? '#1a1a1a' : '#f3f4f6',
      borderColor: '#FF8C00',
    };
  if (wins >= 2)
    return {
      tag: 'Promising Cook',
      color: '#32CD32',
      bgColor: colorScheme === 'dark' ? '#1a1a1a' : '#f3f4f6',
      borderColor: '#32CD32',
    };
  return {
    tag: 'Kitchen Newbie',
    color: '#87CEEB',
    bgColor: colorScheme === 'dark' ? '#1a1a1a' : '#f3f4f6',
    borderColor: '#87CEEB',
  };
};
