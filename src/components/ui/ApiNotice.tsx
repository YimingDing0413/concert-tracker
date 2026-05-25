interface ApiNoticeProps {
  message?: string;
  source?: string;
}

export function ApiNotice({ message, source }: ApiNoticeProps) {
  if (!message && source !== 'mock' && source !== 'partial') return null;
  return (
    <p className="api-notice" role="status">
      {message ?? (source === 'mock' ? 'Showing sample data — add API keys in .env.local' : '')}
    </p>
  );
}
