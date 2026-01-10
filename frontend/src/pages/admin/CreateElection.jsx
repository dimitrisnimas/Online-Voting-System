import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Plus, Trash2, Calendar as CalIcon } from 'lucide-react';

export default function CreateElection() {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        description: '',
        startDate: '',
        endDate: '',
        questions: [
            { title: '', type: 'single_choice', maxSelections: 1, options: [{ text: '' }, { text: '' }] }
        ]
    });

    const handleBasicChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const addQuestion = () => {
        setFormData({
            ...formData,
            questions: [...formData.questions, { title: '', type: 'single_choice', maxSelections: 1, options: [{ text: '' }, { text: '' }] }]
        });
    };

    const removeQuestion = (idx) => {
        const newQ = [...formData.questions];
        newQ.splice(idx, 1);
        setFormData({ ...formData, questions: newQ });
    };

    const updateQuestion = (idx, field, val) => {
        const newQ = [...formData.questions];
        newQ[idx][field] = val;
        setFormData({ ...formData, questions: newQ });
    };

    const updateOption = (qIdx, oIdx, val) => {
        const newQ = [...formData.questions];
        newQ[qIdx].options[oIdx].text = val;
        setFormData({ ...formData, questions: newQ });
    };

    const addOption = (qIdx) => {
        const newQ = [...formData.questions];
        newQ[qIdx].options.push({ text: '' });
        setFormData({ ...formData, questions: newQ });
    };

    const removeOption = (qIdx, oIdx) => {
        const newQ = [...formData.questions];
        newQ[qIdx].options.splice(oIdx, 1);
        setFormData({ ...formData, questions: newQ });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const res = await fetch(`${API_URL}/api/elections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create');
            }

            navigate('/admin');
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white pb-20">
            <header className="border-b border-gray-800 bg-gray-800/50 backdrop-blur-md sticky top-0 z-10 px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <Link to="/admin" className="p-2 hover:bg-gray-700 rounded-full transition"><ArrowLeft size={20} /></Link>
                    <h1 className="text-xl font-bold">Create New Election</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Basic Info */}
                    <section className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
                        <h2 className="text-lg font-semibold text-blue-400 mb-4">Election Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm text-gray-400 mb-1">Title</label>
                                <input name="title" required value={formData.title} onChange={handleBasicChange} className="w-full bg-gray-900 border border-gray-700 rounded p-2 focus:border-blue-500 outline-none" placeholder="e.g. Board of Directors 2026" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Slug (URL)</label>
                                <input name="slug" required value={formData.slug} onChange={handleBasicChange} className="w-full bg-gray-900 border border-gray-700 rounded p-2 focus:border-blue-500 outline-none" placeholder="e.g. board-2026" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <textarea name="description" rows={3} value={formData.description} onChange={handleBasicChange} className="w-full bg-gray-900 border border-gray-700 rounded p-2 focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                                <input name="startDate" type="datetime-local" required value={formData.startDate} onChange={handleBasicChange} className="w-full bg-gray-900 border border-gray-700 rounded p-2 focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">End Date</label>
                                <input name="endDate" type="datetime-local" required value={formData.endDate} onChange={handleBasicChange} className="w-full bg-gray-900 border border-gray-700 rounded p-2 focus:border-blue-500 outline-none" />
                            </div>
                        </div>
                    </section>

                    {/* Questions */}
                    <div className="space-y-6">
                        {formData.questions.map((q, qIdx) => (
                            <section key={qIdx} className="bg-gray-800 p-6 rounded-xl border border-gray-700 relative group">
                                <button type="button" onClick={() => removeQuestion(qIdx)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition"><Trash2 size={18} /></button>

                                <div className="mb-4">
                                    <label className="block text-sm text-gray-400 mb-1">Question {qIdx + 1}</label>
                                    <input value={q.title} onChange={(e) => updateQuestion(qIdx, 'title', e.target.value)} required className="w-full bg-gray-900 border border-gray-700 rounded p-2 font-medium focus:border-blue-500 outline-none" placeholder="What is the question?" />
                                </div>

                                <div className="flex gap-4 mb-4">
                                    <div className="w-1/2">
                                        <label className="block text-sm text-gray-400 mb-1">Type</label>
                                        <select value={q.type} onChange={(e) => updateQuestion(qIdx, 'type', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 outline-none">
                                            <option value="single_choice">Single Choice</option>
                                            <option value="multiple_choice">Multiple Choice</option>
                                        </select>
                                    </div>
                                    {q.type === 'multiple_choice' && (
                                        <div className="w-1/2">
                                            <label className="block text-sm text-gray-400 mb-1">Max Selections</label>
                                            <input type="number" min="1" value={q.maxSelections} onChange={(e) => updateQuestion(qIdx, 'maxSelections', parseInt(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded p-2 outline-none" />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 pl-4 border-l-2 border-gray-700">
                                    <label className="block text-sm text-gray-500 mb-1">Options</label>
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex gap-2">
                                            <input value={opt.text} onChange={(e) => updateOption(qIdx, oIdx, e.target.value)} required className="flex-grow bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:border-blue-500 outline-none" placeholder={`Option ${oIdx + 1}`} />
                                            {q.options.length > 2 && (
                                                <button type="button" onClick={() => removeOption(qIdx, oIdx)} className="text-gray-600 hover:text-red-500"><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addOption(qIdx)} className="text-sm text-blue-400 hover:text-blue-300 font-medium mt-2 flex items-center gap-1">
                                        <Plus size={14} /> Add Option
                                    </button>
                                </div>
                            </section>
                        ))}
                    </div>

                    <div className="flex justify-between">
                        <button type="button" onClick={addQuestion} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg font-medium transition flex items-center gap-2">
                            <Plus size={18} /> Add Question
                        </button>
                        <button type="submit" disabled={loading} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold shadow-lg shadow-blue-900/20 transition disabled:opacity-50">
                            {loading ? 'Creating...' : 'Create Election'}
                        </button>
                    </div>

                </form>
            </main>
        </div>
    );
}
