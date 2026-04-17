import { useParams, Link, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import ThemeToggle from '../components/ThemeToggle';
import useDocumentTitle from '../hooks/useDocumentTitle';
import articles from '../data/articles';

/** Render markdown-lite text: **bold**, \n\n → paragraphs, \n- → list items */
function renderContent(text) {
  const blocks = text.split('\n\n');
  return blocks.map((block, i) => {
    // Check if this block is a list (lines starting with -)
    const lines = block.split('\n');
    const isList = lines.every((l) => l.startsWith('- ') || l.startsWith('  ') || l.trim() === '');
    // Check if it's a table
    const isTable = lines.length >= 2 && lines[0].includes('|') && lines[1].includes('---');

    if (isTable) {
      const headerCells = lines[0].split('|').map((c) => c.trim()).filter(Boolean);
      const bodyRows = lines.slice(2).filter((l) => l.includes('|'));
      return (
        <div className="kb-table-wrap" key={i}>
          <table className="kb-table">
            <thead>
              <tr>{headerCells.map((c, j) => <th key={j}>{formatInline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => {
                const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
                return <tr key={ri}>{cells.map((c, ci) => <td key={ci}>{formatInline(c)}</td>)}</tr>;
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (isList) {
      const items = lines.filter((l) => l.startsWith('- '));
      return (
        <ul key={i}>
          {items.map((item, j) => (
            <li key={j}>{formatInline(item.slice(2))}</li>
          ))}
        </ul>
      );
    }

    // Check for numbered list
    const isNumbered = lines.every((l) => /^\d+\.\s/.test(l) || l.trim() === '');
    if (isNumbered) {
      const items = lines.filter((l) => /^\d+\.\s/.test(l));
      return (
        <ol key={i}>
          {items.map((item, j) => (
            <li key={j}>{formatInline(item.replace(/^\d+\.\s/, ''))}</li>
          ))}
        </ol>
      );
    }

    return <p key={i}>{formatInline(block.replace(/\n/g, ' '))}</p>;
  });
}

/** Format inline **bold** markers */
function formatInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function Article() {
  const { slug } = useParams();
  const article = articles.find((a) => a.slug === slug);

  useDocumentTitle(article ? article.title : 'Article Not Found');

  // Scroll to top on article load
  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  if (!article) {
    return <Navigate to="/knowledge-base" replace />;
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    author: { '@type': 'Organization', name: 'Mobile Mechanic' },
    publisher: {
      '@type': 'Organization',
      name: 'Mobile Mechanic',
      url: 'https://mobilemechanic.atulyakhandelwal.in',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://mobilemechanic.atulyakhandelwal.in/knowledge-base/${article.slug}`,
    },
  };

  return (
    <main className="kb-page">
      <ThemeToggle />

      {/* JSON-LD for this article */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="kb-breadcrumb">
        <div className="kb-container">
          <Link to="/">Home</Link>
          <span className="kb-breadcrumb-sep">/</span>
          <Link to="/knowledge-base">Knowledge Base</Link>
          <span className="kb-breadcrumb-sep">/</span>
          <span>{article.title}</span>
        </div>
      </nav>

      <article className="kb-article">
        <div className="kb-container">
          <header className="kb-article-header">
            <span className={`kb-tag kb-tag-${article.category}`}>
              {article.category === 'emergency' ? 'Emergency' : 'Maintenance'}
            </span>
            <h1>{article.title}</h1>
            <p className="kb-article-meta">
              <time dateTime={article.date}>
                {new Date(article.date).toLocaleDateString('en-IN', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </time>
              <span className="kb-meta-dot"> &middot; </span>
              <span>{article.readTime} min read</span>
            </p>
          </header>

          {article.sections.map((section, i) => (
            <section key={i} className="kb-article-section">
              <h2>{section.heading}</h2>
              {renderContent(section.content)}
            </section>
          ))}

          <footer className="kb-article-cta">
            <h2>Need a mechanic right now?</h2>
            <p>Find a trusted mobile mechanic near you — available 24/7 for emergencies and scheduled services.</p>
            <Link to="/register" className="btn btn-primary">Get Started Free</Link>
          </footer>
        </div>
      </article>

      <nav className="kb-bottom-nav">
        <div className="kb-container">
          <Link to="/knowledge-base" className="btn btn-secondary">Browse All Articles</Link>
        </div>
      </nav>
    </main>
  );
}
