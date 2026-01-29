import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

const Help: React.FC = () => {
    const [content, setContent] = useState<string>('');

    useEffect(() => {
        fetch('/help.md')
            .then(res => res.text())
            .then(text => setContent(text))
            .catch(err => console.error("Failed to load help manual:", err));
    }, []);

    return (
        <div className="max-w-4xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 p-12 md:p-20 relative overflow-hidden">

                {/* Header Decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                <div className="absolute top-10 right-10 opacity-5 text-9xl">📖</div>

                <div className="prose prose-slate prose-lg max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-h1:text-5xl prose-h1:italic prose-a:text-indigo-600 hover:prose-a:text-indigo-500 prose-img:rounded-3xl prose-img:shadow-lg">
                    <ReactMarkdown>{content}</ReactMarkdown>
                </div>

                {/* Footer */}
                <div className="mt-16 pt-8 border-t border-slate-100 flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <span>Tallman Industrial LMS</span>
                    <span>Internal Use Only</span>
                </div>
            </div>
        </div>
    );
};

export default Help;
