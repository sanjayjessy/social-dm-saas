import "../assets/css/form.css";
import MaskImage from "../components/MaskImage";
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authAPI } from "../utils/api";
import { GoogleLogin } from '@react-oauth/google';

const RESEND_COOLDOWN = 35;

/* ── Google G Logo ──────────────────────────────────────────────────────────── */
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
);

export default function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [verificationSent, setVerificationSent] = useState(false);
    const [sentToEmail, setSentToEmail] = useState("");
    const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
    const [resending, setResending] = useState(false);
    const [resendMsg, setResendMsg] = useState("");
    const timerRef = useRef(null);

    const navigate = useNavigate();

    const startCountdown = () => {
        setCountdown(RESEND_COOLDOWN);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { clearInterval(timerRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        if (verificationSent) startCountdown();
        return () => clearInterval(timerRef.current);
    }, [verificationSent]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!name || !email || !password) { setError("All fields are required"); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
        setLoading(true);
        try {
            const response = await authAPI.register(name, email, password, 'user');
            if (response.success) {
                setSentToEmail(email);
                setVerificationSent(true);
                setName(""); setPassword("");
            } else {
                setError(response.message || "Signup failed");
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
            console.error("Signup error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0 || resending) return;
        setResending(true); setResendMsg("");
        try {
            const res = await authAPI.resendVerification(sentToEmail);
            if (res.success) { setResendMsg("Verification email resent!"); startCountdown(); }
            else { setResendMsg(res.message || "Failed to resend. Try again."); }
        } catch { setResendMsg("Failed to resend. Try again."); }
        finally { setResending(false); }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setError(""); setLoading(true);
        try {
            const response = await authAPI.googleLogin(credentialResponse.credential, 'signup');
            if (response.success) { navigate("/analytics"); }
            else { setError(response.message || "Google Signup failed. Please try again."); }
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "";
            setError(msg || "Google Signup failed. Please try again.");
            console.error("Google Signup error:", err);
        } finally { setLoading(false); }
    };

    const handleGoogleError = () => {
        setError("Google Signup was unsuccessful. Please try again.");
    };

    return (
        <div id="login-page" className="flex-1 p-4 w-full text-[16px]">
            <div className="login-card shadow">
                <div className="header-bg relative">
                    <div className="sun"></div>
                    <div className="birds">🕊️ 🕊️</div>
                    <h2 className="text-[white] text-[2em] font-semibold">ClickMyChat</h2>
                    <p>DM link &amp; affiliate management platform</p>
                </div>

                <div className="login-section">
                    {verificationSent ? (
                        <div className="py-2">
                            <h5 className="mb-4">CHECK YOUR EMAIL</h5>
                            <div style={{ border: "1px solid #d1d5db", borderRadius: "8px",
                                padding: "10px 14px", fontSize: ".9em", color: "#374151",
                                marginBottom: "16px", background: "#f9fafb" }}>
                                {sentToEmail}
                            </div>
                            <p style={{ fontSize: ".88em", color: "#6b7280", marginBottom: "20px", lineHeight: "1.55" }}>
                                We've sent a verification link to{" "}
                                <strong style={{ color: "#374151" }}>{sentToEmail}</strong>.{" "}
                                If you don't see it within 5 minutes, please check your spam or click resend.
                            </p>
                            {resendMsg && (
                                <p style={{ fontSize: ".82em",
                                    color: resendMsg.includes("resent") ? "#16a34a" : "#dc2626",
                                    marginBottom: "10px", textAlign: "center" }}>
                                    {resendMsg}
                                </p>
                            )}
                            <button onClick={handleResend} disabled={countdown > 0 || resending}
                                style={{ width: "100%", padding: "11px", borderRadius: "8px", border: "none",
                                    background: countdown > 0 || resending ? "#9ca3af" : "#0f8b8d",
                                    color: "#fff", fontWeight: "600", fontSize: ".95em",
                                    cursor: countdown > 0 || resending ? "not-allowed" : "pointer",
                                    transition: "background .2s", marginBottom: "18px" }}>
                                {resending ? "Sending..." : countdown > 0 ? `Resend (${countdown}s)` : "Resend Email"}
                            </button>
                            <div className="flex mt-2">
                                <p className="text-[--text-dark] text-center w-full opacity-90 text-[.9em]">
                                    Already verified?{" "}
                                    <Link to="/login" className="text-[#0f8b8d] font-semibold">Login</Link>
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h5>USER SIGNUP</h5>

                            {error && (
                                <div className="mb-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-[.85em]">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="input-group mb-3 flex">
                                    <span className="input-group-text w-[15%] flex justify-center items-center">
                                        <MaskImage url="/icons/l-u.svg" w="1.2em" h="1.2em" bg="white" />
                                    </span>
                                    <input type="text" name="name" value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="form-control w-full py-2" placeholder="Full Name"
                                        required disabled={loading} />
                                </div>
                                <div className="input-group mb-3 flex">
                                    <span className="input-group-text w-[15%] flex justify-center items-center">
                                        <MaskImage url="/icons/mail.svg" w="1.2em" h="1.2em" bg="white" />
                                    </span>
                                    <input type="email" name="email" value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="form-control w-full py-2" placeholder="Email"
                                        required disabled={loading} />
                                </div>
                                <div className="input-group mb-3 flex">
                                    <span className="input-group-text w-[15%] flex justify-center items-center">
                                        <MaskImage url="/icons/l-l.svg" w="1.2em" h="1.2em" bg="white" />
                                    </span>
                                    <input type="password" name="password" value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="form-control w-full py-2" placeholder="Password"
                                        required disabled={loading} minLength={6} />
                                </div>
                                <button type="submit" className="login-btn cursor-pointer" disabled={loading}>
                                    {loading ? "Signing up..." : "Sign up"}
                                </button>
                            </form>

                            {/* ── Divider ── */}
                            <div className="flex items-center justify-center my-4">
                                <div className="border-t border-gray-300 flex-grow"></div>
                                <span className="px-3 text-gray-500 text-sm">Or sign up with</span>
                                <div className="border-t border-gray-300 flex-grow"></div>
                            </div>

                            {/* ── Custom Google Button (overlay approach) ── */}
                            <div className="mb-4" style={{ position: "relative", height: 46 }}>
                                {/* Visible styled button layer (pointer-events off) */}
                                <div style={{
                                    position: "absolute", inset: 0, zIndex: 1,
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                                    background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10,
                                    fontWeight: 600, fontSize: ".92em", color: "#374151",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                    pointerEvents: "none", userSelect: "none"
                                }}>
                                    <GoogleIcon />
                                    <span>Sign up with Google</span>
                                </div>

                                {/* Real GoogleLogin — transparent overlay that receives actual clicks */}
                                <div style={{
                                    position: "absolute", inset: 0, zIndex: 2,
                                    opacity: 0.01, overflow: "hidden", borderRadius: 10,
                                    display: "flex"
                                }}>
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={handleGoogleError}
                                        useOneTap={false}
                                        width="600"
                                        size="large"
                                    />
                                </div>
                            </div>

                            <div className="flex mt-5">
                                <p className="text-[--text-dark] text-center w-full opacity-90 text-[.9em]">
                                    Already have an account?{" "}
                                    <Link to="/login" className="text-[#0f8b8d] font-semibold">Login</Link>
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
