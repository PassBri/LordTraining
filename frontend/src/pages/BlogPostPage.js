import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ResourceLayout from '../components/ResourceLayout';

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND}/api/resources/blog/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setPost)
      .catch(() => setNotFound(true));
  }, [slug]);

  return (
    <ResourceLayout active="/blog">
      <div data-testid="blog-post-page" className="max-w-3xl mx-auto">
        <Link to="/blog" className="text-sm text-slate-400 hover:text-white">← Volver al Blog</Link>
        {notFound && <p className="text-slate-400 mt-6">Artículo no encontrado.</p>}
        {post && (
          <article className="mt-6">
            <span className="text-[11px] font-bold text-[#CCFF00] uppercase tracking-wide">{post.category}</span>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mt-2 mb-3" data-testid="blog-post-title">{post.title}</h1>
            <p className="text-xs text-slate-500 mb-6">{(post.created_at || '').slice(0, 10)}</p>
            {post.image_url && <img src={post.image_url} alt={post.title} className="w-full rounded-xl mb-6 border border-slate-700" />}
            <p className="text-lg text-slate-300 mb-6">{post.summary}</p>
            <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">{post.body}</div>
          </article>
        )}
      </div>
    </ResourceLayout>
  );
}
