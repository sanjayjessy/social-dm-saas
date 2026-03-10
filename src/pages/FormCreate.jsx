import {
    DndContext,
    closestCenter
} from "@dnd-kit/core";

import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    arrayMove
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import { useState, useEffect } from "react";
import MaskImage from "../components/MaskImage";
import { formAPI, capitalizeWords } from "../utils/api";
import { useNavigate, useSearchParams } from "react-router-dom";
import { showToast } from "../utils/toast";
import "../assets/css/custom-form.css";


export default function FormCreate() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit');

    const [tab, setTab] = useState("form-field");


    const [formName, setFormName] = useState("");
    const [formDescription, setFormDescription] = useState("Leave your details and unlock your premium benefits");
    const [formTitle, setFormTitle] = useState("Special Offer Just For You");
    const [offersHeading, setOffersHeading] = useState("What You'll Get");
    const [formButtonContent, setFormButtonContent] = useState("Unlock My Offer");
    const [formParagraph, setFormParagraph] = useState("");
    const [buttonColor, setButtonColor] = useState("#3b82f6");
    const [fields, setFields] = useState([
        { label: "Field Label", type: "text", required: false, placeholder: "", columnSpan: 12, options: [] }
    ]);
    const [loading, setLoading] = useState(false);
    const [savedFormId, setSavedFormId] = useState(editId || null);
    const [loadingForm, setLoadingForm] = useState(!!editId);

    const fieldTypes = [
        // { value: "title", label: "Title" },
        // { value: "paragraph", label: "Paragraph" },
        { value: "text", label: "Text" },
        { value: "phone", label: "Phone" },
        { value: "email", label: "Email" },
        // { value: "textarea", label: "Textarea" },
        // { value: "select", label: "Select" },
        // { value: "checkbox", label: "Checkbox" },
        // { value: "radio", label: "Radio" }
    ];


    const updateOffer = (index, key, value) => {
        const updated = [...offers];
        updated[index][key] = value;
        setOffers(updated);
    };

    const addField = () => {
        if (fields.length >= 3) {
            showToast("Only 3 fields allowed", "error");
            return;
        }

        const usedTypes = fields.map(f => f.type);
        const nextType = fieldTypes.find(t => !usedTypes.includes(t.value));

        setFields([
            ...fields,
            {
                label: "Field Label",
                type: nextType ? nextType.value : "text",
                required: false,
                placeholder: "",
                columnSpan: 12,
                options: []
            }
        ]);
    };

    const getAvailableFieldTypes = (index) => {
        // first field → show everything
        if (fields.length === 1) {
            return fieldTypes;
        }

        const usedTypes = fields
            .filter((_, i) => i !== index)
            .map(f => f.type);

        return fieldTypes.filter(type => {
            if (fields[index].type === type.value) return true;
            return !usedTypes.includes(type.value);
        });
    };

    const removeField = (index) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const updateField = (index, fieldData) => {
        const updatedFields = [...fields];
        updatedFields[index] = { ...updatedFields[index], ...fieldData };
        setFields(updatedFields);
    };

    // top heading
    const [topHeading, setTopHeading] = useState({
        icon: "gift",
        content: "Exclusive Deal"
    });
    const updateTopHeading = (key, value) => {
        setTopHeading(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // offers
    const [offers, setOffers] = useState([]);
    const addOffer = () => {
        setOffers([
            ...offers,
            { icon: "dis", title: "Plan", highlight: "30% OFF" }
        ]);
    };
    const removeOffer = (index) => {
        setOffers(offers.filter((_, i) => i !== index));
    };


    useEffect(() => {
        const loadFormForEdit = async () => {
            if (!editId) return;

            try {
                setLoadingForm(true);
                const response = await formAPI.getById(editId);
                if (response.success && response.data) {
                    const form = response.data;
                    setFormName(form.name || "");
                    setFormDescription(form.description || "");
                    setFormTitle(form.title || "");
                    setFormParagraph(form.paragraph || "");
                    setButtonColor(form.buttonColor || "#3b82f6");
                    setFormButtonContent(form.buttonContent || "Unlock My Offer");
                    setFields(form.fields && form.fields.length > 0 ? form.fields.map(f => ({
                        label: f.label || "",
                        type: f.type || "text",
                        required: f.required || false,
                        placeholder: f.placeholder || "",
                        columnSpan: f.columnSpan || 12,
                        options: f.options || []
                    })) : [{ label: "", type: "text", required: false, placeholder: "", columnSpan: 12, options: [] }]);
                    setOffers(form.offers || []);

                    const content = form.topHeading?.content;
                    setTopHeading({
                        icon: form.topHeading?.icon || "gift",
                        content: content === "" ? "" : content || "Exclusive Deal"
                    });
                    setSavedFormId(form._id);
                    setOffersHeading(form.offersHeading)
                } else {
                    showToast("Failed to load form for editing", "error");
                }
            } catch (err) {
                console.error("Error loading form:", err);
                showToast("An error occurred while loading the form", "error");
            } finally {
                setLoadingForm(false);
            }
        };

        loadFormForEdit();
    }, [editId]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Validation
        if (!formName.trim()) {
            showToast("Form name is required", "error");
            setLoading(false);
            return;
        }

        // Filter out title and paragraph from validation (they don't need labels)
        const formFields = fields.filter(f => {
            if (f.type === "title" || f.type === "paragraph") {
                return f.label.trim() || f.placeholder.trim(); // Title/paragraph can use label or placeholder
            }
            return f.label.trim();
        });

        if (formFields.length === 0) {
            showToast("At least one field is required", "error");
            setLoading(false);
            return;
        }

        try {
            const payload = {
                name: formName,
                description: formDescription,
                title: formTitle,
                paragraph: formParagraph,
                buttonColor: buttonColor,
                buttonContent: formButtonContent,
                fields: formFields.map(f => ({
                    label: f.label,
                    type: f.type,
                    required: f.required,
                    placeholder: f.placeholder,
                    columnSpan: f.columnSpan || 12,
                    options: f.options || []
                })),
                offers: offers,
                offersHeading: offersHeading,
                topHeading: topHeading
            };


            let response;
            if (savedFormId) {
                // Update existing form
                response = await formAPI.update(savedFormId, payload);
            } else {
                // Create new form
                response = await formAPI.create(payload);
            }

            if (response.success) {
                showToast(savedFormId ? "Form updated successfully!" : "Form created successfully!", "success");
                if (response.data && response.data._id) {
                    setSavedFormId(response.data._id);
                }
                // Navigate to Manage Forms after successful creation/update
                setTimeout(() => {
                    navigate("/manage-forms");
                }, 1500);
            } else {
                showToast(response.message || (savedFormId ? "Failed to update form" : "Failed to create form"), "error");
            }
        } catch (err) {
            showToast("An error occurred. Please try again.", "error");
            console.error("Form creation error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Preview component
    const [previewFormData, setPreviewFormData] = useState({});
    const [previewErrors, setPreviewErrors] = useState({});
    const [previewSubmitted, setPreviewSubmitted] = useState(false);

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const validatePhone = (phone) => {
        const re = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
        return re.test(phone.replace(/\s/g, ''));
    };

    const handlePreviewInputChange = (fieldIndex, value) => {
        setPreviewFormData(prev => ({
            ...prev,
            [fieldIndex]: value
        }));
        // Clear error when user starts typing
        if (previewErrors[fieldIndex]) {
            setPreviewErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldIndex];
                return newErrors;
            });
        }
    };

    const handlePreviewSubmit = (e) => {
        e.preventDefault();
        const errors = {};

        fields.forEach((field, index) => {
            if (field.type === "title" || field.type === "paragraph") return;

            const value = previewFormData[index] || "";

            if (field.required && !value.trim()) {
                errors[index] = `${field.label || "This field"} is required`;
            } else if (value.trim()) {
                if (field.type === "email" && !validateEmail(value)) {
                    errors[index] = "Please enter a valid email address";
                } else if (field.type === "phone" && !validatePhone(value)) {
                    errors[index] = "Please enter a valid phone number";
                }
            }
        });

        setPreviewErrors(errors);

        if (Object.keys(errors).length === 0) {
            setPreviewSubmitted(true);
            console.log("Form submitted:", previewFormData);
            // Reset form after 2 seconds
            setTimeout(() => {
                setPreviewFormData({});
                setPreviewSubmitted(false);
            }, 2000);
        }
    };

    const FormPreview = () => {
        let currentRow = [];
        const rows = [];

        fields.forEach((field, index) => {
            if (field.type === "title") {
                if (currentRow.length > 0) {
                    rows.push([...currentRow]);
                    currentRow = [];
                }
                rows.push([{ ...field, index, isTitle: true }]);
            } else if (field.type === "paragraph") {
                if (currentRow.length > 0) {
                    rows.push([...currentRow]);
                    currentRow = [];
                }
                rows.push([{ ...field, index, isParagraph: true }]);
            } else {
                const span = field.columnSpan || 12;
                currentRow.push({ ...field, index, span });

                const rowSpan = currentRow.reduce((sum, f) => sum + (f.span || 12), 0);
                if (rowSpan >= 12) {
                    rows.push([...currentRow]);
                    currentRow = [];
                }
            }
        });

        if (currentRow.length > 0) {
            rows.push(currentRow);
        }

        const getColSpanClass = (span) => {
            const map = { 12: "col-span-12", 6: "col-span-6", 4: "col-span-4", 3: "col-span-3" };
            return map[span] || "col-span-12";
        };

        return (
            <div className="space-y-4">
                {/* Form Preview Card */}
                <div className="bg-[var(--bg-w)] rounded-[12px] overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0px_4px_20px_rgba(0,0,0,0.3)] border border-[var(--border)] text-[16px] relative">
                    <div className="relative z-10">
                        <div className="custom-from-wrapper p-2 sm:p-8 py-10 w-full flex flex-col justify-center items-center">
                            <div className="glass-card p-3 sm:p-8 py-8">
                                <div className="header">
                                    {topHeading.content &&
                                        <div className="badge text-[var(--text-light)] text-start">
                                            <span className="icon">
                                                <MaskImage url={`/icons/${topHeading.icon}.svg`} w="1em" h="1em" bg="var(--text-light)" />
                                            </span>
                                            {topHeading.content}
                                        </div>
                                    }

                                    <h2 className="text-[var(--text-light)] font-bold">{formTitle}</h2>
                                    <p className="text-[var(--text-light)]">{formDescription}</p>

                                    {/* <div className="timer">
                                        <span className="icon">
                                            <MaskImage url="/icons/time.svg" w="1em" h="1em" bg="#fff7cc" />
                                        </span>
                                        Offer ends in 14:19
                                    </div> */}
                                </div>

                                <form onSubmit={handlePreviewSubmit}>
                                    {previewSubmitted && (
                                        <div className="offer-item text-[.85em] mb-2">
                                            Form submitted successfully!
                                        </div>
                                    )}
                                    {rows.map((row, rowIndex) => (
                                        <div key={rowIndex} className="grid grid-cols-12 gap-4">
                                            {row.map((field) => {
                                                if (field.isTitle) {
                                                    return (
                                                        <div key={field.index} className="col-span-12">
                                                            <h3 className="text-[var(--text-dark)] text-[1.3em] font-semibold mb-2">
                                                                {field.label || field.placeholder || "Title"}
                                                            </h3>
                                                        </div>
                                                    );
                                                }
                                                if (field.isParagraph) {
                                                    return (
                                                        <div key={field.index} className="col-span-12">
                                                            <p className="text-[var(--text-dark)] text-[.95em] opacity-75 leading-relaxed">
                                                                {field.label || field.placeholder || "Paragraph text"}
                                                            </p>
                                                        </div>
                                                    );
                                                }

                                                const colSpan = field.span || 12;
                                                const fieldValue = previewFormData[field.index] || "";
                                                const fieldError = previewErrors[field.index];

                                                return (
                                                    <div key={field.index} className={getColSpanClass(colSpan)}>

                                                        {field.type === "textarea" ? (
                                                            <textarea
                                                                value={fieldValue}
                                                                onChange={(e) => handlePreviewInputChange(field.index, e.target.value)}
                                                                className={`w-full bg-[var(--bg-w)] text-[.9em] text-[var(--text-dark-1)] border ${fieldError ? 'border-red-500' : 'border-[var(--border)]'} rounded-[8px] p-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent placeholder:italic placeholder:opacity-60 resize-y`}
                                                                placeholder={field.placeholder || "Type something..."}
                                                                rows="4"
                                                                required={field.required}
                                                            />
                                                        ) : field.type === "select" ? (
                                                            <select
                                                                value={fieldValue}
                                                                onChange={(e) => handlePreviewInputChange(field.index, e.target.value)}
                                                                className={`w-full bg-[var(--bg-w)] text-[.9em] text-[var(--text-dark-1)] border ${fieldError ? 'border-red-500' : 'border-[var(--border)]'} rounded-[8px] p-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent`}
                                                                required={field.required}
                                                            >
                                                                <option value="">{field.placeholder || "Select an option"}</option>
                                                            </select>
                                                        ) : field.type === "checkbox" ? (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={fieldValue === "true" || fieldValue === true}
                                                                    onChange={(e) => handlePreviewInputChange(field.index, e.target.checked)}
                                                                    className="w-4 h-4 accent-[var(--primary-color)]"
                                                                />
                                                                <span className="text-[.9em] text-[var(--text-dark)]">{field.label}</span>
                                                            </div>
                                                        ) : field.type === "radio" ? (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="radio"
                                                                    checked={fieldValue === "true" || fieldValue === true}
                                                                    onChange={(e) => handlePreviewInputChange(field.index, e.target.checked)}
                                                                    className="w-4 h-4 accent-[var(--primary-color)]"
                                                                />
                                                                <span className="text-[.9em] text-[var(--text-dark)]">{field.label}</span>
                                                            </div>
                                                        ) : (
                                                            <>

                                                                <div className="form-group">
                                                                    <span className="icon">
                                                                        <MaskImage url={`/icons/${field.type === "email" ? "mail" : field.type === "phone" ? "call" : "user-1"}.svg`} w="1em" h="1em" bg="var(--text-light)" />
                                                                    </span>
                                                                    <input type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                                                                        value={fieldValue}
                                                                        onChange={(e) => handlePreviewInputChange(field.index, e.target.value)}
                                                                        placeholder=""
                                                                        required={field.required}
                                                                    />
                                                                    <label htmlFor="name">
                                                                        {field.label || "Your Content"}
                                                                        {field.required && <span className="text-[#fef3c7]"> *</span>}
                                                                    </label>

                                                                </div>
                                                            </>


                                                        )}
                                                        {fieldError && (
                                                            <p className="text-red-500 text-[.75em] mt-1">{fieldError}</p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}


                                    <button className="cta-btn text-[var(--text-light)]" type="submit"
                                        style={{ "--btn-cus-color": buttonColor || "#3b82f6" }}>
                                        <span className="icon">
                                            <MaskImage url="/icons/rocket.svg" w="1.3em" h="1.3em" bg="var(--text-light)" />
                                        </span>
                                        {previewSubmitted ? "Submitted" : formButtonContent}
                                    </button>

                                </form>
                                {offers.length > 0 &&
                                    <div className="benefits">
                                        <h4 className="text-[var(--text-light)]">
                                            <span className="icon">
                                                <MaskImage url="/icons/star.svg" w="1.3em" h="1.3em" bg="var(--text-light)" />
                                            </span>
                                            {offersHeading || "What You'll Get"}
                                        </h4>

                                        {/* Compact horizontal offers */}
                                        <div className="offer-grid grid grid-cols-2 gap-4">
                                            {offers.map((offer, i) => (
                                                <div key={i} className="offer-item col-span-1 text-[var(--text-light)] h-max">
                                                    <span className="icon">
                                                        <MaskImage
                                                            url={`/icons/${offer.icon}.svg`}
                                                            w="1.3em"
                                                            h="1.3em"
                                                            bg="var(--text-light)"
                                                        />
                                                    </span>
                                                    <div>
                                                        <span>{offer.highlight}</span> {offer.title}
                                                    </div>


                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                }
                                {/* Styled footer offer */}


                                <div className="privacy text-[var(--text-light)] pt-3">
                                    We respect your privacy. No spam. No nonsense.
                                </div>
                            </div>
                            <div className="mt-6 text-center text-[var(--text-light)]">
                                <p className="text-[var(--text-light)] text-[.75em] flex items-center justify-center gap-1">
                                    <span className="text-[var(--text-light)]>">POWERED BY</span>
                                    <span className="flex items-center gap-1">
                                        <MaskImage url="/icons/link.svg" w="1em" h="1em" bg="var(--text-light)" />
                                        <span className="font-semibold text-[var(--text-light)]">ClickMyChat</span>
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Actions */}
                {formName && (
                    <div className="flex flex-col gap-3">
                        {savedFormId ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => window.open(`/form/${savedFormId}`, '_blank')}
                                    className="w-full hover:opacity-90 text-[var(--text-light)] font-semibold py-2 px-4 rounded-[8px] transition-all duration-300 text-[.85em] uppercase tracking-wide"
                                    style={{
                                        background: `var(--primary-color)`
                                    }}
                                >
                                    Open Form Page (ID: {savedFormId.slice(-6)})
                                </button>
                                <p className="text-[var(--text-2)] text-[.7em] text-center">
                                    Form URL: <code className="bg-[var(--hover)] px-2 py-1 rounded">{window.location.origin}/form/{savedFormId}</code>
                                </p>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    const formData = {
                                        name: formName,
                                        title: formTitle,
                                        paragraph: formParagraph,
                                        description: formDescription,
                                        buttonColor: buttonColor,
                                        fields: fields
                                    };
                                    const encoded = encodeURIComponent(JSON.stringify(formData));
                                    window.open(`/form-preview?data=${encoded}`, '_blank');
                                }}
                                className="w-full hover:opacity-90 text-[var(--text-light)] font-semibold py-2 px-4 rounded-[8px] transition-all duration-300 text-[.85em] uppercase tracking-wide"
                                style={{
                                    background: `var(--primary-color)`
                                }}
                            >
                                Preview in New Page
                            </button>
                        )}
                    </div>
                )}

                {/* Responsive Info Box */}
                <div className="rounded-[8px] p-4 flex items-start gap-3 border" style={{
                    backgroundColor: `color-mix(in srgb, var(--primary-color) 10%, var(--bg-w))`,
                    borderColor: `color-mix(in srgb, var(--primary-color) 30%, transparent)`
                }}>
                    <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{
                        backgroundColor: `var(--primary-color)`
                    }}>
                        <span className="text-[var(--text-light)] text-[.85em] font-bold">i</span>
                    </div>
                    <p className="text-[.85em] leading-relaxed" style={{
                        color: `var(--primary-color)`
                    }}>
                        This form is fully responsive and will adapt to mobile screens automatically.
                    </p>
                </div>
            </div>
        );
    };
    function SortableItem({ id, children }) {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition
        } = useSortable({ id });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition
        };

        return (
            <div ref={setNodeRef} style={style} {...attributes}>
                <div className="drag-handle flex gap-1 text-[16px] cursor-pointer items-center mb-2" {...listeners}>
                    <MaskImage url="/icons/drag.svg" w="1em" h="1em" bg="var(--text-dark)" />
                    <span className="text-[var(--text-dark)] text-[.7em] font-semibold">Drag to Reorder</span>
                </div>
                {children}
            </div>
        );
    }
    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const oldIndex = fields.findIndex((_, i) => i === active.id);
        const newIndex = fields.findIndex((_, i) => i === over.id);

        setFields(arrayMove(fields, oldIndex, newIndex));
    };
    const handleOfferDragEnd = (event) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const oldIndex = offers.findIndex((_, i) => i === active.id);
        const newIndex = offers.findIndex((_, i) => i === over.id);

        setOffers(arrayMove(offers, oldIndex, newIndex));
    };
    return (

        <div className="px-4 mt-6">
            <div id="create-form" className="flex-1  w-full max-w-[1400px] mx-auto">
                <div className="grid grid-cols-12 gap-6">
                    {/* Left Side - Form Builder */}
                    <div className="create-form-wrapper col-span-12 xl:col-span-6  bg-[var(--bg-w)] w-full rounded-[8px] shadow-[0px_0px_10px_rgba(0,0,0,0.1)] md:p-6 p-3 text-[20px]">
                        <h2 className="text-[var(--text-dark)] text-[1.2em] font-semibold mb-2">{savedFormId ? "Edit Form" : "Create Form"}</h2>
                        <p className="text-[var(--text-dark)] text-[.65em] opacity-75 mb-6">{savedFormId ? "Edit your form configuration" : "Create custom forms to collect lead information"}</p>

                        {loadingForm && (
                            <>
                                <div className="flex flex-col items-center">
                                    <div className="text-[var(--text-dark)] text-center text-[.8em] mb-4 w-full">Loading links...</div>
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)] mx-auto"></div>
                                </div>

                            </>

                        )}

                        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
                            {/* Form Name */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[var(--text-light)] bg-white-color-mix p-[5px] rounded-[7px] bg-[var(--primary-color)]30 text-[.85em]">
                                        <MaskImage url="/icons/f-name.svg" w="1em" h="1em" bg="var(--primary-color)" />
                                    </span>
                                    <label htmlFor="form-name" className="text-[.63em] text-[var(--text-dark)] font-semibold">Form Name *</label>
                                </div>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    id="form-name"
                                    className="bg-[var(--bg-w)] text-[.7em] text-[var(--text-dark-1)] placeholder:text-[1em] create-input placeholder:text-[color-mix(in_srgb,var(--text-dark-1)_50%,rgba(255,255,255,0))] rounded-[8px] p-[9px] px-3"
                                    placeholder="Ex: Contact Form"
                                    required
                                />
                            </div>

                            {/* Form Top Heading (for preview) */}
                            <div className="flex flex-col gap-1">
                                <p className="text-[.63em] text-[var(--text-dark)] font-semibold">Top Heading</p>

                                <div className="flex gap-3 flex-col sm:flex-row  w-full">

                                    {/* Icon */}
                                    <div className="flex flex-col gap-1 text-[var(--text-dark)] w-full">

                                        <div className="flex items-center gap-2">
                                            <span className="text-[var(--text-light)] bg-white-color-mix p-[5px] rounded-[7px] bg-[var(--primary-color)]30 text-[.85em]">
                                                <MaskImage url="/icons/icon.svg" w="1em" h="1em" bg="var(--primary-color)" />
                                            </span>
                                            <label htmlFor="form-title" className="text-[.63em] text-[var(--text-dark)] font-semibold">Icon *</label>
                                        </div>
                                        <div className={`relative flex-1 w-full ${topHeading.content.length == 0 ? "opacity-50" : ""}`}>
                                            <select
                                                value={topHeading.icon}
                                                onChange={(e) => updateTopHeading("icon", e.target.value)}
                                                disabled={topHeading.content.length == 0}
                                                className="create-input text-[.7em] appearance-none w-full p-[8px] rounded-[6px]"
                                            >
                                                <option value="dis">Discount</option>
                                                <option value="gift">Gift</option>
                                                <option value="d-t">Trial</option>
                                                <option value="support">Support</option>
                                                <option value="common">Common</option>
                                            </select>
                                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                                <MaskImage
                                                    url="/icons/arrow-down.svg"
                                                    w="1.2em"
                                                    h="1.2em"
                                                    bg="var(--text-dark-1)"
                                                />
                                            </span>
                                        </div>
                                    </div>

                                    {/* Top heading */}
                                    <div className="flex flex-col gap-1 text-[var(--text-dark)] w-full">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[var(--text-light)] bg-white-color-mix p-[5px] rounded-[7px] bg-[var(--primary-color)]30 text-[.85em]">
                                                <MaskImage url="/icons/type.svg" w="1em" h="1em" bg="var(--primary-color)" />
                                            </span>
                                            <label htmlFor="form-top-heading" className="text-[.63em] text-[var(--text-dark)] font-semibold">Content</label>
                                        </div>
                                        <input
                                            type="text"
                                            value={topHeading.content}
                                            onChange={(e) => updateTopHeading("content", e.target.value)}
                                            className="create-input text-[.7em] p-[8px] rounded-[6px]"
                                            placeholder="Exclusive Deal"
                                            id="form-top-heading"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Form Title (for preview) */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[var(--text-light)] bg-white-color-mix p-[5px] rounded-[7px] bg-[var(--primary-color)]30 text-[.85em]">
                                        <MaskImage url="/icons/f-title.svg" w="1em" h="1em" bg="var(--primary-color)" />
                                    </span>
                                    <label htmlFor="form-title" className="text-[.63em] text-[var(--text-dark)] font-semibold">Form Title</label>
                                </div>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    id="form-title"
                                    className="bg-[var(--bg-w)] text-[.7em] text-[var(--text-dark-1)] placeholder:text-[1em] create-input placeholder:text-[color-mix(in_srgb,var(--text-dark-1)_50%,rgba(255,255,255,0))] rounded-[8px] p-[9px] px-3"
                                    placeholder="Form title (shown at top of form)"
                                />
                            </div>

                            {/* Description */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[var(--text-light)] bg-white-color-mix p-[5px] rounded-[7px] bg-[var(--primary-color)]30 text-[.85em]">
                                        <MaskImage url="/icons/f-des.svg" w="1em" h="1em" bg="var(--primary-color)" />
                                    </span>
                                    <label htmlFor="form-description" className="text-[.63em] text-[var(--text-dark)] font-semibold">Description</label>
                                </div>
                                <textarea
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    id="form-description"
                                    rows="3"
                                    className="bg-[var(--bg-w)] text-[.7em] text-[var(--text-dark-1)] placeholder:text-[1em] create-input placeholder:text-[color-mix(in_srgb,var(--text-dark-1)_50%,rgba(255,255,255,0))] rounded-[8px] p-[9px] px-3"
                                    placeholder="Form description (optional)"
                                />
                            </div>

                            {/* Button Color */}
                            <div className="flex gap-3 flex-col sm:flex-row  w-full">
                                <div className="flex flex-col gap-2 w-full">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[var(--text-light)] bg-white-color-mix p-[5px] rounded-[7px] bg-[var(--primary-color)]30 text-[.85em]">
                                            <MaskImage url="/icons/f-name.svg" w="1em" h="1em" bg="var(--primary-color)" />
                                        </span>
                                        <label htmlFor="form-description" className="text-[.63em] text-[var(--text-dark)] font-semibold">Button Content</label>
                                    </div>

                                    <input
                                        type="text"
                                        value={formButtonContent}
                                        onChange={(e) => setFormButtonContent(e.target.value)}
                                        id="form-button-content"
                                        className="bg-[var(--bg-w)] text-[.7em] text-[var(--text-dark-1)] placeholder:text-[1em] create-input placeholder:text-[color-mix(in_srgb,var(--text-dark-1)_50%,rgba(255,255,255,0))] rounded-[8px] p-[9px] px-3"
                                        placeholder="Form Button Content"
                                    />
                                </div>
                                <div className="flex flex-col gap-2 w-full">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[var(--text-light)] bg-white-color-mix p-[5px] rounded-[7px] bg-[var(--primary-color)]30 text-[.85em]">
                                            <MaskImage url="/icons/color.svg" w="1em" h="1em" bg="var(--primary-color)" />
                                        </span>
                                        <label htmlFor="button-color" className="text-[.63em] text-[var(--text-dark)] font-semibold">Button Color</label>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="w-10 h-10 border rounded-full border-[var(--border)] p-[2px]">
                                            <input
                                                type="color"
                                                value={buttonColor}
                                                onChange={(e) => setButtonColor(e.target.value)}
                                                id="button-color"
                                                className="w-full h-full  cursor-pointer border border-[var(--border)]"
                                            />
                                        </span>

                                        <input
                                            type="text"
                                            value={buttonColor}
                                            onChange={(e) => setButtonColor(e.target.value)}
                                            className="flex-1 bg-[var(--bg-w)] text-[.7em] text-[var(--text-dark-1)] create-input rounded-[8px] p-[9px] px-3"
                                            placeholder="#3b82f6"
                                        />
                                    </div>
                                </div>

                            </div>

                            <div className="flex my-6 mb-2 gap-4 text-[20px]">
                                <button
                                    onClick={() => setTab("form-field")}
                                    type="button"
                                    className={`flex text-[.7em] gap-2 cursor-pointer capitalize w-max ${tab == "form-field" ? "text-[var(--text-light)] bg-[var(--primary-color)] shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_50%,rgba(255,255,255,0))] hover:shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_70%,rgba(255,255,255,0))]" : "text-[var(--text-dark)] opacity-80 hover:shadow-[0px_0px_10px_color-mix(in_srgb,var(--text-dark)_10%,rgba(255,255,255,0))]"}  font-semibold  items-center justify-center ] py-2 px-5 rounded-[5px]  hover:translate-y-[-2px] duration-300`}>
                                    <span className="">
                                        <MaskImage url="/icons/column.svg" w="1.45em" h="1.45em" bg={tab == "form-field" ? "var(--text-light)" : "var(--text-dark)"} />
                                    </span>
                                    <span className="text-[1.1em]">Form Field</span>
                                </button>
                                <button
                                    onClick={() => setTab("offer-field")}
                                    type="button"
                                    className={`flex text-[.7em] gap-2 cursor-pointer capitalize w-max ${tab == "offer-field" ? "text-[var(--text-light)] bg-[var(--primary-color)] shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_50%,rgba(255,255,255,0))] hover:shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_70%,rgba(255,255,255,0))]" : "text-[var(--text-dark)] opacity-80 hover:shadow-[0px_0px_10px_color-mix(in_srgb,var(--text-dark)_10%,rgba(255,255,255,0))]"}  font-semibold  items-center justify-center ] py-2 px-5 rounded-[5px]  hover:translate-y-[-2px] duration-300`}>
                                    <span className="">
                                        <MaskImage url="/icons/gift.svg" w="1.45em" h="1.45em" bg={tab == "offer-field" ? "var(--text-light)" : "var(--text-dark)"} />
                                    </span>
                                    <span className="text-[1.1em]">Offer Field</span>
                                </button>

                            </div>


                            {/* Form Fields */}
                            <div className={`flex flex-col gap-4 ${tab == "form-field" ? "" : "hidden"}`}>
                                <div className="flex items-center justify-between">
                                    <label className="text-[.7em] text-[var(--primary-color)] font-semibold">Form Fields *</label>
                                    <button
                                        type="button"
                                        onClick={addField}
                                        className="text-[.65em] text-[var(--primary-color)] font-semibold hover:underline cursor-pointer"
                                    >
                                        + Add Field
                                    </button>
                                </div>
                                <DndContext
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >

                                    <SortableContext
                                        items={fields.map((_, i) => i)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-5">
                                            {fields.map((field, index) => (
                                                <SortableItem key={index} id={index}>
                                                    <div className="border border-[var(--hover)] bg-[var(--bg-w)] rounded-[8px] shadow-[0px_0px_10px_rgba(0,0,0,0.06)] p-4 space-y-3  transition-colors duration-200 hover:border-[var(--primary-color)] focus-within:border-[var(--primary-color)] focus-within:shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_20%,transparent)] hover:shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_20%,transparent)]">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="text-[.7em] text-[var(--text-dark)] font-semibold">Field {index + 1}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeField(index)}
                                                                className="text-[.65em] text-red-500 hover:underline cursor-pointer"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3 mb-5">
                                                            <div className="flex flex-col col-span-2 sm:col-span-1 gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[var(--text-light)] bg-white-color-mix  rounded-[7px] bg-[var(--primary-color)]30 text-[.9em]">
                                                                        <MaskImage url="/icons/label.svg" w="1em" h="1em" bg="var(--primary-color)" />
                                                                    </span>
                                                                    <label className="text-[.55em] text-[var(--text-dark)] font-semibold">
                                                                        {field.type === "title" || field.type === "paragraph" ? "Content" : "Label"} *
                                                                    </label>
                                                                </div>

                                                                <input
                                                                    type="text"
                                                                    value={field.label}
                                                                    onChange={(e) => updateField(index, { label: e.target.value })}
                                                                    className="bg-[var(--bg-w)] text-[.7em] text-[var(--text-dark-1)] create-input rounded-[8px] p-[9px] px-3"
                                                                    placeholder={field.type === "title" ? "Title text" : field.type === "paragraph" ? "Paragraph text" : "Field label"}
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="flex flex-col col-span-2 sm:col-span-1 gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[var(--text-light)] bg-white-color-mix  rounded-[7px] bg-[var(--primary-color)]30 text-[.8em]">
                                                                        <MaskImage url="/icons/type.svg" w="1em" h="1em" bg="var(--primary-color)" />
                                                                    </span>
                                                                    <label className="text-[.55em] text-[var(--text-dark)] font-semibold">Type *</label>
                                                                </div>

                                                                <div className="relative flex-1 w-full">
                                                                    <select
                                                                        value={field.type}
                                                                        onChange={(e) => updateField(index, { type: e.target.value })}
                                                                        className="bg-[var(--bg-w)] text-[.7em] appearance-none w-full text-[var(--text-dark-1)] create-input rounded-[8px] p-[9px] px-3"
                                                                    >
                                                                        {getAvailableFieldTypes(index).map(type => (
                                                                            <option key={type.value} value={type.value}>
                                                                                {type.label}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                                                        <MaskImage
                                                                            url="/icons/arrow-down.svg"
                                                                            w="1.2em"
                                                                            h="1.2em"
                                                                            bg="var(--text-dark-1)"
                                                                        />
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {(field.type !== "title" && field.type !== "paragraph") && (
                                                            <>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[var(--text-light)] bg-white-color-mix  rounded-[7px] bg-[var(--primary-color)]30 text-[.8em]">
                                                                                <MaskImage url="/icons/column.svg" w="1em" h="1em" bg="var(--primary-color)" />
                                                                            </span>
                                                                            <label className="text-[.55em] text-[var(--text-dark)] font-semibold">Column Span</label>
                                                                        </div>
                                                                        <div className="relative flex-1 w-full">
                                                                            <select
                                                                                value={field.columnSpan || 12}
                                                                                onChange={(e) => updateField(index, { columnSpan: parseInt(e.target.value) })}
                                                                                className="bg-[var(--bg-w)] text-[.7em] appearance-none w-full text-[var(--text-dark-1)] create-input rounded-[8px] p-[9px] px-3"
                                                                            >
                                                                                <option value="12">Full Width (12)</option>
                                                                                <option value="6">Half Width (6) - 2 per row</option>
                                                                                {/* <option value="4">One Third (4) - 3 per row</option>
                                                                                <option value="3">One Fourth (3) - 4 per row</option> */}
                                                                            </select>
                                                                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                                                                <MaskImage
                                                                                    url="/icons/arrow-down.svg"
                                                                                    w="1.2em"
                                                                                    h="1.2em"
                                                                                    bg="var(--text-dark-1)"
                                                                                />
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2 pt-6 col-span-2 sm:col-span-1">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`required-${index}`}
                                                                            checked={field.required}
                                                                            onChange={(e) => updateField(index, { required: e.target.checked })}
                                                                            className="w-4 h-4"
                                                                        />
                                                                        <label htmlFor={`required-${index}`} className="text-[.65em] text-[var(--text-dark)]">
                                                                            Required field
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </SortableItem>
                                            ))}
                                        </div>

                                    </SortableContext>
                                </DndContext>

                                {/* Add Field Button at Bottom */}
                                <div className="flex justify-center pt-4">
                                    <button
                                        type="button"
                                        onClick={addField}
                                        className="text-[.7em] cursor-pointer text-[var(--primary-color)] font-semibold hover:underline px-4 py-2 rounded-[6px] hover:bg-[var(--hover)] transition-all duration-200 border border-[var(--primary-color)] border-opacity-30"
                                    >
                                        + Add Field
                                    </button>
                                </div>

                            </div>

                            {/* Offers Section */}
                            <div className={`flex flex-col gap-3 ${tab == "offer-field" ? "" : "hidden"}`}>
                                <div className="flex items-center justify-between">
                                    <label className="text-[.7em] text-[var(--primary-color)] font-semibold">Form Fields *</label>
                                    <button
                                        type="button"
                                        onClick={addOffer}
                                        className="text-[.65em] text-[var(--primary-color)] font-semibold hover:underline cursor-pointer"
                                    >
                                        + Add Field
                                    </button>
                                </div>

                                {offers.length > 0 &&
                                    <>
                                        <div className="flex flex-col gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[var(--text-light)] bg-white-color-mix p-[5px] rounded-[7px] bg-[var(--primary-color)]30 text-[.85em]">
                                                    <MaskImage url="/icons/f-title.svg" w="1em" h="1em" bg="var(--primary-color)" />
                                                </span>
                                                <label htmlFor="form-title" className="text-[.63em] text-[var(--text-dark)] font-semibold">Offer Title</label>
                                            </div>
                                            <input
                                                type="text"
                                                value={offersHeading}
                                                onChange={(e) => setOffersHeading(e.target.value)}
                                                placeholder="Offers Heading"
                                                className="bg-[var(--bg-w)] text-[.7em] text-[var(--text-dark-1)] placeholder:text-[1em] create-input placeholder:text-[color-mix(in_srgb,var(--text-dark-1)_50%,rgba(255,255,255,0))] rounded-[8px] p-[9px] px-3"
                                            />
                                        </div>
                                        <DndContext
                                            collisionDetection={closestCenter}
                                            onDragEnd={handleOfferDragEnd}
                                        >
                                            <SortableContext
                                                items={offers.map((_, i) => i)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <div className="space-y-4">
                                                    {offers.map((offer, index) => (
                                                        <SortableItem key={index} id={index}>
                                                            <div className="border border-[var(--hover)] bg-[var(--bg-w)] p-4 rounded-[8px] shadow-[0px_0px_10px_rgba(0,0,0,0.06)] space-y-3 transition-colors duration-200 hover:border-[var(--primary-color)] focus-within:border-[var(--primary-color)] focus-within:shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_20%,transparent)] hover:shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_20%,transparent)]">

                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[.65em] font-semibold text-[var(--text-dark)]">Offer {index + 1}</span>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeOffer(index)}
                                                                        className="text-red-500 text-[.6em] hover:underline"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>

                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                                                                    {/* Icon */}
                                                                    <div className="flex flex-col gap-1 text-[var(--text-dark)]">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[var(--text-light)] bg-white-color-mix  rounded-[7px] bg-[var(--primary-color)]30 text-[.8em]">
                                                                                <MaskImage url="/icons/icon.svg" w="1em" h="1em" bg="var(--primary-color)" />
                                                                            </span>
                                                                            <label className="text-[.55em] text-[var(--text-dark)] font-semibold">Icon *</label>
                                                                        </div>
                                                                        <div className="relative flex-1 w-full">
                                                                            <select
                                                                                value={offer.icon}
                                                                                onChange={(e) => updateOffer(index, "icon", e.target.value)}
                                                                                className="create-input text-[.7em] appearance-none w-full p-[8px] rounded-[6px]"
                                                                            >
                                                                                <option value="dis">Discount</option>
                                                                                <option value="d-t">Trial</option>
                                                                                <option value="support">Support</option>
                                                                                <option value="gift">Gift</option>
                                                                                <option value="common">Common</option>
                                                                            </select>
                                                                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                                                                <MaskImage
                                                                                    url="/icons/arrow-down.svg"
                                                                                    w="1.2em"
                                                                                    h="1.2em"
                                                                                    bg="var(--text-dark-1)"
                                                                                />
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Highlight */}
                                                                    <div className="flex flex-col gap-1 text-[var(--text-dark)]">

                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[var(--text-light)] bg-white-color-mix  rounded-[7px] bg-[var(--primary-color)]30 text-[.8em]">
                                                                                <MaskImage url="/icons/type.svg" w="1em" h="1em" bg="var(--primary-color)" />
                                                                            </span>
                                                                            <label className="text-[.55em] text-[var(--text-dark)] font-semibold">Highlight</label>
                                                                        </div>

                                                                        <input
                                                                            type="text"
                                                                            value={offer.highlight}
                                                                            onChange={(e) => updateOffer(index, "highlight", e.target.value)}
                                                                            className="create-input text-[.7em] p-[8px] rounded-[6px]"
                                                                            placeholder="30% OFF"
                                                                        />
                                                                    </div>

                                                                    {/* Title */}
                                                                    <div className="flex flex-col gap-1 text-[var(--text-dark)]">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[var(--text-light)] bg-white-color-mix  rounded-[7px] bg-[var(--primary-color)]30 text-[.8em]">
                                                                                <MaskImage url="/icons/f-title.svg" w="1em" h="1em" bg="var(--primary-color)" />
                                                                            </span>
                                                                            <label className="text-[.55em] text-[var(--text-dark)] font-semibold">Content</label>
                                                                        </div>

                                                                        <input
                                                                            type="text"
                                                                            value={offer.title}
                                                                            onChange={(e) => updateOffer(index, "title", e.target.value)}
                                                                            className="create-input text-[.7em] p-[8px] rounded-[6px]"
                                                                            placeholder="Plan"
                                                                        />
                                                                    </div>

                                                                </div>

                                                            </div>
                                                        </SortableItem>
                                                    ))}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                    </>
                                }

                                <div className="flex justify-center pt-2">

                                    <button
                                        type="button"
                                        onClick={addOffer}
                                        className="text-[.7em] text-[var(--primary-color)] cursor-pointer font-semibold hover:underline border border-[var(--primary-color)] px-4 py-2 rounded-[6px]"
                                    >
                                        + Add Offer
                                    </button>

                                </div>


                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={loading || loadingForm}
                                    className="flex-1 cursor-pointer text-[var(--text-light)] font-semibold tracking-[1px] items-center justify-center bg-[var(--primary-color)] py-2 rounded-[5px] shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_50%,rgba(255,255,255,0))] hover:shadow-[0px_0px_10px_color-mix(in_srgb,var(--primary-color)_70%,rgba(255,255,255,0))] hover:translate-y-[-2px] duration-300 disabled:opacity-50"
                                >
                                    {loading ? (savedFormId ? "Updating..." : "Creating...") : (savedFormId ? "Update Form" : "Create Form")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate(savedFormId ? "/manage-forms" : "/short-links")}
                                    className="px-6 cursor-pointer text-[var(--text-dark)] font-semibold items-center justify-center bg-[var(--hover)] py-2 rounded-[5px] hover:bg-[var(--border)] duration-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Side - Live Preview */}
                    <div className="lg:sticky lg:top-6 h-fit col-span-12 xl:col-span-6 ">
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[var(--primary-color)] flex items-center justify-center">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                                <h3 className="text-[var(--text-dark)] text-[1.1em] font-bold">Live Preview</h3>
                            </div>
                            <p className="text-[var(--text-dark)] text-[.7em] opacity-75 uppercase tracking-wider ml-[2em]">Real-time Visualization</p>
                        </div>
                        <FormPreview />
                    </div>
                </div>
            </div >
        </div >
    );
}
