import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MaskImage from "../components/MaskImage";
import { contactCardAPI, capitalizeWords, getImageUrl } from "../utils/api";
import { showToast } from "../utils/toast";

export default function DeletedCards() {
    const [deletedCards, setDeletedCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchDeletedCards();
    }, []);

    const fetchDeletedCards = async () => {
        try {
            setLoading(true);

            const response = await contactCardAPI.getAll();

            console.log("API response:", response);

            if (response.success) {
                console.log((response.data).filter(f => f.inTrash == "yes"))
                setDeletedCards(
                    (response.data || []).filter(f => f.inTrash == "yes")
                );
            } else {
                showToast(response.message || "Failed to fetch deleted Cards", "error");
            }
        } catch (err) {
            console.error("Error fetching deleted Cards:", err);
            showToast("An error occurred while fetching deleted Cards", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (cardId) => {
        try {
            const response = await contactCardAPI.update(cardId, { inTrash: "no" });
            if (response.success) {
                setDeletedCards(deletedCards.filter(card => card._id !== cardId));
                showToast("Form restored successfully! It will now appear in Manage Forms.", "success");
            } else {
                showToast(response.message || "Failed to restore Form", "error");
            }
        } catch (err) {
            console.error("Error restoring Form:", err);
            showToast("An error occurred while restoring the Form", "error");
        }
    };

    const handlePermanentDelete = async (cardId) => {
        if (!window.confirm("Are you sure you want to permanently delete this card? This action cannot be undone.")) {
            return;
        }

        try {
            const response = await contactCardAPI.permanentDelete(cardId);
            if (response.success) {
                setDeletedCards(deletedCards.filter(card => card._id !== cardId));
                showToast("Card permanently deleted!", "success");
            } else {
                showToast(response.message || "Failed to delete Card", "error");
            }
        } catch (err) {
            console.error("Error deleting Card:", err);
            showToast("An error occurred while deleting the Card", "error");
        }
    };

    const filteredCards = deletedCards.filter(card => {
        const matchesSearch = card.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (card.content && card.content.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSearch;
    });

    if (loading) {
        return (
            <div className="px-4 mt-6">
                <div className="flex-1 w-full max-w-[1400px] mx-auto">
                    <div className="flex items-center justify-center h-[60vh]">
                        <div className="text-center">
                            <div className="text-[var(--text-dark)] text-[1.2em] mb-4">Loading deleted cards...</div>
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
                        <h1 className="text-[var(--text-dark)] text-[1.5em] font-semibold mb-1">Deleted Cards</h1>
                        <p className="text-[var(--text-dark)] text-[.85em] opacity-75">View and restore deleted Cards</p>
                    </div>
                    <Link
                        to="/manage-cards"
                        className="flex gap-2 w-max text-[.8em] cursor-pointer text-[var(--text-light)] font-semibold items-center justify-center bg-[var(--primary-color)] p-3 rounded-[5px] shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_50%,rgba(255,255,255,0))] hover:shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_70%,rgba(255,255,255,0))] translate-y-[-2px] hover:translate-y-[-4px] duration-300"
                    >
                        Back to Manage cards
                    </Link>
                </div>

                {/* Search */}
                <div className="bg-[var(--bg-w)] rounded-[8px] shadow-[0px_0px_10px_rgba(0,0,0,0.1)] p-4 mb-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[.7em] text-[var(--text-dark)] font-semibold">Search Deleted Cards</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name or description..."
                                className="w-full bg-[var(--bg-w)] text-[.85em] text-[var(--text-dark-1)] create-input rounded-[8px] p-[9px] px-3 pl-10"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2">
                                <MaskImage
                                    url="/icons/search.svg"
                                    w="1.2em"
                                    h="1.2em"
                                    bg="var(--text-dark-1)"
                                />
                            </span>
                        </div>
                    </div>
                </div>

                {/* Deleted cards List */}
                <div className="bg-[var(--bg-w)] rounded-[8px] shadow-[0px_0px_10px_rgba(0,0,0,0.1)] lg:p-6 p-3">
                    {filteredCards.length === 0 ? (
                        <div className="text-center py-12 flex flex-col items-center">
                            <p className="text-[var(--text-dark)] text-[1em] mb-4">No deleted Cards found</p>
                            <Link
                                to="/manage-cards"
                                className="flex gap-2 w-max text-[.8em]  cursor-pointer text-[var(--text-light)] font-semibold items-center justify-center bg-[var(--primary-color)] p-3 rounded-[5px] shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_50%,rgba(255,255,255,0))] hover:shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_70%,rgba(255,255,255,0))] translate-y-[-2px] hover:translate-y-[-4px] duration-300"
                            >
                                Go to Manage Cards
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                            {filteredCards.map((card) => (
                                <div key={card._id} className={`group bg-[var(--bg-w)] border border-[var(--border)] rounded-[16px] overflow-hidden hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300`}>
                                    {/* Card Header Background & Avatar */}
                                    <div className="h-[80px] bg-gradient-to-r from-[var(--primary-color)] to-[#00bad1] opacity-20 relative"></div>

                                    <div className="px-6 pb-6 relative flex flex-col h-[calc(100%-80px)]">
                                        <div className="flex justify-between items-start -mt-10 mb-4">
                                            <div
                                                className="w-[84px] h-[84px] rounded-full border-4 border-[var(--bg-w)] bg-[var(--bg-light)] overflow-hidden shadow-md z-10"
                                            >
                                                <img
                                                    src={getImageUrl(card.image)}
                                                    className="w-full h-full object-cover"
                                                    alt={card.fullName}
                                                />
                                            </div>

                                            {/* Status Badge */}
                                            <div className="mt-12 flex items-center gap-2">
                                                <span className="text-[0.75em] px-3 py-1 rounded-full font-medium bg-[#e8122415] text-[#e81224]">
                                                    Deleted
                                                </span>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div>
                                            <h3 className="text-[1.25em] font-bold text-[var(--text-dark)] leading-tight">{capitalizeWords(card.fullName)}</h3>
                                            <p className="text-[0.9em] text-[var(--text-2)] mt-1 font-medium">{capitalizeWords(card.role)}</p>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex items-center gap-6 mt-6 pt-5 border-t border-[var(--border)] mb-6">
                                            <div className="flex flex-col">
                                                <span className="text-[1.1em] font-bold text-[var(--text-dark)]">{card.pageViews}</span>
                                                <span className="text-[0.75em] text-[var(--text-2)] uppercase font-semibold">Views</span>
                                            </div>
                                            <div className="w-px h-8 bg-[var(--border)]"></div>
                                            <div className="flex flex-col">
                                                <span className="text-[1.1em] font-bold text-[var(--text-dark)]">{card.platforms.length}</span>
                                                <span className="text-[0.75em] text-[var(--text-2)] uppercase font-semibold">Platforms</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-3 mt-auto">
                                            <button onClick={() => handleRestore(card._id)} className="flex-1 bg-[var(--primary-color)] text-[var(--text-light)] py-2.5 rounded-[10px] flex justify-center items-center gap-2 text-[0.85em] font-semibold hover:-translate-y-0.5 shadow-md shadow-[color-mix(in_srgb,var(--primary-color)_30%,rgba(0,0,0,0))] transition-all duration-300">
                                                <MaskImage url="/icons/restore.svg" w="1.2em" h="1.2em" bg="currentColor" />
                                                Restore
                                            </button>
                                            <button onClick={() => handlePermanentDelete(card._id)} className="flex-1 bg-[var(--hover)] text-[#ff4c51] py-2.5 rounded-[10px] flex justify-center items-center gap-2 text-[0.85em] font-semibold hover:-translate-y-0.5 hover:bg-[var(--border)] transition-all duration-300 border border-[#ff4c5130] bg-[#ff4c510e]">
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
