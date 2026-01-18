
import React, { useState, useEffect } from 'react';

const HelpPage: React.FC = () => {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/help.md')
            .then(res => res.text())
            .then(text => {
                setContent(text);
                setLoading(false);
            })
            .catch(() => {
                setContent('Archive retrieval failure. Manual inaccessible.');
                setLoading(false);
            });
    }, []);

    return (
        <div className="max-w-4xl mx-auto py-20 px-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="mb-16 border-b-8 border-slate-900 pb-10">
                <h1 className="text-7xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Industrial Manual</h1>
                <p className="text-slate-500 text-lg mt-4 font-black uppercase tracking-[0.3em] text-xs">Standard Operating Procedures & Platform Governance</p>
            </header>

            {loading ? (
                <div className="p-20 text-center font-black uppercase tracking-widest text-slate-400 animate-pulse">
                    Accessing Encrypted Metadata...
                </div>
            ) : (
                <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter prose-p:font-medium prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-900 prose-code:text-indigo-600">
                    <div className="whitespace-pre-wrap font-medium text-lg leading-relaxed text-slate-700 bg-white p-12 rounded-[3rem] border shadow-sm">
                        {content}
                    </div>
                </div>
            )}

            <footer className="mt-20 pt-10 border-t border-slate-200 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Property of Tallman Equipment Co. | Security Level: Internal</p>
            </footer>
        </div>
    );
};

export default HelpPage;
