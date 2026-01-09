import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, PieChart } from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

export default function PublicResults() {
    const { slug } = useParams();
    const [election, setElection] = useState(null);
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const contentRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, [slug]);

    const fetchData = async () => {
        try {
            // Fetch info
            const resElection = await fetch(`http://localhost:3000/api/public/elections/${slug}`);
            const dataElection = await resElection.json();

            if (resElection.status === 403) {
                // Election active/not ready
                // Assuming the backend 403 means "Active" but we want "Ended" for results
                // Actually public info endpoint returns 403 if NOT active. 
                // Wait, if it *is* active, we can see info. If ended, we can see info?
                // Inspecting public.js: returns 403 if status !== 'active'. 
                // Ah, I need to allow "ended" status in public info to show results!
                // I will fix public.js in next step. For now assume it works.
            }
            // Actually, let's fetch stats directly and see.

            const resStats = await fetch(`http://localhost:3000/api/public/elections/${slug}/stats`);
            if (resStats.status === 403) {
                setError('Results are not yet available. Please check back after the election ends.');
                setLoading(false);
                return;
            }
            if (!resStats.ok) throw new Error('Failed to load results');
            const dataStats = await resStats.json();

            setElection(dataElection); // This might fail if public info only allows active.
            setStats(dataStats.stats);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = async () => {
        if (!contentRef.current) return;

        const canvas = await html2canvas(contentRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`election-results-${slug}.pdf`);
    };

    if (loading) return <div className="text-center py-20 text-white">Loading...</div>;
    if (error) return <div className="text-center py-20 text-red-400">{error}</div>;

    // Process stats for charts
    // stats array: [{ questionId, optionId, count }]
    // We need to map this back to questions/options text from `election` object.
    // Wait, if `election` fetch failed (because public info restricted), we have no labels.
    // I NEED to relax public info restriction.

    const getChartData = (qId) => {
        const q = election.questions.find(q => q.id === qId);
        if (!q) return [];
        return q.options.map((opt, idx) => {
            const stat = stats.find(s => s.questionId === qId && s.optionId === opt.id);
            return {
                name: opt.text,
                votes: stat ? stat.count : 0,
                fill: COLORS[idx % COLORS.length]
            };
        });
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <div ref={contentRef} className="bg-gray-900 p-8">
                    <header className="mb-12 text-center">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                            {election?.title || 'Election Results'}
                        </h1>
                        <p className="text-gray-400 mb-4">{election?.description}</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-400 border border-gray-700">
                            <span>Ended: {election ? format(new Date(election.endDate), 'PPP p') : ''}</span>
                        </div>
                    </header>

                    <div className="space-y-12">
                        {election?.questions.map((q) => (
                            <div key={q.id} className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-lg page-break-inside-avoid">
                                <h3 className="text-xl font-semibold mb-6">{q.title}</h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={getChartData(q.id)} layout="vertical" margin={{ left: 20 }}>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#9ca3af' }} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                                                itemStyle={{ color: '#fff' }}
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            />
                                            <Bar dataKey="votes" radius={[0, 4, 4, 0]}>
                                                {getChartData(q.id).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-center mt-12">
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold shadow-lg transition"
                    >
                        <Download size={20} /> Download PDF Report
                    </button>
                </div>
            </div>
        </div>
    );
}
