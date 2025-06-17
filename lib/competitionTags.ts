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
    bgColor: string | null;
    borderColor: string | null;
  }
): CompetitionTag => {
  if (customTag && customTag.tag && customTag.color && customTag.bgColor && customTag.borderColor) {
    return {
      tag: customTag.tag,
      color: customTag.color,
      bgColor: customTag.bgColor,
      borderColor: customTag.borderColor,
    };
  }

  if (!wins)
    return {
      tag: '🍕 Foodie Freshman',
      color: '#9ca3af',
      bgColor: '#2e2e2e',
      borderColor: '#9ca3af',
    };

  if (wins >= 50)
    return {
      tag: '👑 Culinary Legend',
      color: '#FFD700',
      bgColor: '#2e2a1f',
      borderColor: '#FFD700',
    };
  if (wins >= 20)
    return {
      tag: '🌟 Master Chef',
      color: '#FF69B4',
      bgColor: '#2e1f2a',
      borderColor: '#FF69B4',
    };
  if (wins >= 10)
    return {
      tag: '🔥 Food Champion',
      color: '#FF4500',
      bgColor: '#2e1f1f',
      borderColor: '#FF4500',
    };
  if (wins >= 5)
    return {
      tag: '⭐ Rising Star',
      color: '#FF8C00',
      bgColor: '#2e251f',
      borderColor: '#FF8C00',
    };
  if (wins >= 2)
    return {
      tag: '🌱 Promising Cook',
      color: '#32CD32',
      bgColor: '#1f2e1f',
      borderColor: '#32CD32',
    };
  return {
    tag: '🍳 Kitchen Newbie',
    color: '#87CEEB',
    bgColor: '#1f2a2e',
    borderColor: '#87CEEB',
  };
};
