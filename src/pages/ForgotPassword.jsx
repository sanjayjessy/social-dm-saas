import "../assets/css/form.css";
import MaskImage from "../components/MaskImage";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../utils/api";

// ─── Step indicators ─────────────────────────────────────────────────────────
function StepDot({ step, current }) {
    const done = current > step;
    const active = current === step;
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: done ? "#0f8b8d" : active ? "#0f8b8d" : "#e5e7eb",
                color: done || active ? "#fff" : "#9ca3af",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: ".9em",
                transition: "background .3s"
            }}>
                {done ? "✓" : step}
            </div>
        </div>
    );
}

// ─── OTP digit boxes ──────────────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
    const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);

    const handleKey = (i, e) => {
        const next = [...digits];
        if (e.key === "Backspace") {
            next[i] = "";
            onChange(next.join(""));
            if (i > 0) document.getElementById(`otp-${i - 1}`)?.focus();
        } else if (/^\d$/.test(e.key)) {
            next[i] = e.key;
            onChange(next.join(""));
            if (i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
        }
    };

    const handlePaste = (e) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        onChange(pasted.padEnd(6, "").slice(0, 6));
        document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus();
        e.preventDefault();
    };

    return (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "16px 0" }}>
            {digits.map((d, i) => (
                <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onKeyDown={(e) => handleKey(i, e)}
                    onPaste={handlePaste}
                    onChange={() => {}}
                    style={{
                        width: 44, height: 52, textAlign: "center",
                        fontSize: "1.4em", fontWeight: 700,
                        border: `2px solid ${d ? "#0f8b8d" : "#d1d5db"}`,
                        borderRadius: 8, outline: "none",
                        background: d ? "#f0fdfa" : "#fff",
                        transition: "border .2s, background .2s",
                        caretColor: "transparent"
                    }}
                />
            ))}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ForgotPassword() {
    const navigate = useNavigate();

    // Wizard state: 1 = enter email, 2 = enter OTP + new password
    const [step, setStep]           = useState(1);
    const [email, setEmail]         = useState("");
    const [otp, setOtp]             = useState("");
    const [newPassword, setNewPassword]         = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword]       = useState(false);
    const [resetToken, setResetToken]           = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState("");
    const [info, setInfo]       = useState("");
    const [success, setSuccess] = useState(false);

    // ── Step 1: send OTP ──────────────────────────────────────────────────────
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError(""); setInfo("");
        setLoading(true);
        try {
            const res = await authAPI.forgotPassword(email);
            if (!res.success) {
                // Stay on step 1 and show the clear error message from backend
                setError(res.message || "Failed to send OTP. Please try again.");
                return;
            }
            // Success — advance to OTP entry step
            setInfo(res.message || "OTP sent! Check your inbox.");
            setStep(2);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: verify OTP then reset password ────────────────────────────────
    const handleVerifyAndReset = async (e) => {
        e.preventDefault();
        setError(""); setInfo("");

        if (otp.replace(/\D/g, "").length < 6) {
            return setError("Please enter the full 6-digit OTP.");
        }
        if (newPassword.length < 6) {
            return setError("Password must be at least 6 characters.");
        }
        if (newPassword !== confirmPassword) {
            return setError("Passwords do not match.");
        }

        setLoading(true);
        try {
            // Step 2a: verify OTP
            const verifyRes = await authAPI.verifyOtp(email, otp);
            if (!verifyRes.success) {
                return setError(verifyRes.message || "Invalid or expired OTP.");
            }

            const token = verifyRes.data?.resetToken;
            setResetToken(token);

            // Step 2b: reset password
            const resetRes = await authAPI.resetPassword(token, newPassword);
            if (!resetRes.success) {
                return setError(resetRes.message || "Failed to reset password.");
            }

            setSuccess(true);
            setTimeout(() => navigate("/login"), 3000);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ── Resend OTP ────────────────────────────────────────────────────────────
    const handleResend = async () => {
        setError(""); setInfo(""); setOtp("");
        setLoading(true);
        try {
            const res = await authAPI.forgotPassword(email);
            setInfo(res.message || "A new OTP has been sent.");
        } catch {
            setError("Failed to resend OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div id="login-page" className="flex-1 p-4 w-full text-[16px]">
            <div className="login-card shadow">
                {/* Header */}
                <div className="header-bg relative">
                    <div className="sun"></div>
                    <div className="birds">🔐 🕊️</div>
                    <h2 className="text-[white] text-[2em] font-semibold">ClickMyChat</h2>
                    <p>Reset your password securely</p>
                </div>

                <div className="login-section">
                    {/* Step indicators */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 24 }}>
                        <StepDot step={1} current={step} />
                        <div style={{ width: 48, height: 2, background: step > 1 ? "#0f8b8d" : "#e5e7eb", transition: "background .3s" }} />
                        <StepDot step={2} current={step} />
                    </div>

                    <h5 style={{ textAlign: "center", marginBottom: 8 }}>
                        {step === 1 ? "FORGOT PASSWORD" : "VERIFY & RESET"}
                    </h5>
                    <p style={{ textAlign: "center", color: "#6b7280", fontSize: ".85em", marginBottom: 16 }}>
                        {step === 1
                            ? "Enter your email to receive a 6-digit code"
                            : `OTP sent to ${email}`}
                    </p>

                    {/* ── Premium Success Screen ── */}
                    {success && (
                        <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
                            {/* Animated checkmark circle */}
                            <div style={{
                                width: 80, height: 80, borderRadius: "50%",
                                background: "linear-gradient(135deg, #0f8b8d 0%, #10b981 100%)",
                                margin: "0 auto 20px",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: "0 8px 32px rgba(15,139,141,0.35)",
                                animation: "successPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both"
                            }}>
                                <svg width="38" height="38" viewBox="0 0 24 24" fill="none"
                                    stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>

                            <h3 style={{
                                fontSize: "1.3em", fontWeight: 700,
                                color: "#111827", margin: "0 0 8px"
                            }}>
                                Password Reset Successful!
                            </h3>

                            <p style={{ color: "#6b7280", fontSize: ".875em", margin: "0 0 24px", lineHeight: 1.5 }}>
                                Your password has been updated.<br />
                                You can now log in with your new password.
                            </p>

                            {/* Progress bar countdown */}
                            <div style={{
                                height: 4, borderRadius: 2,
                                background: "#e5e7eb", overflow: "hidden", marginBottom: 12
                            }}>
                                <div style={{
                                    height: "100%", borderRadius: 2,
                                    background: "linear-gradient(90deg, #0f8b8d, #10b981)",
                                    animation: "shrink 3s linear forwards"
                                }} />
                            </div>
                            <p style={{ fontSize: ".78em", color: "#9ca3af", marginBottom: 20 }}>
                                Redirecting to login in 3 seconds…
                            </p>

                            <Link
                                to="/login"
                                style={{
                                    display: "inline-block", padding: "10px 28px",
                                    background: "linear-gradient(135deg, #0f8b8d, #0a6e6e)",
                                    color: "#fff", borderRadius: 8, fontWeight: 600,
                                    fontSize: ".9em", textDecoration: "none",
                                    boxShadow: "0 4px 12px rgba(15,139,141,0.3)",
                                    transition: "transform .15s, box-shadow .15s"
                                }}
                                onMouseEnter={e => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 6px 18px rgba(15,139,141,0.4)"; }}
                                onMouseLeave={e => { e.target.style.transform = ""; e.target.style.boxShadow = "0 4px 12px rgba(15,139,141,0.3)"; }}
                            >
                                Go to Login →
                            </Link>

                            {/* Keyframe styles injected inline */}
                            <style>{`
                                @keyframes successPop {
                                    0%   { transform: scale(0); opacity: 0; }
                                    80%  { transform: scale(1.1); }
                                    100% { transform: scale(1); opacity: 1; }
                                }
                                @keyframes shrink {
                                    0%   { width: 100%; }
                                    100% { width: 0%; }
                                }
                            `}</style>
                        </div>
                    )}


                    {!success && (
                        <>
                            {/* Error / Info banners */}
                            {error && (
                                <div className="mb-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-[.85em]">
                                    {error}
                                </div>
                            )}
                            {info && !error && (
                                <div className="mb-3 p-3 rounded text-[.85em]"
                                    style={{ background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8" }}>
                                    {info}
                                </div>
                            )}

                            {/* ── Step 1: Email ── */}
                            {step === 1 && (
                                <form onSubmit={handleSendOtp}>
                                    <div className="input-group mb-3 flex">
                                        <span className="input-group-text w-[15%] flex justify-center items-center">
                                            <MaskImage url="/icons/l-u.svg" w="1.2em" h="1.2em" bg="white" />
                                        </span>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="form-control w-full py-2"
                                            placeholder="Your registered email"
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="login-btn cursor-pointer"
                                        disabled={loading}
                                    >
                                        {loading ? "Sending…" : "Send OTP"}
                                    </button>
                                </form>
                            )}

                            {/* ── Step 2: OTP + new password ── */}
                            {step === 2 && (
                                <form onSubmit={handleVerifyAndReset}>
                                    {/* OTP digit input */}
                                    <label style={{ display: "block", textAlign: "center", fontSize: ".85em", color: "#374151", marginBottom: 4 }}>
                                        Enter 6-digit OTP
                                    </label>
                                    <OtpInput value={otp} onChange={setOtp} />

                                    {/* New password */}
                                    <div className="input-group mb-3 flex" style={{ position: "relative" }}>
                                        <span className="input-group-text w-[15%] flex justify-center items-center">
                                            <MaskImage url="/icons/l-l.svg" w="1.2em" h="1.2em" bg="white" />
                                        </span>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="form-control w-full py-2"
                                            placeholder="New password (min 6 chars)"
                                            required
                                            disabled={loading}
                                            style={{ paddingRight: 40 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(v => !v)}
                                            style={{
                                                position: "absolute", right: 10, top: "50%",
                                                transform: "translateY(-50%)", background: "none",
                                                border: "none", cursor: "pointer", color: "#6b7280", fontSize: ".85em"
                                            }}
                                        >
                                            {showPassword ? "Hide" : "Show"}
                                        </button>
                                    </div>

                                    {/* Confirm password */}
                                    <div className="input-group mb-3 flex">
                                        <span className="input-group-text w-[15%] flex justify-center items-center">
                                            <MaskImage url="/icons/l-l.svg" w="1.2em" h="1.2em" bg="white" />
                                        </span>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="form-control w-full py-2"
                                            placeholder="Confirm new password"
                                            required
                                            disabled={loading}
                                        />
                                    </div>

                                    {/* Password strength hint */}
                                    {newPassword && (
                                        <div style={{ marginBottom: 12 }}>
                                            <div style={{ height: 4, borderRadius: 2, background: "#e5e7eb", overflow: "hidden" }}>
                                                <div style={{
                                                    height: "100%", borderRadius: 2,
                                                    width: newPassword.length >= 10 ? "100%" : newPassword.length >= 6 ? "60%" : "30%",
                                                    background: newPassword.length >= 10 ? "#10b981" : newPassword.length >= 6 ? "#f59e0b" : "#ef4444",
                                                    transition: "width .3s, background .3s"
                                                }} />
                                            </div>
                                            <span style={{ fontSize: ".75em", color: "#6b7280" }}>
                                                {newPassword.length >= 10 ? "Strong" : newPassword.length >= 6 ? "Medium" : "Weak"}
                                            </span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="login-btn cursor-pointer"
                                        disabled={loading || otp.replace(/\D/g, "").length < 6}
                                    >
                                        {loading ? "Resetting…" : "Reset Password"}
                                    </button>

                                    {/* Resend / change email */}
                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: ".8em" }}>
                                        <button
                                            type="button"
                                            onClick={handleResend}
                                            disabled={loading}
                                            style={{ background: "none", border: "none", color: "#0f8b8d", cursor: "pointer", fontWeight: 600 }}
                                        >
                                            Resend OTP
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setStep(1); setError(""); setInfo(""); setOtp(""); }}
                                            style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer" }}
                                        >
                                            Change email
                                        </button>
                                    </div>
                                </form>
                            )}
                        </>
                    )}

                    {/* Back to login */}
                    <div className="flex mt-5">
                        <p className="text-[--text-dark] text-center w-full opacity-90 text-[.9em]">
                            Remember your password?{" "}
                            <Link to="/login" className="text-[#0f8b8d] font-semibold">
                                Back to Login
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
