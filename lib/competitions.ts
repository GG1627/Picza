import { Alert } from 'react-native';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import {
  generateRandomDinnerCompetitionName,
  generateRandomLateNightCompetitionName,
  generateRandomMorningLunchCompetitionName,
} from './generateRandomName';

export type CompetitionPhase = 'registration' | 'competing' | 'voting' | 'completed';

export type CompetitionStatus = {
  phase: CompetitionPhase;
  timeRemaining: number; // in seconds
  nextPhaseTime: Date | null;
  name: string | null;
  id: string | null;
};

export type AllCompetitionsStatus = {
  morning: CompetitionStatus;
  noon: CompetitionStatus;
  night: CompetitionStatus;
};

// Add this function to get status for all competitions
export const getAllCompetitionsStatus = async (): Promise<AllCompetitionsStatus> => {
  try {
    const [morningStatus, noonStatus, nightStatus] = await Promise.all([
      getCompetitionStatus('morning'),
      getCompetitionStatus('noon'),
      getCompetitionStatus('night'),
    ]);

    return {
      morning: morningStatus,
      noon: noonStatus,
      night: nightStatus,
    };
  } catch (error) {
    console.error('Error getting all competitions status:', error);
    throw error;
  }
};

export const getCompetitionStatus = async (type: string): Promise<CompetitionStatus> => {
  try {
    const { data, error } = await supabase
      .from('competitions')
      .select(
        'id, comp_start_time, join_end_time, submit_end_time, vote_end_time, comp_end_time, name'
      )
      .eq('type', type)
      .single();

    if (error || !data) {
      // Return completed status if competition doesn't exist
      return {
        phase: 'completed',
        timeRemaining: 0,
        nextPhaseTime: null,
        name: null,
        id: null,
      };
    }

    const now = new Date();
    const joinEnd = new Date(data.join_end_time);
    const submitEnd = new Date(data.submit_end_time);
    const voteEnd = new Date(data.vote_end_time);
    const compEnd = new Date(data.comp_end_time);

    if (now < joinEnd) {
      return {
        phase: 'registration',
        timeRemaining: Math.floor((joinEnd.getTime() - now.getTime()) / 1000),
        nextPhaseTime: joinEnd,
        name: data.name,
        id: data.id,
      };
    } else if (now < submitEnd) {
      return {
        phase: 'competing',
        timeRemaining: Math.floor((submitEnd.getTime() - now.getTime()) / 1000),
        nextPhaseTime: submitEnd,
        name: data.name,
        id: data.id,
      };
    } else if (now < voteEnd) {
      return {
        phase: 'voting',
        timeRemaining: Math.floor((voteEnd.getTime() - now.getTime()) / 1000),
        nextPhaseTime: voteEnd,
        name: data.name,
        id: data.id,
      };
    } else if (now < compEnd) {
      return {
        phase: 'completed',
        timeRemaining: Math.floor((compEnd.getTime() - now.getTime()) / 1000),
        nextPhaseTime: compEnd,
        name: data.name,
        id: data.id,
      };
    } else {
      return {
        phase: 'completed',
        timeRemaining: 0,
        nextPhaseTime: null,
        name: data.name,
        id: data.id,
      };
    }
  } catch (error) {
    console.error('Error getting competition status:', error);
    // Return completed status on error
    return {
      phase: 'completed',
      timeRemaining: 0,
      nextPhaseTime: null,
      name: null,
      id: null,
    };
  }
};

