import { Badge } from '@/components/ui/Badge';
import type { SearchResult } from '@/types';
import { Link } from 'react-router-dom';

function resultPath(result: SearchResult): string {
  switch (result.type) {
    case 'artist':
      return `/artist/${result.id}`;
    case 'venue':
      return `/venue/${result.id}`;
    case 'event':
      return `/concert/${result.id}`;
  }
}

interface SearchResultItemProps {
  result: SearchResult;
}

export function SearchResultItem({ result }: SearchResultItemProps) {
  return (
    <Link to={resultPath(result)} className="search-result-item">
      {result.imageUrl && (
        <img src={result.imageUrl} alt="" className="search-result-img" loading="lazy" />
      )}
      <div className="search-result-body">
        <div className="search-result-top">
          <span className="search-result-title">{result.title}</span>
          <Badge type={result.type} />
        </div>
        <span className="search-result-sub">{result.subtitle}</span>
      </div>
    </Link>
  );
}
