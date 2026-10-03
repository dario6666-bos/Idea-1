// Free follow-up message templates. Plain text, filled in locally: no AI, no network.

export const FREE_TEMPLATES = [
  {
    id: 'friendly',
    label: 'Friendly check-in',
    hint: 'Warm and polite. Good for most situations.',
    subject: 'Following up on my {role} application',
    body: [
      'Hi there,',
      '',
      'I hope your week is going well. I applied for the {role} position at {company} on {date} and wanted to check in on the status of my application.',
      '',
      'I’m still very interested in the role and would be glad to share anything else that would help. Thank you for your time.',
      '',
      'Best regards,',
      '{name}',
    ].join('\n'),
  },
  {
    id: 'direct',
    label: 'Short and direct',
    hint: 'Two sentences. Easy to answer.',
    subject: '{role} application: quick follow-up',
    body: [
      'Hello,',
      '',
      'A quick note to follow up on my application for {role} at {company} (submitted {date}). Is there an update on next steps, or anything else you need from me?',
      '',
      'Thanks very much,',
      '{name}',
    ].join('\n'),
  },
  {
    id: 'thanks',
    label: 'Thank you after a conversation',
    hint: 'For after an interview or call.',
    subject: 'Thank you: {role} at {company}',
    body: [
      'Hi there,',
      '',
      'Thank you for taking the time to talk with me about the {role} role at {company}. Learning more about the team made me even more enthusiastic about the opportunity.',
      '',
      'If it would help, I’m happy to provide references, work samples or answers to any further questions. I look forward to hearing about next steps.',
      '',
      'Kind regards,',
      '{name}',
    ].join('\n'),
  },
];

export const NAME_PLACEHOLDER = '[Your name]';

/**
 * Fill {company}, {role}, {date}, {name} in one pass, so text inside a value
 * (for example a company called "{role} Inc") is never expanded again.
 */
export function fillTemplate(template, vars) {
  const values = {
    company: vars.company,
    role: vars.role,
    date: vars.date,
    name: vars.name && vars.name.trim() ? vars.name.trim() : NAME_PLACEHOLDER,
  };
  const fill = (text) => text.replace(/\{(company|role|date|name)\}/g, (_, key) => values[key]);
  return `Subject: ${fill(template.subject)}\n\n${fill(template.body)}`;
}

/** Template best suited to an application's status. */
export function suggestedTemplateId(app) {
  return app.status === 'Interview' ? 'thanks' : 'friendly';
}
