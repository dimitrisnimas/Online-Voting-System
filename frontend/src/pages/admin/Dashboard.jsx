import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Plus, BarChart3, Users, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminDashboard() {
    const [elections, setElections] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token, logout } = useAuth();

    useEffect(() => {
        fetchElections();
    }, []);

    const fetchElections = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/elections', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setElections(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-800/50 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        SecureVote Admin
                    </h1>
                    <div className="flex gap-4">
                        <Link to="/admin/create" className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition">
                            <Plus size={16} /> New Election
                        </Link>
                        <button onClick={logout} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-semibold">Your Elections</h2>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading...</div>
                ) : elections.length === 0 ? (
                    <div className="text-center py-20 bg-gray-800/30 rounded-2xl border border-gray-800 border-dashed">
                        <div className="mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <BarChart3 className="text-gray-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-300">No elections yet</h3>
                        <p className="text-gray-500 mt-2 mb-6">Create your first secure election to get started.</p>
                        <Link to="/admin/create" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium inline-flex items-center gap-2">
                            <Plus size={18} /> Create Election
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {elections.map((election) => (
                            <Link key={election.id} to={`/admin/elections/${election.id}`} className="block group">
                                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 h-full flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${election.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                            election.status === 'ended' ? 'bg-gray-700 text-gray-400' : 'bg-yellow-500/20 text-yellow-500'
                                            }`}>
                                            {election.status.toUpperCase()}
                                        </span>
                                        <span className="text-gray-500 text-xs flex items-center gap-1">
                                            <Calendar size={12} /> {format(new Date(election.createdAt), 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">{election.title}</h3>
                                    <p className="text-gray-400 text-sm line-clamp-2 mb-6 flex-grow">{election.description}</p>

                                    <div className="flex items-center text-blue-400 text-sm font-medium mt-auto">
                                        Manage Election <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
