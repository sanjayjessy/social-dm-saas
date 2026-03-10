import { useState, useEffect } from "react";
import MaskImage from "../components/MaskImage";
import { paymentAPI, authAPI } from "../utils/api";
import { showToast } from "../utils/toast";
import { useNavigate } from "react-router-dom";

export default function Pricing() {
    const [isYearly, setIsYearly] = useState(false);
    const [loadingUpgrade, setLoadingUpgrade] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Load the Razorpay SDK
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);

        // Fetch current user details for prefill
        const fetchUser = async () => {
            const res = await authAPI.getCurrentUser();
            if (res.success) {
                setUser(res.data);
            }
        };
        fetchUser();

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const handleUpgrade = async () => {
        if (!window.Razorpay) {
            showToast("Razorpay SDK failed to load. Are you online?", "error");
            return;
        }

        try {
            setLoadingUpgrade(true);
            const planType = isYearly ? "yearly" : "monthly";
            const amount = isYearly ? 150 : 19; // Dollar values or base currency amount

            // 1. Create order on backend
            const orderRes = await paymentAPI.createOrder(planType, amount);

            if (!orderRes.success) {
                showToast(orderRes.message || "Failed to create payment order.", "error");
                setLoadingUpgrade(false);
                return;
            }

            // 2. Setup checkout options
            const options = {
                key: 'rzp_test_SP3LhW2kGpk37Y', // Use your test key here
                amount: orderRes.data.amount,
                currency: orderRes.data.currency,
                name: "ClickMyChat",
                description: `Upgrade to Growth Plan (${planType})`,
                order_id: orderRes.data.orderId,
                handler: async function (response) {
                    try {
                        const verifyRes = await paymentAPI.verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });

                        if (verifyRes.success) {
                            showToast("Payment successful! Welcome to the Growth Plan.", "success");
                            // Redirect back to dashboard to see new features
                            navigate("/analytics");
                        } else {
                            showToast(verifyRes.message || "Payment verification failed.", "error");
                        }
                    } catch (error) {
                        console.error(error);
                        showToast("An error occurred while verifying the payment.", "error");
                    }
                },
                prefill: {
                    name: user?.name || "",
                    email: user?.email || "",
                    contact: user?.phone || ""
                },
                theme: {
                    color: "var(--primary-color)"
                }
            };

            const rzp = new window.Razorpay(options);

            rzp.on('payment.failed', function (response) {
                console.error("Payment failed", response.error);
                showToast(response.error.description || "Payment failed.", "error");
            });

            rzp.open();
        } catch (error) {
            console.error(error);
            showToast("An unexpected error occurred building the checkout.", "error");
        } finally {
            setLoadingUpgrade(false);
        }
    };

    const isGrowth = user?.workspacePlan === 'growth';
    const activeCycle = user?.workspaceBillingCycle || 'monthly';
    const showActivePlan = isGrowth && (activeCycle === 'yearly' || (activeCycle === 'monthly' && !isYearly));
    const showUpgradeToYearly = isGrowth && activeCycle === 'monthly' && isYearly;

    let nextBillingDateStr = "";
    if (showActivePlan) {
        if (user?.workspaceBillingCycleEnd) {
            nextBillingDateStr = new Date(user.workspaceBillingCycleEnd).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } else if (user?.workspaceBillingCycleStart) {
            // Fallback for older subscriptions
            const startDate = new Date(user.workspaceBillingCycleStart);
            if (activeCycle === 'yearly') {
                startDate.setFullYear(startDate.getFullYear() + 1);
            } else {
                startDate.setMonth(startDate.getMonth() + 1);
            }
            nextBillingDateStr = startDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    }

    return (
        <div className="min-h-screen  py-10 px-4 md:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16 space-y-4 text-[30px]">
                    <h1 className="text-[1.2em] font-bold tracking-tight mb-0 text-[var(--text-dark)] bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-dark)] to-gray-500 pb-2">
                        Simple, transparent pricing
                    </h1>
                    <p className="text-[.6em] text-[var(--text-2)]  mx-auto">
                        Start for free, upgrade when you need more power.
                    </p>

                    <div className="flex items-center justify-center pt-5">
                        <div className="bg-[var(--hover)] p-1 rounded-xl inline-flex relative shadow-inner w-full max-w-[400px]">
                            <button
                                onClick={() => setIsYearly(false)}
                                className={`relative py-2.5 px-8 w-full rounded-lg text-sm font-semibold transition-all duration-300 z-10 ${!isYearly ? "text-[var(--text-light)]" : "text-[var(--text-2)] hover:text-[var(--text-dark)]"
                                    }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setIsYearly(true)}
                                className={`relative py-2.5 px-8 w-full   rounded-lg text-sm font-semibold transition-all duration-300 z-10 flex items-center justify-center gap-2 ${isYearly ? "text-[var(--text-light)]" : "text-[var(--text-2)] hover:text-[var(--text-dark)]"
                                    }`}
                            >
                                Yearly
                                <span className={`text-[0.7em] px-2 py-0.5 rounded-full ${isYearly ? 'bg-white/20 text-white' : 'bg-[var(--primary-color)] text-white'} transition-colors`}>
                                    Save 34%
                                </span>
                            </button>
                            <div
                                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[var(--primary-color)] rounded-lg transition-transform duration-300 shadow-md"
                                style={{ transform: `translateX(${isYearly ? '100%' : '4px'})` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Free Plan */}
                    <div className="relative group perspective">
                        <div className="absolute inset-0 bg-gradient-to-b from-[var(--border)] to-transparent rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative bg-[var(--bg-w)] border border-[var(--border)] rounded-3xl p-8 flex flex-col h-full hover:-translate-y-2 transition-transform duration-500 shadow-xl shadow-[rgba(0,0,0,0.03)] border-b-4 border-b-gray-200">
                            <div className="mb-8">
                                <h3 className="text-2xl font-bold text-[var(--text-dark)] mb-2">Free Plan</h3>
                                <div className="text-[var(--text-2)] text-sm mb-6 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Best for: Creators & testing ClickMyChat
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-[var(--text-dark)] tracking-tight">$0</span>
                                    <span className="text-[var(--text-2)] font-medium">— Forever</span>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <p className="font-semibold text-sm text-[var(--text-dark)] uppercase tracking-wider mb-4">Includes:</p>
                                {[
                                    "Up to 50 DM links",
                                    "Up to 100 leads / month",
                                    "Supported DM platforms (Instagram, WhatsApp, Telegram, Email, Call)",
                                    "1 Link-in-Bio form included",
                                    "Pre-filled DM messages",
                                    "Basic click & lead analytics",
                                    "ClickMyChat branding",
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="bg-[var(--hover)] p-1 rounded-full mt-0.5 shrink-0">
                                            <MaskImage url="/icons/check.svg" w="1em" h="1em" bg="var(--primary-color)" />
                                        </div>
                                        <span className="text-[var(--text-dark)] font-medium opacity-80">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            {/* <button className="mt-8 w-full py-4 rounded-xl border-2 border-[var(--primary-color)] text-[var(--primary-color)] font-bold hover:bg-[var(--primary-color)] hover:text-white transition-colors duration-300">
                                Start for Free
                            </button> */}
                        </div>
                    </div>

                    {/* Growth Plan */}
                    <div className="relative group perspective">
                        <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary-color)] to-transparent rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <div className="absolute -inset-0.5 bg-gradient-to-b from-[var(--primary-color)] to-[#00bad1] rounded-[26px] opacity-100"></div>
                        <div className="relative bg-[var(--bg-w)] rounded-[24px] p-8 flex flex-col h-full hover:-translate-y-2 transition-transform duration-500 shadow-2xl shadow-[color-mix(in_srgb,var(--primary-color)_20%,rgba(0,0,0,0))]">

                            <div className="absolute -top-4 right-8 bg-gradient-to-r from-[var(--primary-color)] to-[#00bad1] text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-lg">
                                Most Popular
                            </div>

                            <div className="mb-8">
                                <h3 className="text-2xl font-bold text-[var(--text-dark)] mb-2 flex items-center gap-2">
                                    Growth Plan
                                    <MaskImage url="/icons/flash.svg" w="1.2em" h="1.2em" bg="var(--primary-color)" />
                                </h3>
                                <div className="text-[var(--text-2)] text-sm mb-6 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[var(--primary-color)]"></span>
                                    Best for: Influencers, small businesses, coaches
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-[var(--text-dark)] tracking-tight">
                                        ${isYearly ? "150" : "19"}
                                    </span>
                                    <span className="text-[var(--text-2)] font-medium">
                                        / {isYearly ? "year" : "month"}
                                    </span>
                                </div>
                            </div>
                            <div className="mb-8 space-y-3">
                                {showActivePlan ? (
                                    <div className="text-center rounded-xl bg-[color-mix(in_srgb,var(--primary-color)_10%,transparent)] border border-[var(--primary-color)] p-4 shadow-sm">
                                        <div className="text-[var(--primary-color)] font-bold text-lg mb-1 flex items-center justify-center gap-2">
                                            <MaskImage url="/icons/check.svg" w="1.2em" h="1.2em" bg="var(--primary-color)" />
                                            Active Plan
                                        </div>
                                        <div className="text-sm font-medium text-[var(--text-dark)] mt-2">
                                            Renews {activeCycle}
                                        </div>
                                        {nextBillingDateStr && (
                                            <div className="text-xs text-[var(--text-2)] mt-1 font-medium">
                                                Next billing: {nextBillingDateStr}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleUpgrade}
                                        disabled={loadingUpgrade}
                                        className="w-full py-4 flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary-color)] to-[#00bad1] text-white font-bold hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--primary-color)_40%,transparent)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-70 disabled:hover:-translate-y-0 disabled:cursor-not-allowed">
                                        {loadingUpgrade ? "Processing..." : showUpgradeToYearly ? "Upgrade to Yearly" : "Upgrade to Growth"}
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 space-y-4">
                                <p className="font-semibold text-sm text-[var(--text-dark)] uppercase tracking-wider mb-4">Everything in Free, plus:</p>
                                {[
                                    "Unlimited DM links",
                                    "Unlimited leads",
                                    "All social media DM links supported",
                                    "Lead source tracking (bio, comment, ad, etc.)",
                                    "Custom forms",
                                    "Unlimited link-in-bio Pages",
                                    "Pre-filled & custom DM messages",
                                    "CRM-style lead dashboard",
                                    "Lead export (CSV)",
                                    "Custom branded links (no watermark)",
                                    "Standard analytics",
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="bg-[color-mix(in_srgb,var(--primary-color)_15%,transparent)] p-1 rounded-full mt-0.5 shrink-0">
                                            <MaskImage url="/icons/check.svg" w="1em" h="1em" bg="var(--primary-color)" />
                                        </div>
                                        <span className="text-[var(--text-dark)] font-medium opacity-90">{feature}</span>
                                    </div>
                                ))}
                            </div>


                        </div>
                    </div>
                </div>

                {/* Enterprise/Custom Note (Optional but good for SaaS) */}
                {/* <div className="mt-20 text-center bg-[var(--hover)] rounded-2xl p-8 max-w-3xl mx-auto border border-[var(--border)]">
                    <h4 className="text-xl font-bold text-[var(--text-dark)] mb-2">Need something custom?</h4>
                    <p className="text-[var(--text-2)] mb-6">Contact us for custom enterprise plans with dedicated support and SLA.</p>
                    <button className="px-6 py-2.5 rounded-lg bg-[var(--bg-w)] text-[var(--text-dark)] font-semibold shadow-sm border border-[var(--border)] hover:bg-[var(--border)] transition-colors">
                        Contact Sales
                    </button>
                </div> */}

            </div>
        </div>
    );
}
