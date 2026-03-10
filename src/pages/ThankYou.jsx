import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MaskImage from "../components/MaskImage";

export default function ThankYou() {
    const [searchParams] = useSearchParams();
    const formName = searchParams.get('formName') || 'Form';
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        setTimeout(() => setShowContent(true), 100);
    }, []);

    return (
        <div className="min-h-screen bg-[#fafafc] dark:bg-[#09090b] flex items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden font-sans">
            {/* Background Decorative Elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-blue-500/10 to-emerald-500/10 rounded-full blur-3xl -z-10 opacity-70"></div>
            
            <div className={`max-w-lg w-full transform transition-all duration-1000 ease-out ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                
                {/* Main Card */}
                <div className="bg-white/80 dark:bg-white/[0.02] backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-[28px] p-10 sm:p-12 text-center shadow-[0_8px_40px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] relative overflow-hidden group">
                    
                    {/* Top Accent Gradient */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500 opacity-80"></div>

                    {/* Checkmark Icon Container */}
                    <div className="relative w-24 h-24 mx-auto mb-8">
                        <div className={`absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-full opacity-20 duration-1000 ${showContent ? 'animate-ping' : ''}`}></div>
                        <div className="relative w-full h-full bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                            <svg 
                                className="w-10 h-10 text-emerald-500 dark:text-emerald-400" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path 
                                    strokeDasharray="60" 
                                    strokeDashoffset={showContent ? 0 : 60} 
                                    className="transition-all duration-1000 delay-300 ease-out" 
                                    d="M20 6L9 17l-5-5"
                                ></path>
                            </svg>
                        </div>
                    </div>

                    {/* Typography */}
                    <h1 className="text-[2.25rem] leading-tight font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
                        Submission Successful
                    </h1>
                    
                    <p className="text-[1.05rem] text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">
                        Thank you for reaching out! Your response has been securely recorded.
                    </p>
                    
                    {formName && formName !== 'Form' && (
                        <div className="inline-flex items-center justify-center px-4 py-2 mt-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-full">
                            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Regarding:</span>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{formName}</span>
                        </div>
                    )}

                    {/* Divider & Footer */}
                    <div className="mt-12 pt-8 border-t border-gray-100 dark:border-white/5">
                        <div className="flex flex-col items-center justify-center space-y-3">
                            <span className="text-xs font-semibold tracking-widest text-gray-400 dark:text-gray-500 uppercase">
                                Secured & Powered By
                            </span>
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5 hover:border-blue-500/30 transition-colors duration-300 cursor-default">
                                <MaskImage url="/icons/link.svg" w="1.2em" h="1.2em" bg="#3b82f6" />
                                <span className="font-bold text-gray-900 dark:text-white tracking-tight">ClickMyChat</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
