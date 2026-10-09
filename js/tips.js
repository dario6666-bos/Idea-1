// Tip of the day. Short, practical, encouraging. Original wording.
export const TIPS = [
  'Keep a short list of 3 achievements with numbers. Reusing them makes every application quicker.',
  'A follow-up after a week is normal and polite. Most hiring teams are simply busy.',
  'Match 3 phrases from the job post to your own experience. Plain words beat buzzwords.',
  'Save the job post when you apply. Postings vanish, and you’ll want it before an interview.',
  'One strong application is worth more than five rushed ones. Pace yourself.',
  'Write down two questions to ask in every interview. It shows real interest.',
  'Replies often come in batches. A quiet week doesn’t say anything about you.',
  'Thank-you notes take 3 minutes and are remembered more often than you’d think.',
  'Practise your “tell me about yourself” out loud once today. Aim for under 90 seconds.',
  'Ask a friend to read your CV for 5 minutes. A fresh pair of eyes catches small things.',
  'Keep your CV to one clear page where you can. Put the strongest points at the top.',
  'Rejections are information, not a verdict. Note one thing to try next time and move on.',
  'Update your online profile with one new detail today: a project, a skill, a result.',
  'Use the same name in your email, CV and profile so recruiters can find you easily.',
  'Rest counts as progress. A clear head makes better applications.',
  'Before an interview, find one recent thing the company has done and mention it.',
  'Keep follow-ups short: who you are, which role, one friendly question.',
  'Set a small daily target, like one application or one follow-up. Small steps add up.',
  'If a role excites you, tell them why in one specific sentence rather than a general one.',
  'Check spelling of the company and contact names twice. It takes a minute and matters.',
  'Prepare a short story about a problem you solved. Stories are easier to remember than lists.',
  'Reach out to one person in your network today, just to say hello. No ask needed.',
  'Take notes after each interview while it’s fresh: names, topics, next steps.',
  'Salary ranges are easier to discuss when you’ve looked up typical pay for the role first.',
  'A tidy inbox helps. Make a label or folder just for job search emails.',
  'You don’t need to be a perfect match. If you meet most of the requirements, it can be worth applying.',
  'Celebrate small wins: a reply, an interview, or even a tidy CV.',
  'Tailor the first two lines of your cover note. That’s the part most people read.',
];

export const TIP_UNLOCK_ACTIONS = 3;

/** Same tip all day, a different one tomorrow. */
export function tipForDay(dayNumber) {
  const i = ((dayNumber % TIPS.length) + TIPS.length) % TIPS.length;
  return TIPS[i];
}
