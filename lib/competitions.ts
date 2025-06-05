import { supabase } from './supabase';
import { generateRandomBreakfastName } from './generateRandomName';

export async function createBreakfastCompetition(
  startTime: Date,
  endTime: Date,
  theme: string,
  competitionNumber: number,
  weekNumber: number,
  year: number
) {
  const { data, error } = await supabase.rpc('create_breakfast_competition', {
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    theme,
    competition_number: competitionNumber,
    week_number: weekNumber,
    year,
  });

  if (error) throw error;
  return data;
}

export async function joinBreakfastCompetition(competitionId: string, userId: string) {
  const { data, error } = await supabase.rpc('join_breakfast_competition', {
    p_competition_id: competitionId,
    p_user_id: userId,
  });

  if (error) throw error;
  return data;
}

export async function submitBreakfastPhoto(
  competitionId: string,
  userId: string,
  imageUrl: string,
  caption: string
) {
  const { data, error } = await supabase.rpc('submit_breakfast_photo', {
    competition_id: competitionId,
    user_id: userId,
    image_url: imageUrl,
    caption,
  });

  if (error) throw error;
  return data;
}

export async function voteBreakfastSubmission(submissionId: string, voterId: string) {
  const { data, error } = await supabase.rpc('vote_breakfast_submission', {
    submission_id: submissionId,
    voter_id: voterId,
  });

  if (error) throw error;
  return data;
}

// Function to get current competition
export async function getCurrentBreakfastCompetition() {
  const { data, error } = await supabase
    .from('breakfast_competitions')
    .select('*')
    .eq('status', 'active')
    .single();

  if (error) throw error;
  return data;
}

// Function to get participant count
export async function getBreakfastParticipantCount(competitionId: string) {
  const { count, error } = await supabase
    .from('breakfast_participants')
    .select('*', { count: 'exact', head: true })
    .eq('competition_id', competitionId);

  if (error) throw error;
  return count;
}

// Function to get the current week number
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Function to create a new competition
export async function createNewBreakfastCompetition() {
  const now = new Date();
  const weekNumber = getWeekNumber(now);
  const year = now.getFullYear();

  // Determine competition number (1 or 2) based on current date
  const competitionNumber = now.getDay() <= 3 ? 1 : 2;

  // Set registration start time (now)
  const registrationStartTime = new Date();

  // Set competition start time (1 day after registration starts)
  const competitionStartTime = new Date(registrationStartTime);
  competitionStartTime.setDate(competitionStartTime.getDate() + 1);

  // Set competition end time (4 hours after competition starts)
  const competitionEndTime = new Date(competitionStartTime);
  competitionEndTime.setHours(competitionEndTime.getHours() + 4);

  // Set voting start time (same as competition end time)
  const votingStartTime = new Date(competitionEndTime);

  // Set voting end time (1 day after voting starts)
  const votingEndTime = new Date(votingStartTime);
  votingEndTime.setDate(votingEndTime.getDate() + 1);

  // Generate a random breakfast theme
  const theme = generateRandomBreakfastName();

  try {
    const { data, error } = await supabase.rpc('create_breakfast_competition', {
      registration_start_time: registrationStartTime.toISOString(),
      competition_start_time: competitionStartTime.toISOString(),
      competition_end_time: competitionEndTime.toISOString(),
      voting_start_time: votingStartTime.toISOString(),
      voting_end_time: votingEndTime.toISOString(),
      theme,
      competition_number: competitionNumber,
      week_number: weekNumber,
      year,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating new competition:', error);
    throw error;
  }
}

// Function to get competition phase
export type CompetitionPhase = 'registration' | 'competition' | 'voting' | 'completed';

export async function getCompetitionPhase(competitionId: string): Promise<CompetitionPhase> {
  const { data: competition, error } = await supabase
    .from('breakfast_competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (error) throw error;

  const now = new Date();
  const registrationStart = new Date(competition.registration_start_time);
  const competitionStart = new Date(competition.competition_start_time);
  const competitionEnd = new Date(competition.competition_end_time);
  const votingStart = new Date(competition.voting_start_time);
  const votingEnd = new Date(competition.voting_end_time);

  // Check phases in order
  if (now < competitionStart) {
    return 'registration';
  } else if (now < competitionEnd) {
    return 'competition';
  } else if (now < votingEnd) {
    return 'voting';
  } else {
    return 'completed';
  }
}

// Function to get time until next phase
export async function getTimeUntilNextPhase(competitionId: string): Promise<string> {
  const { data: competition, error } = await supabase
    .from('breakfast_competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (error) throw error;

  const now = new Date();
  const registrationStart = new Date(competition.registration_start_time);
  const competitionStart = new Date(competition.competition_start_time);
  const competitionEnd = new Date(competition.competition_end_time);
  const votingStart = new Date(competition.voting_start_time);
  const votingEnd = new Date(competition.voting_end_time);

  let targetTime: Date;
  let phase: string;

  if (now < competitionStart) {
    targetTime = competitionStart;
    phase = 'competition';
  } else if (now < competitionEnd) {
    targetTime = competitionEnd;
    phase = 'voting';
  } else if (now < votingEnd) {
    targetTime = votingEnd;
    phase = 'results';
  } else {
    return 'Competition completed';
  }

  const difference = targetTime.getTime() - now.getTime();
  return `${difference}`; // Return raw milliseconds
}

// Function to check and update competition status
export async function checkAndUpdateCompetitionStatus() {
  const now = new Date();

  // Get the current active competition
  const { data: currentCompetition, error: fetchError } = await supabase
    .from('breakfast_competitions')
    .select('*')
    .eq('status', 'active')
    .single();

  if (fetchError) {
    // If no active competition exists, return null
    if (fetchError.code === 'PGRST116') {
      return null;
    }
    throw fetchError;
  }

  // Check if competition has ended
  const votingEndTime = new Date(currentCompetition.voting_end_time);
  if (now > votingEndTime) {
    // Competition has ended, mark it as completed
    await supabase
      .from('breakfast_competitions')
      .update({ status: 'completed' })
      .eq('id', currentCompetition.id);
  }

  return currentCompetition;
}

// Function to check if user has joined a competition
export async function hasUserJoinedCompetition(competitionId: string, userId: string) {
  const { data, error } = await supabase
    .from('breakfast_participants')
    .select('id')
    .eq('competition_id', competitionId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return false; // No rows returned
    throw error;
  }
  return !!data;
}
