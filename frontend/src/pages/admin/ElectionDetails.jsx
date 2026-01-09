import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Users, Mail, Upload, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function ElectionDetails() {
    const { id } = useParams();
    const { token } = useAuth();
    const [election, setElection] = useState(null);
    const [voters, setVoters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [importText, setImportText] = useState('');
    const [importLoading, setImportLoading] = useState(false);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Election Details
            const resElection = await fetch(`http://localhost:3000/api/elections/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dataElection = await resElection.json();
            setElection(dataElection);

            // Fetch Voters
            const resVoters = await fetch(`http://localhost:3000/api/elections/${id}/voters`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dataVoters = await resVoters.json();
            setVoters(dataVoters.voters || []);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!importText.trim()) return;
        setImportLoading(true);

        // Parse CSV/Text: name,email per line
        const lines = importText.split('\n');
        const voterList = lines.map(line => {
            const [name, email] = line.split(',').map(s => s.trim());
            return { name, email };
        }).filter(v => v.email); // Basic filter

        try {
            const res = await fetch(`http://localhost:3000/api/elections/${id}/voters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ voters: voterList })
            });

            const data = await res.json();
            if (res.ok) {
                alert(`Processed: ${data.successCount} success, ${data.errorCount} errors`);
                setImportText('');
                fetchData(); // Refresh list
            } else {
                alert(data.error);
            }

        } catch (err) {
            alert('Import failed');
        } finally {
            setImportLoading(false);
        }
    };

    if (loading) return <div className="text-center py-20 text-white">Loading...</div>;
    if (!election) return <div className="text-center py-20 text-white">Not Found</div>;

    const participationRate = voters.length > 0
        ? Math.round((voters.filter(v => v.hasVoted).length / voters.length) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-gray-900 text-white pb-20">
            <header className="border-b border-gray-800 bg-gray-800/50 backdrop-blur-md sticky top-0 z-10 px-6 py-4">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link to="/admin" className="p-2 hover:bg-gray-700 rounded-full transition"><ArrowLeft size={20} /></Link>
                        <div>
                            <h1 className="text-xl font-bold">{election.title}</h1>
                            <div className="text-sm text-gray-400 font-mono">http://vote.domain.com/vote/{election.slug}</div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${election.status === 'active' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400'
                            }`}>
                            {election.status.toUpperCase()}
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Stats & Config */}
                <div className="space-y-6">
                    <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                        <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wider">Participation</h3>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-4xl font-bold">{participationRate}%</span>
                            <span className="text-gray-500 mb-1">voted</span>
                        </div>
                        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${participationRate}%` }}></div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-400 mt-4">
                            <div className="flex flex-col">
                                <span className="text-white font-bold">{voters.length}</span>
                                <span>Total Voters</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-white font-bold">{voters.filter(v => v.hasVoted).length}</span>
                                <span>Votes Cast</span>
                            </div>
                        </div>
                    </section>

                    <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                        <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wider">Import Voters</h3>
                        <p className="text-xs text-gray-500 mb-2">Format: Name, Email (one per line)</p>
                        <textarea
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm font-mono mb-4 outline-none"
                            rows={5}
                            placeholder="John Doe, john@example.com&#10;Jane Smith, jane@example.com"
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                        />
                        <button
                            onClick={handleImport}
                            disabled={importLoading || !importText}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium transition flex justify-center items-center gap-2"
                        >
                            {importLoading ? 'Processing...' : <><Upload size={16} /> Import & Invite</>}
                        </button>
                    </section>
                </div>

                {/* Right Column: Voter List */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h3 className="font-semibold text-lg">Voter Roll</h3>
                            <button className="text-sm text-blue-400 hover:text-white transition">Export CSV</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Voted At</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {voters.length === 0 ? (
                                        <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500">No voters invited yet.</td></tr>
                                    ) : (
                                        voters.map((v, i) => (
                                            <tr key={i} className="hover:bg-gray-700/30 transition">
                                                <td className="px-6 py-4 font-medium text-white">{v.name}</td>
                                                <td className="px-6 py-4">
                                                    {v.hasVoted ? (
                                                        <span className="inline-flex items-center gap-1 text-green-400 bg-green-500/10 px-2 py-1 rounded text-xs font-medium">
                                                            <CheckCircle size={12} /> Voted
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded text-xs font-medium">
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-gray-400">
                                                    {v.votedAt ? format(new Date(v.votedAt), 'MMM d, HH:mm') : '-'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

            </main>
        </div>
    );
}
