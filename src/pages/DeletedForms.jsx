import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MaskImage from "../components/MaskImage";
import { formAPI, capitalizeWords } from "../utils/api";
import { showToast } from "../utils/toast";

export default function DeletedForms() {
    const [deletedForms, setDeletedForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchDeletedForms();
    }, []);

    const fetchDeletedForms = async () => {
        try {
            setLoading(true);

            const response = await formAPI.getAll();

            console.log("API response:", response);

            if (response.success) {
                console.log((response.data).filter(f => f.inTrash == "yes"))
                setDeletedForms(
                    (response.data || []).filter(f => f.inTrash == "yes")
                );
            } else {
                showToast(response.message || "Failed to fetch deleted forms", "error");
            }
        } catch (err) {
            console.error("Error fetching deleted forms:", err);
            showToast("An error occurred while fetching deleted forms", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (formId) => {
        try {
            const response = await formAPI.update(formId, { inTrash: "no" });
            if (response.success) {
                setDeletedForms(deletedForms.filter(form => form._id !== formId));
                showToast("Form restored successfully! It will now appear in Manage Forms.", "success");
            } else {
                showToast(response.message || "Failed to restore form", "error");
            }
        } catch (err) {
            console.error("Error restoring form:", err);
            showToast("An error occurred while restoring the form", "error");
        }
    };

    const handlePermanentDelete = async (formId) => {
        if (!window.confirm("Are you sure you want to permanently delete this form? This action cannot be undone.")) {
            return;
        }

        try {
            const response = await formAPI.permanentDelete(formId);
            if (response.success) {
                setDeletedForms(deletedForms.filter(form => form._id !== formId));
                showToast("Form permanently deleted!", "success");
            } else {
                showToast(response.message || "Failed to delete form", "error");
            }
        } catch (err) {
            console.error("Error deleting form:", err);
            showToast("An error occurred while deleting the form", "error");
        }
    };

    const filteredForms = deletedForms.filter(form => {
        const matchesSearch = form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (form.description && form.description.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSearch;
    });

    if (loading) {
        return (
            <div className="px-4 mt-6">
                <div className="flex-1 w-full max-w-[1400px] mx-auto">
                    <div className="flex items-center justify-center h-[60vh]">
                        <div className="text-center">
                            <div className="text-[var(--text-dark)] text-[1.2em] mb-4">Loading deleted forms...</div>
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)] mx-auto"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 mt-6">
            <div className="flex-1 w-full max-w-[1400px] mx-auto">
                <div className="flex md:flex-row flex-col justify-between md:items-center mb-6 gap-5">
                    <div>
                        <h1 className="text-[var(--text-dark)] text-[1.5em] font-semibold mb-1">Deleted Forms</h1>
                        <p className="text-[var(--text-dark)] text-[.85em] opacity-75">View and restore deleted forms</p>
                    </div>
                    <Link
                        to="/manage-forms"
                        className="flex gap-2 w-max text-[.8em] cursor-pointer text-[var(--text-light)] font-semibold items-center justify-center bg-[var(--primary-color)] p-3 rounded-[5px] shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_50%,rgba(255,255,255,0))] hover:shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_70%,rgba(255,255,255,0))] translate-y-[-2px] hover:translate-y-[-4px] duration-300"
                    >
                        Back to Manage Forms
                    </Link>
                </div>

                {/* Search */}
                <div className="bg-[var(--bg-w)] rounded-[6px] shadow-[0px_0px_10px_rgba(0,0,0,0.1)] text-[20px] overflow-hidden mb-6">
                    <div className="flex flex-col shadow-[0px_0px_10px_rgba(0,0,0,0.1)] p-5 relative z-2">
                        <div className="flex md:flex-row flex-col justify-between gap-4 md:items-center">
                            <h2 className="text-[.75em] text-[var(--text-dark)] font-semibold uppercase">SEARCH DELETED FORMS</h2>
                            <div className="search-input-wrapper flex w-full md:max-w-[350px] justify-between p-1 ps-4 rounded-[10px]">
                                <input
                                    type="text"
                                    id="input-search"
                                    placeholder="Search by name or description..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="md:w-[80%] w-full border-none shadow-none outline-none text-[.8em] text-[var(--primary-color)] placeholder:font-medium placeholder:text-[color-mix(in_srgb,var(--text-dark)_35%,rgba(255,255,255,0))]"
                                />
                                <label htmlFor="input-search" className="rounded-full cursor-pointer hover:bg-[var(--hover)] p-2">
                                    <MaskImage url="/icons/search.svg" w=".9em" h=".9em" bg="var(--primary-color)" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Deleted Forms List */}
                <div className="bg-[var(--bg-w)] rounded-[8px] shadow-[0px_0px_10px_rgba(0,0,0,0.1)] lg:p-6 p-3">
                    {filteredForms.length === 0 ? (
                        <div className="text-center py-12 flex flex-col items-center">
                            <p className="text-[var(--text-dark)] text-[1em] mb-4">No deleted forms found</p>
                            <Link
                                to="/manage-forms"
                                className="flex gap-2 w-max text-[.8em]  cursor-pointer text-[var(--text-light)] font-semibold items-center justify-center bg-[var(--primary-color)] p-3 rounded-[5px] shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_50%,rgba(255,255,255,0))] hover:shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_70%,rgba(255,255,255,0))] translate-y-[-2px] hover:translate-y-[-4px] duration-300"
                            >
                                Go to Manage Forms
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredForms.map((form) => (
                                <div key={form._id} className="group bg-[var(--bg-w)] border border-[var(--border)] rounded-[16px] overflow-hidden hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col grayscale-[0.2]">

                                    {/* Header / ID area */}
                                    <div className="h-[8px] bg-gradient-to-r from-[var(--primary-color)] to-[#00bad1] opacity-75 relative"></div>

                                    <div className="px-6 pb-6 pt-5 relative flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className="text-[0.7em] font-mono text-[var(--text-2)] uppercase tracking-wider">ID: {form._id.slice(-6)}</span>
                                                <h3 className="text-[1.25em] font-bold text-[var(--text-dark)] leading-tight mt-1">{form.name ? capitalizeWords(form.name) : 'Untitled Form'}</h3>
                                            </div>

                                            {/* Status Flag */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-[0.75em] px-3 py-1 rounded-full font-medium bg-[#e8122415] text-[#e81224]">
                                                    Deleted
                                                </span>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex items-center gap-6 mt-2 pt-4 border-t border-[var(--border)] mb-6">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <MaskImage url={`/icons/field.svg`} w="1em" h="1em" bg="var(--text-2)" />
                                                    <span className="text-[1.1em] font-bold text-[var(--text-dark)]">{form.fields?.length || 0}</span>
                                                </div>
                                                <span className="text-[0.75em] text-[var(--text-2)] uppercase font-semibold mt-1">Fields</span>
                                            </div>
                                            <div className="w-px h-8 bg-[var(--border)]"></div>
                                            <div className="flex flex-col">
                                                <span className="text-[0.9em] font-bold text-[var(--text-dark)] mt-0.5">{new Date(form.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                <span className="text-[0.75em] text-[var(--text-2)] uppercase font-semibold mt-1.5">Created Date</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-3 mt-auto">
                                            <button onClick={() => handleRestore(form._id)} className="flex-1 bg-[var(--primary-color)] text-[var(--text-light)] py-2.5 rounded-[10px] flex justify-center items-center gap-2 text-[0.85em] font-semibold hover:-translate-y-0.5 shadow-md shadow-[color-mix(in_srgb,var(--primary-color)_30%,rgba(0,0,0,0))] transition-all duration-300">
                                                <MaskImage url="/icons/restore.svg" w="1.2em" h="1.2em" bg="currentColor" />
                                                Restore
                                            </button>
                                            <button onClick={() => handlePermanentDelete(form._id)} className="flex-1 bg-[var(--hover)] text-[#ff4c51] py-2.5 rounded-[10px] flex justify-center items-center gap-2 text-[0.85em] font-semibold hover:-translate-y-0.5 hover:bg-[#ff4c5110] transition-all duration-300 border border-[var(--border)] hover:border-[#ff4c5150]">
                                                <MaskImage url="/icons/delete.svg" w="1.2em" h="1.2em" bg="currentColor" />
                                                Delete Forever
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
