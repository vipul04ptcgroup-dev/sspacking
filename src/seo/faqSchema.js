import { buildAbsoluteUrl, buildSchemaId, isNonEmptyString, toPlainText } from './organizationSchema';

export function buildFaqSchema({ path, questions = [] }) {
  const mainEntity = questions
    .filter(
      (question) =>
        question &&
        isNonEmptyString(question.question) &&
        isNonEmptyString(question.answer),
    )
    .map((question) => ({
      '@type': 'Question',
      name: toPlainText(question.question),
      acceptedAnswer: {
        '@type': 'Answer',
        text: toPlainText(question.answer),
      },
    }));

  if (mainEntity.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': buildSchemaId(path || '/', 'faq'),
    url: buildAbsoluteUrl(path || '/'),
    mainEntity,
  };
}