export const createCompetition = async (type: string, user: User | null) => {
  if (!user) {
    Alert.alert('Please login to create a competition');
    return;
  }

  try {
    const now = new Date();
    let compStartTime: Date;
    let competitionName: string;

    if (type === 'morning') {
      compStartTime = new Date(now);
      // set stat time to Mondays at 8am
      compStartTime.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7));
      compStartTime.setHours(8, 0, 0, 0);
      competitionName = generateRandomMorningLunchCompetitionName();
    } else if (type === 'noon') {
      compStartTime = new Date(now);
      // set stat time to Mondays at 4pm
      compStartTime.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7));
      compStartTime.setHours(16, 0, 0, 0);
      competitionName = generateRandomDinnerCompetitionName();
    } else if (type === 'night') {
      compStartTime = new Date(now);
      // set stat time to Mondays at 10pm
      compStartTime.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7));
      compStartTime.setHours(22, 0, 0, 0);
      competitionName = generateRandomLateNightCompetitionName();
    } else {
      throw new Error('Invalid competition type');
    }

    const joinEndTime = new Date(now.getTime() + 1000 * 60 * 1); // 2 minutes from now
    const submitEndTime = new Date(now.getTime() + 1000 * 60 * 2); // 4 minutes from now
    const voteEndTime = new Date(now.getTime() + 1000 * 60 * 3); // 6 minutes from now
    const compEndTime = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour from now

    // const joinEndTime = new Date(compStartTime.getTime() + 1000 * 60 * 60); // 1 hour from now
    // const submitEndTime = new Date(compStartTime.getTime() + 1000 * 60 * 60 * 2); // 2 hours from now
    // const voteEndTime = new Date(compStartTime.getTime() + 1000 * 60 * 60 * 3); // 3 hours from now
    // const compEndTime = new Date(compStartTime.getTime() + 1000 * 60 * 60 * 4); // 4 hours from now

    const { data, error } = await supabase
      .from('competitions')
      .insert({
        type: type,
        name: competitionName,
        comp_start_time: now.toISOString(),
        // comp_start_time: compStartTime.toISOString(),
        join_end_time: joinEndTime.toISOString(),
        submit_end_time: submitEndTime.toISOString(),
        vote_end_time: voteEndTime.toISOString(),
        comp_end_time: compEndTime.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    Alert.alert('Success', `${type} competition created successfully!`);
    return true;
  } catch (error) {
    console.error('Error creating competition:', error);
    Alert.alert('Error', 'Failed to create competition');
    return false;
  }
};

export const deleteCompetition = async (type: string, user: User | null) => {
  if (!user) {
    Alert.alert('Please login to delete a competition');
    return;
  }

  try {
    // First get the competition ID
    const { data: competition, error: compError } = await supabase
      .from('competitions')
      .select('id')
      .eq('type', type)
      .single();

    if (compError) throw compError;
    if (!competition) {
      Alert.alert('Error', 'Competition not found');
      return false;
    }

    // Delete all related data in a transaction
    const { error: deleteError } = await supabase.rpc('delete_competition_data', {
      comp_id: competition.id,
    });

    if (deleteError) throw deleteError;

    Alert.alert('Success', `${type} competition and all related data deleted successfully!`);
    return true;
  } catch (error) {
    console.error('Error deleting competition:', error);
    Alert.alert('Error', 'Failed to delete competition');
    return false;
  }
};

export const joinCompetition = async (competitionId: string, user: User | null) => {
  if (!user) {
    Alert.alert('Please login to join a competition');
    return false;
  }

  try {
    // first check if the competition is in the registration phase
    const { data: competition } = await supabase
      .from('competitions')
      .select('join_end_time')
      .eq('id', competitionId)
      .single();

    if (!competition) {
      Alert.alert('Error', 'Competition not found');
      return false;
    }

    // now insert the participant
    const { error } = await supabase.from('participants').insert({
      competition_id: competitionId,
      user_id: user.id,
      status: 'joined',
    });

    if (error) {
      if (error.code === '23505') {
        // Unique violation
        Alert.alert('Error', 'You have already joined this competition');
      } else {
        throw error;
      }
      return false;
    }

    Alert.alert('Success', 'You have joined the competition!');
    return true;
  } catch (error) {
    console.error('Error joining competition:', error);
    Alert.alert('Error', 'Failed to join competition');
    return false;
  }
};

export const isUserParticipant = async (
  competitionId: string,
  userId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('id')
      .eq('competition_id', competitionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // no rows returned
        return false;
      }
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking if user is participant:', error);
    return false;
  }
};

export const getParticipantCount = async (competitionId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', competitionId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting participant count:', error);
    return 0;
  }
};
