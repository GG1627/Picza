import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../lib/useColorScheme';
import GradientText from './GradientText';
import GlassButton from './GlassButton';

interface FilterButtonsProps {
  activeFilter: 'all' | 'mySchool' | 'friends';
  sortBy: 'trending' | 'recent';
  isGridView: boolean;
  schoolData?: {
    id: string;
    name: string;
    short_name: string;
    primary_color: string;
    secondary_color: string;
  } | null;
  onFilterChange: (filter: 'all' | 'mySchool' | 'friends') => void;
  onSortChange: (sort: 'trending' | 'recent') => void;
  onViewSwitch: () => void;
}

export default function FilterButtons({
  activeFilter,
  sortBy,
  isGridView,
  schoolData,
  onFilterChange,
  onSortChange,
  onViewSwitch,
}: FilterButtonsProps) {
  const { colorScheme } = useColorScheme();

  return (
    <View style={{ backgroundColor: 'transparent' }}>
      <View className="flex-row justify-center gap-x-[0.3rem] gap-y-2">
        <GlassButton onPress={() => onFilterChange('all')} isActive={activeFilter === 'all'}>
          {activeFilter === 'all' ? (
            <GradientText
              colors={
                colorScheme === 'dark'
                  ? ['#f77f5e', '#f77f5e', '#f77f5e', '#f7bdad', '#f7bdad']
                  : ['#f77f5e', '#cc694e', '#e0775a', '#f77f5e', '#f77f5e']
              }
              locations={[0, 0.3, 0.6, 0.8, 1]}
              className="text-center text-xl font-extrabold"
              style={{
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
                letterSpacing: 0.5,
              }}>
              All
            </GradientText>
          ) : (
            <Text
              className={`text-center text-base font-medium ${
                colorScheme === 'dark' ? 'text-[#515151]' : 'text-gray-600'
              }`}>
              All
            </Text>
          )}
        </GlassButton>

        <GlassButton
          onPress={() => onFilterChange('mySchool')}
          isActive={activeFilter === 'mySchool'}>
          {activeFilter === 'mySchool' ? (
            <GradientText
              colors={[
                schoolData?.primary_color || '#F00511',
                schoolData?.secondary_color || '#F00511',
              ]}
              className="text-center text-xl font-extrabold"
              style={{
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
                letterSpacing: 0.5,
              }}>
              {schoolData?.short_name}
            </GradientText>
          ) : (
            <Text
              className={`text-center text-base font-medium ${
                colorScheme === 'dark' ? 'text-[#515151]' : 'text-gray-600'
              }`}>
              {schoolData?.short_name}
            </Text>
          )}
        </GlassButton>

        <GlassButton
          onPress={() => onFilterChange('friends')}
          isActive={activeFilter === 'friends'}>
          {activeFilter === 'friends' ? (
            <GradientText
              colors={
                colorScheme === 'dark'
                  ? ['#e65c8e', '#e65c8e', '#f08db1', '#f2a2bf', '#f2a2bf']
                  : ['#c44b76', '#c44b76', '#cf517e', '#e65c8e', '#f08db1']
              }
              locations={[0, 0.2, 0.6, 0.8, 1]}
              className="text-center text-xl font-extrabold"
              style={{
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
                letterSpacing: 0.5,
              }}>
              Friends
            </GradientText>
          ) : (
            <Text
              className={`text-center text-base font-medium ${
                colorScheme === 'dark' ? 'text-[#515151]' : 'text-gray-600'
              }`}>
              Friends
            </Text>
          )}
        </GlassButton>

        <GlassButton onPress={() => onSortChange(sortBy === 'trending' ? 'recent' : 'trending')}>
          <View className="flex-row items-center justify-between">
            <View className="w-[5.5rem] flex-row items-center justify-center">
              <View className="mr-0.5">
                {sortBy === 'trending' ? (
                  <GradientText
                    colors={
                      colorScheme === 'dark' ? ['#E0E0E0', '#E0E0E0'] : ['#07020D', '#07020D']
                    }
                    className="text-base font-bold"
                    style={{
                      textShadowColor: 'rgba(0, 0, 0, 0.2)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 3,
                      letterSpacing: 0.5,
                    }}>
                    Trending
                  </GradientText>
                ) : (
                  <GradientText
                    colors={
                      colorScheme === 'dark' ? ['#E0E0E0', '#E0E0E0'] : ['#07020D', '#07020D']
                    }
                    className="text-base font-bold"
                    style={{
                      textShadowColor: 'rgba(0, 0, 0, 0.2)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 3,
                      letterSpacing: 0.5,
                    }}>
                    Recent
                  </GradientText>
                )}
              </View>
              <Ionicons
                name="swap-horizontal"
                size={16}
                color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
              />
            </View>
          </View>
        </GlassButton>

        <GlassButton onPress={onViewSwitch}>
          <Ionicons
            name={isGridView ? 'grid' : 'list'}
            size={23}
            color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
          />
        </GlassButton>
      </View>
    </View>
  );
}
