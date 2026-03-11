import "../assets/css/form.css";
import MaskImage from "../components/MaskImage";
import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authAPI } from "../utils/api";
import { GoogleLogin } from '@react-oauth/google';

/* ── Google G Logo ──────────────────────────────────────────────────────────── */
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
);

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Points at the hidden GoogleLogin container so we can trigger its click
    const googleBtnRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const response = await authAPI.login(email, password);
            if (response.success) {
                navigate("/analytics");
            } else {
                setError(response.message || "Login failed");
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
            console.error("Login error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setError("");
        setLoading(true);
        try {
            const response = await authAPI.googleLogin(credentialResponse.credential, 'login');
            if (response.success) {
                navigate("/analytics");
            } else {
                setError(response.message || "Google Login failed. Please try again.");
            }
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "";
            setError(msg || "Google Login failed. Please try again.");
            console.error("Google Login error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = () => {
        setError("Google Login was unsuccessful. Please try again.");
    };

    // Click the real (hidden) Google button to trigger the OAuth popup
    const triggerGoogleLogin = () => {
        if (!googleBtnRef.current) return;
        const btn = googleBtnRef.current.querySelector('div[role="button"], button');
        if (btn) btn.click();
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
                    <h5>USER LOGIN</h5>

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
                                required disabled={loading} />
                        </div>

                        <div className="flex justify-end mb-1">
                            <Link to="/forgot-password" className="text-[.8em] text-[#0f8b8d] font-medium hover:underline">
                                Forgot Password?
                            </Link>
                        </div>

                        <button type="submit" className="login-btn cursor-pointer" disabled={loading}>
                            {loading ? "Logging in..." : "Login"}
                        </button>
                    </form>

                    {/* ── Divider ── */}
                    <div className="flex items-center justify-center my-4">
                        <div className="border-t border-gray-300 flex-grow"></div>
                        <span className="px-3 text-gray-500 text-sm">Or continue with</span>
                        <div className="border-t border-gray-300 flex-grow"></div>
                    </div>

                    {/* ── Custom Google Button ── */}
                    <div className="mb-4" style={{ position: "relative" }}>
                        {/* Real GoogleLogin hidden behind our button */}
                        <div ref={googleBtnRef} aria-hidden="true"
                            style={{ position: "absolute", opacity: 0, pointerEvents: "none",
                                     width: 1, height: 1, overflow: "hidden", top: 0, left: 0 }}>
                            <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} useOneTap={false} />
                        </div>

                        {/* Our styled button */}
                        <button type="button" disabled={loading} onClick={triggerGoogleLogin}
                            style={{
                                display: "flex", alignItems: "center", justifyContent: "center",
                                gap: 10, width: "100%", padding: "11px 16px",
                                background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10,
                                cursor: loading ? "not-allowed" : "pointer",
                                fontWeight: 600, fontSize: ".92em", color: "#374151",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.08)", transition: "all .2s ease",
                                opacity: loading ? 0.6 : 1
                            }}
                            onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.12)"; e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.transform = "translateY(-1px)"; }}}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.transform = "translateY(0)"; }}
                            onMouseDown={e => { e.currentTarget.style.background = "#f8fafc"; }}
                            onMouseUp={e => { e.currentTarget.style.background = "#fff"; }}
                        >
                            <GoogleIcon />
                            <span>{loading ? "Connecting…" : "Continue with Google"}</span>
                        </button>
                    </div>

                    <div className="flex mt-5">
                        <p className="text-[--text-dark] text-center w-full opacity-90 text-[.9em]">
                            Don't have an account?{" "}
                            <Link to="/signup" className="text-[#0f8b8d] font-semibold">Sign up</Link>
                        </p>
                    </div>

                    <div className="text-center mt-4 powered-by hidden">
                        <div className="powered-by-inner">
                            <span>Powered by</span>
                            <a href="https://transvaal.in/">
                                <img src="https://transvaal.in/logo-dark.svg" alt="LOGO" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
