import { View, Text, Modal, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useColorScheme } from '../lib/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { joinCompetition, getCompetitionStatus, getParticipantCount } from '~/lib/competitions';
import { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';

type CompModalProps = {
  isVisible: boolean;
  onClose: () => void;
  competitionName: string | null;
  competitionId: string | null;
  competitionType: string;
  competitionDescription: string;
  competitionTime: string;
  user: User | null;
  numberOfParticipants: number;
};

export default function CompModal({
  isVisible,
  onClose,
  competitionName,
  competitionId,
  competitionType,
  competitionDescription,
  competitionTime,
  user,
  numberOfParticipants,
}: CompModalProps) {
  const { colorScheme } = useColorScheme();
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [currentParticipantCount, setCurrentParticipantCount] = useState(numberOfParticipants);
  const isCompetitionFull = currentParticipantCount >= 9;

  const checkParticipationStatus = async () => {
    if (!user || !competitionId) return;

    try {
      const { data, error } = await supabase
        .from('participants')
        .select('status')
        .eq('user_id', user.id)
        .eq('competition_id', competitionId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setHasJoined(!!data && data.status === 'joined');
    } catch (error) {
      console.error('Error checking participation status:', error);
    }
  };

  // Check competition status and close modal if registration phase ends
  const checkCompetitionStatus = async () => {
    if (!isVisible) return;

    try {
      const status = await getCompetitionStatus(competitionType);
      if (status.phase !== 'registration') {
        onClose();
        Alert.alert(
          'Registration Closed',
          'The registration period for this competition has ended.'
        );
      }
    } catch (error) {
      console.error('Error checking competition status:', error);
    }
  };

  // Update participant count when modal opens
  useEffect(() => {
    if (isVisible && competitionId) {
      const fetchLatestCount = async () => {
        try {
          const count = await getParticipantCount(competitionId);
          setCurrentParticipantCount(count);
        } catch (error) {
          console.error('Error fetching participant count:', error);
        }
      };
      fetchLatestCount();
    }
  }, [isVisible, competitionId]);

  useEffect(() => {
    if (isVisible) {
      checkParticipationStatus();
      // Initial check immediately
      checkCompetitionStatus();
      // Set up interval to check competition status every 30 seconds instead of every second
      const timer = setInterval(checkCompetitionStatus, 30000);
      return () => clearInterval(timer);
    }
  }, [isVisible]);

  const handleJoin = async () => {
    if (!competitionId || !user) {
      Alert.alert('Error', 'Competition not found');
      return;
    }

    setIsJoining(true);
    try {
      const success = await joinCompetition(competitionId, user);
      if (success) {
        setHasJoined(true);
        onClose();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to join competition. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/90">
        <View
          className={`w-[90%] rounded-xl p-6 ${
            colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'
          }`}>
          {/* Close button */}
          <TouchableOpacity onPress={onClose} className="absolute right-4 top-4">
            <Ionicons
              name="close"
              size={24}
              color={colorScheme === 'dark' ? '#e0e0e0' : '#1a1a1a'}
            />
          </TouchableOpacity>

          {/* Title */}
          <Text
            className={`mb-4 mt-4 text-2xl font-bold ${
              colorScheme === 'dark' ? 'text-[#e0e0e0]' : 'text-[#1a1a1a]'
            }`}>
            {competitionName || competitionTime}
          </Text>

          {/* Description */}
          <Text
            className={`mb-8 text-lg ${
              colorScheme === 'dark' ? 'text-[#a0a0a0]' : 'text-[#4a4a4a]'
            }`}>
            {competitionDescription}
          </Text>

          {/* Buttons */}
          <View className="gap-3">
            {hasJoined ? (
              <View
                className={`items-center rounded-lg p-4 ${
                  colorScheme === 'dark' ? 'bg-[#1a3a1a]' : 'bg-[#e6f3e6]'
                }`}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colorScheme === 'dark' ? '#4ade80' : '#15803d'}
                />
                <Text
                  className={`mt-2 text-center text-[1rem] font-semibold ${
                    colorScheme === 'dark' ? 'text-[#4ade80]' : 'text-[#15803d]'
                  }`}>
                  You have joined this competition
                </Text>
              </View>
            ) : isCompetitionFull ? (
              <View
                className={`items-center rounded-lg p-4 ${
                  colorScheme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-[#f5f5f5]'
                }`}>
                <Ionicons
                  name="people"
                  size={24}
                  color={colorScheme === 'dark' ? '#e0e0e0' : '#1a1a1a'}
                />
                <Text
                  className={`mt-2 text-center font-semibold ${
                    colorScheme === 'dark' ? 'text-[#e0e0e0]' : 'text-[#1a1a1a]'
                  }`}>
                  Competition is Full
                </Text>
                <Text
                  className={`mt-1 text-center text-sm ${
                    colorScheme === 'dark' ? 'text-[#a0a0a0]' : 'text-[#4a4a4a]'
                  }`}>
                  {currentParticipantCount}/9 participants
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleJoin}
                disabled={isJoining}
                className={`rounded-lg p-4 ${
                  colorScheme === 'dark' ? 'bg-[#e0e0e0]' : 'bg-[#1a1a1a]'
                }`}>
                {isJoining ? (
                  <ActivityIndicator color={colorScheme === 'dark' ? '#1a1a1a' : '#e0e0e0'} />
                ) : (
                  <Text
                    className={`text-center font-semibold ${
                      colorScheme === 'dark' ? 'text-[#1a1a1a]' : 'text-[#e0e0e0]'
                    }`}>
                    Join Now
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onClose}
              className={`rounded-lg p-4 ${
                colorScheme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-[#f5f5f5]'
              }`}>
              <Text
                className={`text-center font-semibold ${
                  colorScheme === 'dark' ? 'text-[#e0e0e0]' : 'text-[#1a1a1a]'
                }`}>
                {hasJoined ? 'Close' : 'Maybe Later'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
