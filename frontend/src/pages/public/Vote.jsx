import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PublicVote() {
    const { slug } = useParams();
    const [searchParams] = useSearchParams();
    const tokenFromUrl = searchParams.get('token');

    const [election, setElection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [votes, setVotes] = useState({}); // { questionId: [optionId] }
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchElection();
    }, [slug]);

    const fetchElection = async () => {
        try {
            const res = await fetch(`http://localhost:3000/api/public/elections/${slug}`);
            if (!res.ok) throw new Error('Election not found or inactive');
            const data = await res.json();
            setElection(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOptionSelect = (qId, oId, type, maxSelections) => {
        setVotes(prev => {
            const currentSelections = prev[qId] || [];

            if (type === 'single_choice') {
                return { ...prev, [qId]: [oId] };
            } else {
                // Multiple choice
                if (currentSelections.includes(oId)) {
                    return { ...prev, [qId]: currentSelections.filter(id => id !== oId) };
                } else {
                    if (currentSelections.length >= maxSelections) return prev; // Max reached
                    return { ...prev, [qId]: [...currentSelections, oId] };
                }
            }
        });
    };

    const handleSubmit = async () => {
        if (!tokenFromUrl) {
            setError('Missing voting token. Please use the link from your email.');
            return;
        }

        // Validate all questions answered? Optional.
        // For now, allow partial? No, usually require all.
        const unanswered = election.questions.filter(q => !votes[q.id] || votes[q.id].length === 0);
        if (unanswered.length > 0) {
            alert('Please answer all questions before submitting.');
            return;
        }

        // Format payload
        const formattedVotes = Object.entries(votes).map(([qId, optionIds]) => ({
            questionId: qId,
            optionIds
        }));

        try {
            setLoading(true);
            const res = await fetch('http://localhost:3000/api/public/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: tokenFromUrl,
                    electionId: election.id,
                    votes: formattedVotes
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Submission failed');

            setSubmitted(true);
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
            });

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;

    if (submitted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
                <CheckCircle className="text-green-500 w-24 h-24 mb-6" />
                <h1 className="text-3xl font-bold mb-2">Vote Submitted!</h1>
                <p className="text-gray-400 text-center max-w-md">
                    Thank you for participating. Your vote has been securely recorded and anonymized.
                </p>
                <div className="mt-8 p-4 bg-gray-800 rounded-lg text-sm text-gray-500">
                    Your token is now invalidated for future use.
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
                <AlertTriangle className="text-red-500 w-24 h-24 mb-6" />
                <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
                <p className="text-red-400 text-center max-w-md">{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">{election.title}</h1>
                    <p className="text-gray-400">{election.description}</p>
                </div>

                {/* Questions */}
                <div className="space-y-6">
                    {election.questions.map((q, idx) => (
                        <div key={q.id} className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-xl">
                            <h3 className="text-xl font-semibold mb-1">
                                <span className="text-blue-500 mr-2">{idx + 1}.</span>
                                {q.title}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                                {q.type === 'multiple_choice'
                                    ? `Select up to ${q.maxSelections} options`
                                    : 'Select one option'}
                            </p>

                            <div className="space-y-3">
                                {q.options.map(opt => {
                                    const isSelected = (votes[q.id] || []).includes(opt.id);
                                    return (
                                        <div
                                            key={opt.id}
                                            onClick={() => handleOptionSelect(q.id, opt.id, q.type, q.maxSelections)}
                                            className={`
                                                flex items-center p-4 rounded-lg cursor-pointer transition-all border
                                                ${isSelected
                                                    ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                                    : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                                                }
                                            `}
                                        >
                                            <div className={`
                                                w-5 h-5 rounded-full border flex items-center justify-center mr-4
                                                ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-500'}
                                            `}>
                                                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                            </div>
                                            <span className="font-medium">{opt.text}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-8">
                    <button
                        onClick={handleSubmit}
                        disabled={!tokenFromUrl}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-lg rounded-xl shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Submit Vote
                    </button>
                </div>
            </div>
        </div>
    );
}
