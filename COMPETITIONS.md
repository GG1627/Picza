# Building the Competitions Page (Caitlin's Page)

# Overview

There will be 4 competitions every 3 days, day 1 is for allowing everyone to sign up and prepare for competitions, day 2 is the actual compeition, and day 3 is for voting/seeing results, then on the 4th day new competitions will appear

# Main Page View

4 rounded rectangular container, each represents a competiton (Breakfest, Lunch, Dinner, Crazy), each competition will have like a short name entailing what it is like "Breakfest Bash etc," try to change up the names so like during one cycle, the breakfest one will be Breakfest bash but on another cycle it would be "The Sunrise Scramble" (use ChatGPT or Gemini or other models to come up with creative names that make sense). Each competition will have 16 total people allowed to have like a counter as to how many people there are joined, like 0/15 or 4/16, if 16/16 then add some text that says "Full", use a realtime database so that the numbers update in realtime (i feel like that would be cool)

# Crazy Compeition (4th option)

so the crazy competition is more of a fun, no limit, no bounrdairies, just fun and unhinged competition, make up really random crazy names (Flavor Free-for-All, etc.)

# Timers

make each competiton begin at a reasonable time, so have a timer on each card saying how much time reamins until the competition begins

# Modals

before the competitons actually begins, if the user clicks on the card, a modal pops up giving like a short sentnece description of the competition, will just be basic like "Rise and shine, campus chefs—whip up your most creative morning masterpiece in our ultimate Breakfast Battle!" Then have a join button that will add them to the competiton.

# Joined - Waiting for competiton to start

If a user has signed up to join a competiton, the card option ex. Breakfest, some text with "Joined" will be displayed on the card to show that they are joined.

---

# Actual Competiton - Regular person view

Once the competitons have begun, clicking on the card will no longer open the modal but a screen that shows the bracket, if the competiton is in progress have a timer saying how long until it ends. have like "In Progess" text,

# Actual Competiton - Regular person view

# making test competitions

-- Example SQL to create a test competition with 5-minute phases
INSERT INTO breakfast_competitions (
start_time, -- Add these for backward compatibility
end_time, -- Add these for backward compatibility
registration_start_time,
competition_start_time,
competition_end_time,
voting_start_time,
voting_end_time,
status,
theme,
competition_number,
week_number,
year
) VALUES (
NOW(), -- start_time
NOW() + interval '14 minutes', -- end_time (same as voting_end_time)
NOW(), -- registration starts now
NOW() + interval '5 minutes', -- competition starts in 5 minutes
NOW() + interval '9 minutes', -- competition ends in 9 minutes (4 hours compressed to 4 minutes)
NOW() + interval '9 minutes', -- voting starts when competition ends
NOW() + interval '14 minutes', -- voting ends in 14 minutes (1 day compressed to 5 minutes)
'active',
'Test Breakfast Competition',
1,
EXTRACT(WEEK FROM NOW()),
EXTRACT(YEAR FROM NOW())
);

$$
$$
