import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { authAPI } from "../utils/api";
import MaskImage from "../components/MaskImage";
import "../assets/css/form.css";

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [status, setStatus] = useState("verifying"); // verifying, success, error
    const [message, setMessage] = useState("Verifying your email address...");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Invalid verification link.");
            return;
        }

        const verify = async () => {
            try {
                const response = await authAPI.verifyEmail(token);
                if (response.success) {
                    setStatus("success");
                    setMessage("Email verified successfully! You can now log in.");
                } else {
                    setStatus("error");
                    setMessage(response.message || "Failed to verify email.");
                }
            } catch (err) {
                setStatus("error");
                setMessage("An error occurred during verification. Please try again.");
            }
        };

        verify();
    }, [token]);

    return (
        <div id="login-page" className="flex-1 p-4 w-full text-[16px] min-h-screen flex items-center justify-center">
            <div className="login-card shadow mx-auto">
                <div className="header-bg relative">
                    <div className="sun"></div>
                    <div className="birds">🕊️ 🕊️</div>
                    <h2 className="text-[white] text-[2em] font-semibold">ClickMyChat</h2>
                    <p>Email Verification</p>
                </div>

                <div className="login-section text-center py-8">
                    {status === "verifying" && (
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="w-8 h-8 border-4 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[--text-dark] font-medium">{message}</p>
                        </div>
                    )}

                    {status === "success" && (
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="bg-green-100 p-3 rounded-full">
                                <MaskImage url="/icons/check.svg" w="2em" h="2em" bg="#10b981" />
                            </div>
                            <h3 className="text-xl font-bold text-[--text-dark]">Success!</h3>
                            <p className="text-[--text-2]">{message}</p>
                            <button
                                onClick={() => navigate("/login")}
                                className="login-btn mt-4 cursor-pointer"
                            >
                                Back to Login
                            </button>
                        </div>
                    )}

                    {status === "error" && (
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="bg-red-100 p-3 rounded-full">
                                <MaskImage url="/icons/flash.svg" w="2em" h="2em" bg="#ef4444" />
                            </div>
                            <h3 className="text-xl font-bold text-[--text-dark]">Verification Failed</h3>
                            <p className="text-red-500 max-w-sm text-sm">{message}</p>
                            <button
                                onClick={() => navigate("/login")}
                                className="login-btn mt-4 cursor-pointer"
                            >
                                Go to Login
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
