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
      // Set up interval to check competition status
      const timer = setInterval(checkCompetitionStatus, 1000);
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
      <View className="flex-1 items-center justify-center bg-black/50">
        <View
          className={`w-[90%] rounded-xl p-6 ${
            colorScheme === 'dark' ? 'bg-[#fa6f48]' : 'bg-white'
          }`}>
          {/* Close button */}
          <TouchableOpacity onPress={onClose} className="absolute right-4 top-4">
            <Ionicons name="close" size={24} color="black" />
          </TouchableOpacity>

          {/* Title */}
          <Text className="mb-4 mt-4 text-2xl font-bold text-black">
            {competitionName || competitionTime}
          </Text>

          {/* Description */}
          <Text className="mb-8 text-lg text-black">{competitionDescription}</Text>

          {/* Buttons */}
          <View className="gap-3">
            {hasJoined ? (
              <View className="items-center rounded-lg bg-gray-200 p-4">
                <Ionicons name="checkmark-circle" size={24} color="black" />
                <Text className="mt-2 text-center font-semibold text-black">
                  You have joined this competition
                </Text>
              </View>
            ) : isCompetitionFull ? (
              <View className="items-center rounded-lg bg-gray-200 p-4">
                <Ionicons name="people" size={24} color="black" />
                <Text className="mt-2 text-center font-semibold text-black">
                  Competition is Full
                </Text>
                <Text className="mt-1 text-center text-sm text-black/60">
                  {currentParticipantCount}/9 participants
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleJoin}
                disabled={isJoining}
                className="rounded-lg bg-black p-4">
                {isJoining ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-center font-semibold text-white">Join Now</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={onClose} className="rounded-lg bg-gray-200 p-4">
              <Text className="text-center font-semibold text-black">
                {hasJoined ? 'Close' : 'Maybe Later'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}



