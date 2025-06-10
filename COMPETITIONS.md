# Building Competition Page - Caitlin's Task

> **Note:** Read the entire document before starting

> **Note:** Get a markdown reader extension to view this properly, or just view it in GitHub

## Summary of How a Competition Works

1. **Registration Phase**

   - Users can only join a competition during this phase by clicking on the box and selecting "Join Now" in the modal
   - Once registration time ends, no one else can join
   - Maximum of 9 participants per competition (for now)

2. **Competing Phase**

   - After registration ends, the competition enters the competing phase
   - Participants can click on the box to navigate to `morningCompetition.tsx` screen
   - Participants can upload and submit an image before the time runs out
   - If a viewer (non-participant) clicks on the box in `competitions.tsx`, an alert will notify them that the competition has already begun

3. **Voting Phase**

   - After competing phase ends, voting begins
   - Clicking the competition box navigates both participants and viewers to the voting screen
   - Submissions are shown in a 3x3 grid
   - Users can select one submission to vote on (one vote per user)
   - Must vote before time runs out

4. **Completed Phase**
   - Shows the winner and vote count
   - Clicking the box navigates users to the `morningResults.tsx` page
   - Displays final standings with vote counts for all participants
   - _Note: Styling for this page wasn't fully tested, so implement it similar to the 'morning' competition_

## Current Implementation (For Testing)

### Supabase Tables

- competitions
- participants
- submissions
- votes

### Competition Phases

- registration
- competing
- voting
- completed

Currently, we can make testing competitions using the "Make Comp" button, which will create a competition in the competitions table. You can delete the competition using the "Delete Comp" button, which will delete the competition and all its related data (e.g., participants, submissions, votes that are connected to that specific competition). Only make one competition at a time and delete one competition at a time. If you click on "Delete Comp" when there are no competitions to delete, you'll get an error - don't worry about that, it's just saying that there's nothing to delete.

## My Recommendation

Click on the "Make Competition" button and go through one complete competition as a participant (join the competition) just so you can see everything that's going on.

As for the coding, go through the main `competition.tsx` file and see what I made for the 'morning' competition since everything there has been implemented. Any helper functions or anything that I used there, you can just Ctrl+Click on it and it will take you to wherever it was made. Many functions can be reused just by changing the parameters, or you can copy and paste and change whatever needs to be changed. A lot can be copy-pasted, but then you wouldn't really be learning React/React Native, so use it as a guide. Feel free to copy and paste stuff if you want, and feel free to use AI and all that. Make a separate branch for everything that you do, and once you're done, we can do a PR and merge everything. I set restrictions in GitHub to prevent automatic merge to main.

Don't worry too much about styling - just make sure it's the same stuff as everything else I made. Styling improvements can be made later on since they are quick and easy. This is more focused on implementation.

While you're going through everything, if you see some things that could be added/slightly changed to improve anything or any styling that you think would make something look better, there's a section at the very bottom for noting stuff down. Feel free to put down anything there if you want, but don't feel forced to use it if you think everything is fine.

### To Change Which Competition to Make

In `competitions.tsx`:

```typescript
<Button
  title="Make Comp"
  onPress={async () => {
    const success = await createCompetition('morning', user);
    if (success) {
      fetchStatus();
    }
  }}
/>
<Button
  title="Delete Comp"
  onPress={async () => {
    const success = await deleteCompetition('morning', user);
    if (success) {
      fetchStatus();
    }
  }}
/>
```

This is an example of how to make a 'morning' competition. This is the competition that I already made. To make the other two, you would just change the parameter to 'noon' or 'night'. No need to make new buttons, just change the parameters.

Example: `createCompetition('noon', user);`

_Disclaimer: We would really be working with "afternoon" timing in the final/completed implementation, but I just used the 'noon' parameter throughout instead. Just thought I'd include this incase you're ever wondering lol._

### To Change Time Intervals

In `createCompetition` function (`competitions.ts`):

```typescript
const joinEndTime = new Date(now.getTime() + 1000 * 60 * 1); // 1 minute from now
const submitEndTime = new Date(now.getTime() + 1000 * 60 * 2); // 2 minutes from now
const voteEndTime = new Date(now.getTime() + 1000 * 60 * 3); // 3 minutes from now
const compEndTime = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour (60 minutes) from now
```

If you want more time during certain phases, just change the final number in the parentheses. Remember, if you made a competition but changed its time, you'll need to delete it then make a new one with the updated timing.

## Future Implementation

After you're done, I will go back and set the times so the competitions start on specific dates and times (e.g., every Monday at 8am for morning competition) and that it's automated so that once one competition entirely finishes, another will be created. Don't worry about this - I will do this after you're done with everything. It's fairly simple, and I think I already have it, just commented out.

## Screens to Implement

### Noon Competition Screens

- [ ] `NoonCompModal.tsx`
- [ ] `noonCompetition.tsx`
- [ ] `noonVoting.tsx`
- [ ] `noonResults.tsx`

### Night Competition Screens

- [ ] `NightCompModal.tsx`
- [ ] `nightCompetition.tsx`
- [ ] `nightVoting.tsx`
- [ ] `nightResults.tsx`

> _Note: If I forgot anything, my bad_

## Caitlin's Notes and Observations
