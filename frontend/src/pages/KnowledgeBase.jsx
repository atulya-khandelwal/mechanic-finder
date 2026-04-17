import { useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import useDocumentTitle from '../hooks/useDocumentTitle';
import articles from '../data/articles';

const CATEGORIES = [
  { id: 'all', label: 'All Articles' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'scheduled', label: 'Maintenance' },
];

export default function KnowledgeBase() {
  useDocumentTitle('Knowledge Base - Vehicle Guides & Tips');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = articles.filter((a) => {
    if (category !== 'all' && a.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.keywords.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <main className="kb-page">
      <ThemeToggle />

      <header className="kb-header">
        <div className="kb-container">
          <Link to="/" className="kb-back-link">Mobile Mechanic</Link>
          <h1>Knowledge Base</h1>
          <p>Guides, tips, and expert advice for every vehicle situation — from roadside emergencies to routine maintenance.</p>
        </div>
      </header>

      <div className="kb-container">
        <div className="kb-controls">
          <div className="kb-filters">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                className={`kb-filter-btn ${category === c.id ? 'active' : ''}`}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <input
            className="kb-search"
            type="search"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search knowledge base"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="kb-empty">No articles match your search. Try different keywords.</p>
        ) : (
          <div className="kb-grid">
            {filtered.map((article) => (
              <Link
                key={article.slug}
                to={`/knowledge-base/${article.slug}`}
                className="kb-card"
              >
                <span className={`kb-tag kb-tag-${article.category}`}>
                  {article.category === 'emergency' ? 'Emergency' : 'Maintenance'}
                </span>
                <h2>{article.title}</h2>
                <p>{article.description}</p>
                <span className="kb-meta">{article.readTime} min read</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className="kb-footer">
        <div className="kb-container">
          <p>Need help right now? <Link to="/register">Find a mechanic near you</Link></p>
        </div>
      </footer>
    </main>
  );
}
