// Draws the progress summary and the Progress tab. Reads state, never changes it.
import {
  POINTS, EVENT_LABELS, totalPoints, levelInfo, streakInfo, weeklyGoalInfo, tipInfo, badgeList,
} from './progress.js';

const $ = (id) => document.getElementById(id);

function setBar(id, percent, valueText) {
  const bar = $(id);
  bar.setAttribute('aria-valuenow', String(percent));
  bar.setAttribute('aria-valuetext', valueText);
  bar.firstElementChild.style.width = `${percent}%`;
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function streakCopy(s) {
  if (!s.lastActive) return { big: '0 days', text: 'Any action starts a streak. A few quiet days won’t break it.' };
  if (s.alive) {
    return {
      big: plural(s.current, 'day'),
      text: `Best so far: ${plural(s.best, 'day')}. You can take up to 2 days off between actions and keep it going.`,
    };
  }
  return {
    big: '0 days',
    text: `Fresh start: any action today begins a new streak. Your best so far is ${plural(s.best, 'day')}.`,
  };
}

export function renderProgress(state, today) {
  const { progress, settings } = state;
  const points = totalPoints(progress);
  const lvl = levelInfo(points);
  const goal = weeklyGoalInfo(progress, today, settings.weeklyGoal);
  const streak = streakInfo(progress, today);

  // Summary strip on the Applications tab
  const streakBit = streak.alive && streak.current > 0 ? ` · ${plural(streak.current, 'day')} streak` : '';
  $('strip-text').textContent = `Level ${lvl.level} · ${points} points${streakBit} · ${goal.count} of ${goal.goal} this week`;
  setBar('strip-bar', goal.percent, `${goal.count} of ${goal.goal} actions this week`);

  // Level
  $('lvl-num').textContent = String(lvl.level);
  $('lvl-text').textContent = `${points} points in total. ${plural(lvl.toNext, 'point')} to level ${lvl.level + 1}.`;
  setBar('lvl-bar', lvl.into, `${lvl.into} of ${lvl.size} points`);

  // Streak
  const sc = streakCopy(streak);
  $('streak-num').textContent = sc.big;
  $('streak-text').textContent = sc.text;

  // Weekly goal
  $('goal-text').textContent = goal.reached
    ? `${goal.count} of ${goal.goal} actions. Weekly goal reached, well done.`
    : `${goal.count} of ${goal.goal} actions. ${plural(goal.goal - goal.count, 'more action')} to reach your goal.`;
  setBar('goal-bar', goal.percent, `${goal.count} of ${goal.goal} actions this week`);
  const input = $('goal-input');
  if (document.activeElement !== input) input.value = String(settings.weeklyGoal);

  // Tip
  const tip = tipInfo(progress, today);
  $('tip-text').textContent = tip.unlocked
    ? tip.tip
    : `Complete ${plural(tip.remaining, 'more action')} to unlock today’s tip. Adding an application counts.`;

  // Badges
  const badges = badgeList(progress, today, settings.weeklyGoal);
  const earned = badges.filter((b) => b.earned).length;
  $('badges-summary').textContent = `${earned} of ${badges.length} earned.`;
  $('badge-list').replaceChildren(...badges.map((b) => {
    const li = document.createElement('li');
    li.className = 'badge';
    li.dataset.earned = String(b.earned);
    const mark = document.createElement('span');
    mark.className = 'badge-mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = b.earned ? '✓' : '';
    const text = document.createElement('div');
    const title = document.createElement('p');
    title.className = 'badge-title';
    title.textContent = b.title;
    const how = document.createElement('p');
    how.className = 'badge-how';
    how.textContent = b.how;
    const status = document.createElement('span');
    status.className = 'sr-only';
    status.textContent = b.earned ? ' Earned.' : ' Not earned yet.';
    title.append(status);
    text.append(title, how);
    li.append(mark, text);
    return li;
  }));

  // How points work (static, filled once)
  const list = $('points-list');
  if (!list.childElementCount) {
    list.replaceChildren(...Object.keys(POINTS).map((type) => {
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = EVENT_LABELS[type];
      const pts = document.createElement('strong');
      pts.textContent = `+${POINTS[type]}`;
      li.append(label, pts);
      return li;
    }));
  }
}
