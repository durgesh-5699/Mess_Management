import { useEffect, useState } from "react";
import QRCode from "qrcode";

/* ------------------------------------------------------------------
   API (unchanged)
------------------------------------------------------------------ */
const api = async (path, options = {}) => {
  const token = localStorage.getItem("plate-token");
  const response = await fetch(`/api${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
};

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const mealTypes = ["breakfast", "lunch", "snacks", "dinner"];
const mealIcon = { breakfast: "🍳", lunch: "🍛", snacks: "🥪", dinner: "🍲" };
const currentDay = (new Date().getDay() + 6) % 7;

/* ------------------------------------------------------------------
   Primitives
------------------------------------------------------------------ */
const Icon = ({ children, className = "" }) => (
  <span
    className={`inline-flex h-5 w-5 items-center justify-center text-base ${className}`}
    aria-hidden="true"
  >
    {children}
  </span>
);

// glass panel
const Card = ({ children, className = "", strong = false }) => (
  <div
    className={`${strong ? "glass-strong" : "glass"} rounded-[28px] p-5 sm:p-6 ${className}`}
  >
    {children}
  </div>
);

// variants: primary (3D mango), metal (3D steel), soft (neu), glass
const Button = ({ children, variant = "primary", className = "", ...props }) => (
  <button className={`btn btn-${variant} ${className}`} {...props}>
    {children}
  </button>
);

const Spinner = () => (
  <span
    className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent align-[-.15em]"
    aria-label="Loading"
  />
);

const Input = ({ className = "", ...props }) => (
  <input className={`field ${className}`} {...props} />
);

const Select = ({ options, ...props }) => (
  <select className="field" {...props}>
    {options.map((option) => (
      <option key={option}>{option}</option>
    ))}
  </select>
);

const Status = ({ value }) => (
  <span
    className={`chip ${
      value === "paid" || value === "resolved"
        ? "chip-ok"
        : value === "in-progress"
          ? "chip-warn"
          : "chip-soft"
    }`}
  >
    {value}
  </span>
);

// glowing LED instead of the classic veg/non-veg square
const VegLed = ({ veg }) => (
  <span
    className="led"
    style={{ "--c": veg ? "#22c55e" : "#ef4444" }}
    role="img"
    aria-label={veg ? "Vegetarian" : "Non-vegetarian"}
  />
);

const Heading = ({ title, sub, children }) => (
  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div>
      <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {sub && <p className="mt-1.5 text-sm text-muted">{sub}</p>}
    </div>
    {children}
  </div>
);

const Logo = ({ size = "md" }) => (
  <div className="flex items-center gap-3">
    <span className="badge-skeu" style={size === "lg" ? { width: 52, height: 52 } : {}}>
      H
    </span>
    <span className={`font-extrabold tracking-tight ${size === "lg" ? "text-3xl" : "text-xl"}`}>
      Hostel<span className="text-mango">Bite</span>
    </span>
  </div>
);

const ThemeSwitch = ({ dark, onClick }) => (
  <button
    role="switch"
    aria-checked={dark}
    aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    className="switch"
    onClick={onClick}
  >
    <span className="switch-knob">{dark ? "☾" : "☀"}</span>
  </button>
);

const Modal = ({ children }) => (
  <div className="scrim fixed inset-0 z-50 grid place-items-center p-5">
    <div className="pop w-full max-w-sm">{children}</div>
  </div>
);

/* ------------------------------------------------------------------
   Dialogs
------------------------------------------------------------------ */
// Paper ticket with punched notches + perforation
function QrDialog({
  title,
  amount,
  data,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  onClose,
  busy,
}) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(data, { width: 220, margin: 1 }).then(setSrc);
  }, [data]);
  return (
    <Modal>
      <div className="ticket-wrap">
        <div className="ticket">
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="t-sub text-xs font-semibold">Offline payment</p>
                <h3 className="mt-1 text-xl font-extrabold leading-tight">
                  {title}
                </h3>
              </div>
              <span className="stamp">Admit one</span>
            </div>
            <p className="mt-4 text-4xl font-extrabold tracking-tight">
              ₹{amount}
            </p>
          </div>
          <div className="ticket-perf mx-5" />
          <div className="px-6 pt-8 pb-6 text-center">
            {src ? (
              <img
                className="mx-auto rounded-2xl bg-white p-2 shadow-[inset_0_2px_6px_rgba(0,0,0,.18)]"
                src={src}
                alt="Payment QR code"
              />
            ) : (
              <div className="skeleton mx-auto h-[220px] w-[220px] rounded-2xl bg-black/10" />
            )}
            <p className="t-sub mt-4 text-xs">
              Scan this code or show it at the mess office.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button variant="soft" onClick={onClose}>
                Close
              </Button>
              {secondaryLabel && (
                <Button
                  variant="soft"
                  disabled={busy || !src}
                  onClick={onSecondary}
                >
                  {secondaryLabel}
                </Button>
              )}
              <Button disabled={busy || !src} onClick={onAction}>
                {busy && <Spinner />}
                {busy ? "Updating…" : actionLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function CouponDialog({ meal, onRate, onClose }) {
  const [coupon, setCoupon] = useState(null);
  const [couponLoaded, setCouponLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const item = meal.items.join(", ");
  const price = meal.price || 80;
  useEffect(() => {
    let active = true;
    api("/coupons")
      .then((coupons) => {
        if (!active) return;
        setCoupon(
          coupons.find(
            (entry) =>
              entry.day === meal.day &&
              entry.type === meal.type &&
              entry.item === item,
          ) || null,
        );
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      })
      .finally(() => {
        if (active) setCouponLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [item, meal.day, meal.type]);
  const save = async (payNow) => {
    setBusy(true);
    try {
      const saved = await api("/coupons", {
        method: "POST",
        body: { meal: meal._id, day: meal.day, type: meal.type, item, price },
      });
      if (payNow && saved.status !== "paid") {
        await api(`/coupons/${saved._id}/pay`, { method: "PATCH" });
        setCoupon({
          ...saved,
          status: "paid",
          paidOn: new Date().toISOString(),
        });
      } else {
        setCoupon(saved);
      }
    } finally {
      setBusy(false);
    }
  };
  if (!couponLoaded) {
    return (
      <Modal>
        <Card strong className="text-center">
          <Spinner />
          <p className="mt-3 text-sm font-bold">Checking your coupon history…</p>
        </Card>
      </Modal>
    );
  }
  if (loadError) {
    return (
      <Modal>
        <Card strong className="text-center">
          <p className="text-sm font-bold">Couldn’t load your coupons</p>
          <p className="mt-2 text-sm text-muted">{loadError}</p>
          <Button className="mt-5" onClick={onClose}>
            Close
          </Button>
        </Card>
      </Modal>
    );
  }
  if (coupon) {
    return (
      <Modal>
        <Card strong>
          <p className="text-sm font-semibold text-muted">Coupon status</p>
          <h3 className="mt-1 text-xl font-extrabold">{item}</h3>
          <p className="mt-2 text-sm text-muted">
            You already have this coupon.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="soft" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => onRate(meal)}>Rate this meal</Button>
          </div>
        </Card>
      </Modal>
    );
  }
  return (
    <QrDialog
      title={`${days[meal.day]} ${meal.type} coupon`}
      amount={price}
      data={`hostelbite-coupon:${meal.day}:${meal.type}:${item}`}
      actionLabel="Buy coupon"
      secondaryLabel="Pay later"
      busy={busy}
      onClose={onClose}
      onAction={() => save(true)}
      onSecondary={() => save(false)}
    />
  );
}

/* ------------------------------------------------------------------
   Auth
------------------------------------------------------------------ */
function Auth({ onLogin }) {
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (key) => (event) =>
    setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await api(`/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: form,
      });
      localStorage.setItem("plate-token", result.token);
      onLogin(result.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center p-4 sm:p-8">
      <div className="glass-strong grid w-full max-w-5xl overflow-hidden rounded-[36px] lg:grid-cols-[1fr_1fr]">
        {/* object side */}
        <section className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
          <Logo size="lg" />
          <div className="relative my-8 grid place-items-center">
            <div className="plate w-[78%] max-w-[320px]" />
            <div className="glass absolute left-0 top-4 rounded-2xl px-4 py-3 text-sm font-bold">
              <span className="led mr-2 align-middle" style={{ "--c": "#22c55e" }} />
              Today’s lunch is live
            </div>
            <div className="glass absolute bottom-2 right-0 rounded-2xl px-4 py-3 text-sm font-bold">
              🎟 Coupons in one tap
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight">
              Your hostel mess, in your pocket.
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
              Weekly menu, meal coupons, fee statements and a direct line to
              the mess team.
            </p>
          </div>
        </section>

        {/* form side */}
        <section className="flex items-center p-6 sm:p-10">
          <div className="w-full">
            <div className="mb-8 lg:hidden">
              <Logo />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">
              {register ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {register
                ? "Use your official IIIT-BH email."
                : "Sign in to see what’s on the menu."}
            </p>

            <form onSubmit={submit} className="mt-8 space-y-5">
              {register && (
                <>
                  <div>
                    <label className="field-label">Full name</label>
                    <Input
                      required
                      placeholder="Your name"
                      value={form.name || ""}
                      onChange={change("name")}
                    />
                  </div>
                  <div>
                    <label className="field-label">Hostel and room</label>
                    <Input
                      placeholder="e.g. BH-1, Room 204"
                      value={form.room || ""}
                      onChange={change("room")}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="field-label">College email</label>
                <Input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="you@iiit-bh.ac.in"
                  value={form.email || ""}
                  onChange={change("email")}
                />
              </div>
              <div>
                <label className="field-label">Password</label>
                <Input
                  required
                  minLength={6}
                  type="password"
                  autoComplete={register ? "new-password" : "current-password"}
                  placeholder="At least 6 characters"
                  value={form.password || ""}
                  onChange={change("password")}
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="neu-in rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--danger)]"
                >
                  {error}
                </p>
              )}

              <Button disabled={busy} className="w-full !py-3.5">
                {busy && <Spinner />}
                {busy
                  ? "Please wait…"
                  : register
                    ? "Create account"
                    : "Sign in"}
              </Button>
            </form>

            <p className="mt-7 text-sm text-muted">
              {register ? "Already have an account?" : "New here?"}{" "}
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setRegister(!register);
                  setError("");
                }}
              >
                {register ? "Sign in" : "Create an account"}
              </button>
            </p>
            <p className="mt-8 text-xs text-muted">
              For IIIT Bhubaneswar students only.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------
   Menu
------------------------------------------------------------------ */
function Menu({ onRate, onBuy }) {
  const [menu, setMenu] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(currentDay);
  const [weekly, setWeekly] = useState(false);
  const load = () => {
    setLoading(true);
    return Promise.all([api("/menu"), api("/announcements")])
      .then(([m, a]) => {
        setMenu(m);
        setAnnouncements(a);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener("menu-updated", refresh);
    return () => window.removeEventListener("menu-updated", refresh);
  }, []);
  const mealsForDay = (selectedDay) =>
    mealTypes
      .map((type) =>
        menu.find((meal) => meal.day === selectedDay && meal.type === type),
      )
      .filter(Boolean);
  return (
    <div className="space-y-7">
      {announcements[0] && (
        <div className="metal flex items-center gap-3 rounded-[22px] px-5 py-4 text-sm">
          <Icon>✦</Icon>
          <span>
            <b>Mess update</b>
            <span className="muted-on ml-2">{announcements[0].text}</span>
          </span>
        </div>
      )}

      <Heading
        title={weekly ? "This week’s menu" : `${days[day]} menu`}
        sub={weekly ? "All seven days at a glance." : "Tap a meal to buy its coupon."}
      >
        <div className="seg">
          <button aria-pressed={!weekly} onClick={() => setWeekly(false)}>
            Daily
          </button>
          <button aria-pressed={weekly} onClick={() => setWeekly(true)}>
            Weekly
          </button>
        </div>
      </Heading>

      {!weekly && (
        <div className="hide-scrollbar -mx-1 flex gap-3 overflow-auto px-1 pb-3 pt-1">
          {days.map((name, index) => (
            <button
              key={name}
              onClick={() => setDay(index)}
              className={`day-pill ${day === index ? "on" : ""}`}
            >
              <small>{index === currentDay ? "Today" : ""}</small>
              {name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {mealTypes.map((type) => (
            <Card key={type} className="skeleton">
              <div className="neu-in h-4 w-24 rounded-full" />
              <div className="neu-in mt-6 h-16 rounded-2xl" />
              <div className="neu-in mt-5 h-3 w-1/2 rounded-full" />
            </Card>
          ))}
        </div>
      ) : weekly ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {days.map((name, index) => (
            <Card key={name} strong={index === currentDay}>
              <div className="mb-4 flex items-center justify-between">
                <b className="text-lg">{name}</b>
                {index === currentDay && <span className="chip chip-soft">Today</span>}
              </div>
              <div className="space-y-3">
                {mealsForDay(index).map((meal) => (
                  <button
                    key={meal._id}
                    onClick={() => onBuy?.(meal)}
                    className="neu-sm neu-press block w-full rounded-2xl p-3 text-left"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold capitalize text-muted">
                      <VegLed veg={meal.veg} />
                      {meal.type}
                    </div>
                    <p className="mt-1.5 text-sm font-semibold">
                      {meal.items.join(", ")}
                    </p>
                  </button>
                ))}
                {!mealsForDay(index).length && (
                  <p className="text-sm text-muted">Menu coming soon.</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {mealTypes.map((type) => {
            const meal = menu.find((x) => x.day === day && x.type === type);
            return (
              <Card key={type} className="flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-bold capitalize">
                    <span className="text-xl">{mealIcon[type]}</span>
                    {type}
                  </span>
                  {meal && <VegLed veg={meal.veg} />}
                </div>
                {meal ? (
                  <>
                    <button
                      onClick={() => onBuy?.(meal)}
                      className="neu-in mt-4 rounded-2xl p-4 text-left text-lg font-bold leading-snug transition hover:text-mango"
                    >
                      {meal.items.join(", ")}
                    </button>
                    <div className="mt-4 flex gap-2 text-xs font-semibold text-muted">
                      <span className="chip">{meal.calories || "—"} kcal</span>
                      <span className="chip">{meal.protein || "—"} g protein</span>
                    </div>
                    {meal.allergens?.length > 0 && (
                      <p className="mt-3 text-xs font-semibold text-[var(--danger)]">
                        Contains: {meal.allergens.join(", ")}
                      </p>
                    )}
                    {onRate && (
                      <div className="mt-5 flex flex-wrap items-center gap-4">
                        <Button className="!px-5 !py-2.5 !text-xs" onClick={() => onBuy(meal)}>
                          Buy coupon · ₹{meal.price || 80}
                        </Button>
                        <button className="link-btn text-xs" onClick={() => onRate(meal)}>
                          Rate this meal
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="neu-in mt-4 rounded-2xl p-4 text-sm text-muted">
                    No meal planned yet.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Fees
------------------------------------------------------------------ */
const LedgerRow = ({ title, note, right }) => (
  <div className="flex items-center justify-between gap-3 py-4">
    <div>
      <b className="text-sm">{title}</b>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
    {right}
  </div>
);

function Fees() {
  const [fees, setFees] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = () =>
    Promise.all([api("/fees"), api("/coupons")]).then(
      ([feeData, couponData]) => {
        setFees(feeData);
        setCoupons(couponData);
      },
    );
  useEffect(() => {
    load();
  }, []);
  const pending = fees.filter((fee) => fee.status === "pending");
  const pendingCoupons = coupons.filter(
    (coupon) => coupon.status === "pending",
  );
  const outstandingTotal =
    pending.reduce((sum, fee) => sum + (fee.amount || 0), 0) +
    pendingCoupons.reduce((sum, coupon) => sum + (coupon.price || 0), 0);
  const payAll = async () => {
    setBusy(true);
    try {
      await Promise.all([
        ...pending.map((fee) =>
          api(`/fees/${fee._id}/pay`, { method: "PATCH" }),
        ),
        ...pendingCoupons.map((coupon) =>
          api(`/coupons/${coupon._id}/pay`, { method: "PATCH" }),
        ),
      ]);
      await load();
      setPaymentOpen(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="metal rounded-[28px] p-6">
          <p className="muted-on text-sm font-semibold">Mess fees due</p>
          <p className="mt-3 text-5xl font-extrabold tracking-tight">
            ₹{pending.reduce((sum, fee) => sum + (fee.amount || 0), 0)}
          </p>
          <p className="muted-on mt-3 text-xs">
            Pay at the mess office or accounts counter.
          </p>
        </div>
        <Card>
          <p className="text-sm font-semibold text-muted">Payment history</p>
          <p className="mt-3 text-5xl font-extrabold tracking-tight">
            {fees.filter((fee) => fee.status === "paid").length}
            <span className="ml-2 text-base font-semibold text-muted">
              paid bills
            </span>
          </p>
          <p className="mt-3 text-xs text-muted">
            The mess team records payments offline.
          </p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-bold">Outstanding bills</h3>
            <span className="chip">{pending.length + pendingCoupons.length}</span>
          </div>
          <div className="divide-y divide-[var(--lo)]/40">
            {pending.map((fee) => (
              <LedgerRow
                key={fee._id}
                title={fee.month}
                note="Mess fee, awaiting offline payment"
                right={<b>₹{fee.amount}</b>}
              />
            ))}
            {pendingCoupons.map((coupon) => (
              <LedgerRow
                key={coupon._id}
                title={coupon.item}
                note={`${days[coupon.day]} ${coupon.type} coupon, pay later`}
                right={<b>₹{coupon.price}</b>}
              />
            ))}
            {!pending.length && !pendingCoupons.length && (
              <p className="py-6 text-sm text-muted">You’re all paid up.</p>
            )}
          </div>
        </Card>
        <Card strong className="h-fit">
          <p className="text-sm font-semibold text-muted">Total to pay</p>
          <p className="mt-3 text-5xl font-extrabold tracking-tight">
            ₹{outstandingTotal}
          </p>
          <p className="mt-2 text-xs text-muted">
            Clears all mess fees and coupons together.
          </p>
          <Button
            className="mt-6 w-full"
            disabled={!outstandingTotal}
            onClick={() => setPaymentOpen(true)}
          >
            Pay outstanding
          </Button>
        </Card>
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-bold">Coupon history</h3>
          <span className="chip">{coupons.length}</span>
        </div>
        <div className="divide-y divide-[var(--lo)]/40">
          {coupons.map((coupon) => (
            <LedgerRow
              key={coupon._id}
              title={coupon.item}
              note={`${days[coupon.day]} ${coupon.type} · ₹${coupon.price}`}
              right={<Status value={coupon.status} />}
            />
          ))}
          {!coupons.length && (
            <p className="py-6 text-sm text-muted">
              No coupons yet. Buy one from the menu.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-bold">Fee history</h3>
          <span className="chip">{fees.length}</span>
        </div>
        <div className="divide-y divide-[var(--lo)]/40">
          {fees.map((fee) => (
            <LedgerRow
              key={fee._id}
              title={fee.month}
              note={
                fee.status === "paid"
                  ? `Paid ${new Date(fee.paidOn).toLocaleDateString()}`
                  : "Awaiting offline payment"
              }
              right={
                <div className="flex items-center gap-3">
                  <b>₹{fee.amount}</b>
                  <Status value={fee.status} />
                </div>
              }
            />
          ))}
          {!fees.length && (
            <p className="py-6 text-sm text-muted">No fee statements yet.</p>
          )}
        </div>
      </Card>

      {paymentOpen && (
        <QrDialog
          title="Outstanding bills"
          amount={outstandingTotal}
          data={`hostelbite-outstanding:${pending.map((fee) => fee._id).join(",")}:${pendingCoupons.map((coupon) => coupon._id).join(",")}`}
          actionLabel="Mark as paid"
          busy={busy}
          onClose={() => setPaymentOpen(false)}
          onAction={payAll}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Feedback
------------------------------------------------------------------ */
function Feedback({ initialMeal }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    kind: initialMeal ? "rating" : "quality",
    rating: 5,
    meal: initialMeal ? `${days[initialMeal.day]} ${initialMeal.type}` : "",
  });
  const load = () => api("/feedback").then(setItems);
  useEffect(() => {
    load();
  }, []);
  const submit = async () => {
    setBusy(true);
    try {
      await api("/feedback", { method: "POST", body: form });
      setForm({ kind: "quality", rating: 5, meal: "" });
      await load();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
      <Card strong className="h-fit space-y-5">
        <div>
          <h3 className="text-2xl font-extrabold tracking-tight">
            Tell the mess team
          </h3>
          <p className="mt-1 text-sm text-muted">
            Report an issue, rate a meal or share an idea.
          </p>
        </div>
        <Select
          options={["quality", "hygiene", "rating", "feedback"]}
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
        />
        {form.kind === "rating" && (
          <>
            <Input
              placeholder="Meal, e.g. Tue lunch"
              value={form.meal}
              onChange={(e) => setForm({ ...form, meal: e.target.value })}
            />
            <div className="flex gap-2" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((number) => (
                <button
                  key={number}
                  type="button"
                  aria-label={`${number} star${number > 1 ? "s" : ""}`}
                  onClick={() => setForm({ ...form, rating: number })}
                  className={`neu-sm neu-press grid h-11 w-11 place-items-center rounded-full text-xl ${
                    number <= form.rating
                      ? "text-sun [text-shadow:0_0_12px_var(--sun)]"
                      : "text-muted opacity-50"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </>
        )}
        <textarea
          className="field"
          rows="5"
          placeholder="What happened?"
          value={form.text || ""}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
        />
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.anon || false}
            onChange={(e) => setForm({ ...form, anon: e.target.checked })}
          />
          Send anonymously
        </label>
        <Button className="w-full" disabled={!form.text || busy} onClick={submit}>
          {busy && <Spinner />}
          {busy ? "Sending…" : "Send feedback"}
        </Button>
      </Card>

      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item._id} className="!p-5">
            <div className="flex items-center justify-between gap-2">
              <b className="text-sm capitalize">
                {item.kind}
                {item.anon && " · anonymous"}
              </b>
              <Status value={item.status} />
            </div>
            <p className="mt-2 text-sm leading-6">{item.text}</p>
            {item.reply && (
              <p className="neu-in mt-4 rounded-2xl p-3.5 text-xs leading-5">
                <b>Mess team:</b> {item.reply}
              </p>
            )}
          </Card>
        ))}
        {!items.length && (
          <Card>
            <p className="text-sm text-muted">
              Feedback you send will show up here with replies from the team.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Admin
------------------------------------------------------------------ */
function AdminPaymentsTable() {
  const [fees, setFees] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    api("/fees").then(setFees);
  }, []);
  const approve = async (id) => {
    setBusy(id);
    setError("");
    try {
      const updated = await api(`/fees/${id}/paid`, { method: "PATCH" });
      if (!updated?._id) throw new Error("Payment approval failed");
      setFees((current) =>
        current.map((fee) =>
          fee._id === updated._id ? { ...fee, ...updated } : fee,
        ),
      );
      window.dispatchEvent(new Event("payment-updated"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <Card className="mt-6 overflow-hidden !p-0">
      <div className="p-6">
        <h3 className="text-lg font-bold">All fee statements</h3>
        <p className="mt-1 text-xs text-muted">
          Approve a payment after the mess office receives cash or another
          offline payment.
        </p>
        {error && <p className="mt-3 text-xs font-semibold text-[var(--danger)]">{error}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-y border-[var(--lo)]/40">
              {["Student", "Month", "Amount", "Status", "Paid on", "Action"].map(
                (h) => (
                  <th key={h} className="px-6 py-3 font-semibold">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--lo)]/30">
            {fees.map((fee) => (
              <tr key={fee._id}>
                <td className="px-6 py-4 font-semibold">
                  {fee.user?.name || "Student"}
                  <span className="ml-2 text-xs font-normal text-muted">
                    {fee.user?.email || ""}
                  </span>
                </td>
                <td className="px-6 py-4">{fee.month}</td>
                <td className="px-6 py-4">₹{fee.amount}</td>
                <td className="px-6 py-4">
                  <Status value={fee.status} />
                </td>
                <td className="px-6 py-4 text-muted">
                  {fee.paidOn ? new Date(fee.paidOn).toLocaleDateString() : "—"}
                </td>
                <td className="px-6 py-4">
                  {fee.status === "pending" ? (
                    <Button
                      className="whitespace-nowrap !px-4 !py-2 !text-xs"
                      disabled={busy === fee._id}
                      onClick={() => approve(fee._id)}
                    >
                      {busy === fee._id && <Spinner />}
                      {busy === fee._id ? "Approving…" : "Approve payment"}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted">Approved</span>
                  )}
                </td>
              </tr>
            ))}
            {!fees.length && (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-sm text-muted">
                  No fee records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Admin() {
  const [meal, setMeal] = useState({ day: 0, type: "lunch", veg: true });
  const [announcement, setAnnouncement] = useState("");
  const [fee, setFee] = useState({});
  const [feedback, setFeedback] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [seedDialog, setSeedDialog] = useState(false);
  const load = () => api("/feedback").then(setFeedback);
  useEffect(() => {
    load();
  }, []);
  const run = async (path, options) => {
    setBusy(true);
    setError("");
    try {
      await api(path, options);
      await load();
      if (path === "/menu/seed" || path === "/menu")
        window.dispatchEvent(new Event("menu-updated"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-bold">Add a meal</h3>
              <p className="mt-1 text-xs text-muted">
                Use the default loader if the current menu is incomplete.
              </p>
            </div>
            {error && (
              <p className="neu-in rounded-2xl px-4 py-3 text-xs font-semibold text-[var(--danger)]">
                {error}
              </p>
            )}
            <Button
              disabled={busy}
              variant="metal"
              onClick={() => setSeedDialog(true)}
            >
              {busy && <Spinner />}
              {busy ? "Loading menu…" : "Load default Odia week"}
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Select
                options={days}
                onChange={(e) =>
                  setMeal({ ...meal, day: days.indexOf(e.target.value) })
                }
              />
              <Select
                options={mealTypes}
                value={meal.type}
                onChange={(e) => setMeal({ ...meal, type: e.target.value })}
              />
            </div>
            <Input
              placeholder="Items, comma separated"
              onChange={(e) =>
                setMeal({
                  ...meal,
                  items: e.target.value.split(",").map((item) => item.trim()),
                })
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Calories"
                onChange={(e) => setMeal({ ...meal, calories: +e.target.value })}
              />
              <Input
                type="number"
                placeholder="Protein (g)"
                onChange={(e) => setMeal({ ...meal, protein: +e.target.value })}
              />
            </div>
            <Input
              placeholder="Allergens, comma separated"
              onChange={(e) =>
                setMeal({
                  ...meal,
                  allergens: e.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={meal.veg}
                onChange={(e) => setMeal({ ...meal, veg: e.target.checked })}
              />
              Vegetarian meal
            </label>
            <Button onClick={() => run("/menu", { method: "POST", body: meal })}>
              {busy && <Spinner />}
              {busy ? "Saving…" : "Add meal"}
            </Button>
          </Card>

          <Card className="space-y-4">
            <h3 className="text-lg font-bold">Post an announcement</h3>
            <Input
              value={announcement}
              placeholder="e.g. Sunday dinner starts at 7:30 PM"
              onChange={(e) => setAnnouncement(e.target.value)}
            />
            <Button
              disabled={!announcement || busy}
              onClick={() =>
                run("/announcements", {
                  method: "POST",
                  body: { text: announcement },
                }).then(() => setAnnouncement(""))
              }
            >
              {busy && <Spinner />}
              {busy ? "Publishing…" : "Publish update"}
            </Button>
          </Card>

          <Card className="space-y-4">
            <h3 className="text-lg font-bold">Create fee for students</h3>
            <Input
              placeholder="Month, e.g. Nov 2026"
              onChange={(e) => setFee({ ...fee, month: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Amount ₹"
              onChange={(e) => setFee({ ...fee, amount: +e.target.value })}
            />
            <Button
              disabled={busy}
              onClick={() => run("/fees", { method: "POST", body: fee })}
            >
              {busy && <Spinner />}
              {busy ? "Creating…" : "Create statements"}
            </Button>
          </Card>
        </div>

        <Card className="h-fit max-h-[40rem] overflow-auto">
          <h3 className="mb-3 text-lg font-bold">Open feedback</h3>
          {feedback.map((item) => (
            <div
              key={item._id}
              className="border-t border-[var(--lo)]/40 py-4 text-sm"
            >
              <div className="flex justify-between gap-2">
                <b className="capitalize">{item.kind}</b>
                <span className="text-xs text-muted">
                  {item.user?.name || "Anonymous"}
                </span>
              </div>
              <p className="my-2">{item.text}</p>
              <div className="flex gap-3">
                <Select
                  options={["open", "in-progress", "resolved"]}
                  value={item.status}
                  onChange={(e) =>
                    run(`/feedback/${item._id}`, {
                      method: "PATCH",
                      body: { status: e.target.value, reply: item.reply },
                    })
                  }
                />
                <Input
                  placeholder="Reply and press Enter"
                  defaultValue={item.reply}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    run(`/feedback/${item._id}`, {
                      method: "PATCH",
                      body: { status: item.status, reply: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          ))}
          {!feedback.length && (
            <p className="text-sm text-muted">No feedback to review.</p>
          )}
        </Card>
      </div>

      {busy && (
        <div className="fixed inset-x-0 bottom-28 z-40 flex justify-center">
          <div className="metal rounded-full px-5 py-2.5 text-xs font-bold">
            <Spinner /> Saving changes…
          </div>
        </div>
      )}

      {seedDialog && (
        <Modal>
          <Card strong role="dialog" aria-modal="true">
            <h3 className="text-xl font-extrabold">Load the Odia week?</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              This replaces the current menu with the complete default 7-day
              menu.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="soft" onClick={() => setSeedDialog(false)}>
                Cancel
              </Button>
              <Button
                disabled={busy}
                onClick={() => {
                  setSeedDialog(false);
                  run("/menu/seed", { method: "POST" });
                }}
              >
                Replace menu
              </Button>
            </div>
          </Card>
        </Modal>
      )}
    </>
  );
}

function AdminOverview({ setTab }) {
  const [fees, setFees] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [chartHover, setChartHover] = useState(null);
  const loadOverview = () =>
    Promise.all([api("/fees"), api("/menu")])
      .then(([feeData, menuData]) => {
        setFees(feeData);
        setMenu(menuData);
      })
      .finally(() => setLoadingMenu(false));
  useEffect(() => {
    loadOverview();
    window.addEventListener("payment-updated", loadOverview);
    return () => window.removeEventListener("payment-updated", loadOverview);
  }, []);
  const pending = fees.filter((fee) => fee.status === "pending");
  const paid = fees.filter((fee) => fee.status === "paid");
  const paidDates = paid
    .map((fee) => (fee.paidOn ? new Date(fee.paidOn) : null))
    .filter(Boolean);
  const chartEnd = paidDates.length
    ? new Date(Math.max(...paidDates))
    : new Date();
  chartEnd.setHours(23, 59, 59, 999);
  const weeklyCounts = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(chartEnd);
    start.setDate(start.getDate() - (7 - index) * 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return {
      label: `W${index + 1}`,
      count: paid.filter(
        (fee) =>
          fee.paidOn &&
          new Date(fee.paidOn) >= start &&
          new Date(fee.paidOn) < end,
      ).length,
    };
  });
  let runningTotal = 0;
  const weeks = weeklyCounts.map((week) => {
    runningTotal += week.count;
    return { ...week, count: runningTotal };
  });
  const maxPaid = Math.max(1, ...weeks.map((week) => week.count));
  const points = weeks
    .map(
      (week, index) => `${index * 40 + 10},${92 - (week.count / maxPaid) * 70}`,
    )
    .join(" ");
  const uniqueMenu = [
    ...new Map(menu.map((meal) => [`${meal.day}-${meal.type}`, meal])).values(),
  ];
  const vegByDay = days.map((_, day) => ({
    veg: uniqueMenu.filter((meal) => meal.day === day && meal.veg).length,
    nonVeg: uniqueMenu.filter((meal) => meal.day === day && !meal.veg).length,
  }));
  const maxMeals = Math.max(
    1,
    ...vegByDay.map((item) => Math.max(item.veg, item.nonVeg)),
  );
  return (
    <div className="space-y-7">
      <Heading
        title="Keep the mess moving"
        sub="Collections, menu balance and what needs attention."
      />
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="metal rounded-[28px] p-6">
          <p className="muted-on text-sm font-semibold">Pending bills</p>
          <p className="mt-3 text-5xl font-extrabold">{pending.length}</p>
          <p className="muted-on mt-2 text-xs">
            ₹{pending.reduce((sum, fee) => sum + (fee.amount || 0), 0)} outstanding
          </p>
        </div>
        <Card>
          <p className="text-sm font-semibold text-muted">Paid bills</p>
          <p className="mt-3 text-5xl font-extrabold">{paid.length}</p>
          <p className="mt-2 text-xs text-muted">
            ₹{paid.reduce((sum, fee) => sum + (fee.amount || 0), 0)} collected
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-muted">Menu coverage</p>
          {loadingMenu ? (
            <div className="bar-track mt-6">
              <div className="bar-fill skeleton w-1/2" />
            </div>
          ) : (
            <>
              <p className="mt-3 text-5xl font-extrabold">
                {uniqueMenu.length}
                <span className="ml-1 text-base font-semibold text-muted">/ 28</span>
              </p>
              <div className="bar-track mt-3">
                <div
                  className="bar-fill"
                  style={{ width: `${(uniqueMenu.length / 28) * 100}%` }}
                />
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold">Paid bills over time</h3>
              <p className="mt-1 text-xs text-muted">Running total, last 8 weeks</p>
            </div>
            <span className="chip chip-ok">8 weeks</span>
          </div>
          <div className="neu-in relative mt-5 rounded-2xl p-3">
            <svg
              viewBox="0 0 300 110"
              className="h-40 w-full"
              role="img"
              aria-label="Paid bills over the last eight weeks"
            >
              <defs>
                <linearGradient id="hbLine" x1="0" x2="1">
                  <stop offset="0" stopColor="#ffb35e" />
                  <stop offset="1" stopColor="#e4600a" />
                </linearGradient>
              </defs>
              <path
                d="M10 92H290M10 57H290M10 22H290"
                stroke="currentColor"
                strokeOpacity=".12"
              />
              <polyline
                points={points}
                fill="none"
                stroke="url(#hbLine)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {weeks.map((week, index) => (
                <circle
                  key={week.label}
                  cx={index * 40 + 10}
                  cy={92 - (week.count / maxPaid) * 70}
                  r="5"
                  fill="#fff"
                  stroke="#e4600a"
                  strokeWidth="2.5"
                  onMouseEnter={() =>
                    setChartHover({
                      text: `${week.label}: ${week.count} paid bills`,
                      x: `${(index / 7) * 100}%`,
                    })
                  }
                  onMouseLeave={() => setChartHover(null)}
                />
              ))}
            </svg>
            {chartHover && (
              <div
                className="tip pointer-events-none absolute top-1 -translate-x-1/2"
                style={{ left: chartHover.x }}
              >
                {chartHover.text}
              </div>
            )}
            <div className="flex justify-between px-1 text-[10px] text-muted">
              {weeks.map((week) => (
                <span key={week.label}>{week.label}</span>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold">Veg vs non-veg</h3>
              <p className="mt-1 text-xs text-muted">Meals per day this week</p>
            </div>
            <span className="chip">
              {uniqueMenu.filter((meal) => meal.veg).length} /{" "}
              {uniqueMenu.filter((meal) => !meal.veg).length}
            </span>
          </div>
          <div className="neu-in relative mt-5 rounded-2xl p-3">
            <div className="relative flex h-36 items-end justify-between gap-2">
              {vegByDay.map((item, index) => (
                <div
                  key={days[index]}
                  className="flex h-full flex-1 items-end justify-center gap-1"
                  onMouseEnter={() =>
                    setChartHover({
                      text: `${days[index]}: ${item.veg} veg / ${item.nonVeg} non-veg`,
                      x: `${(index / 6) * 100}%`,
                    })
                  }
                  onMouseLeave={() => setChartHover(null)}
                >
                  <div
                    className="w-3 rounded-t-md bg-[var(--teal)] shadow-[0_0_10px_var(--teal)]"
                    style={{ height: `${Math.max(4, (item.veg / maxMeals) * 100)}%` }}
                  />
                  <div
                    className="w-3 rounded-t-md bg-[var(--danger)] shadow-[0_0_10px_var(--danger)]"
                    style={{ height: `${Math.max(4, (item.nonVeg / maxMeals) * 100)}%` }}
                  />
                </div>
              ))}
              {chartHover && (
                <div
                  className="tip pointer-events-none absolute top-0 -translate-x-1/2"
                  style={{ left: chartHover.x }}
                >
                  {chartHover.text}
                </div>
              )}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted">
              {days.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
          </div>
          <div className="mt-4 flex gap-5 text-xs font-semibold text-muted">
            <span className="flex items-center gap-2">
              <VegLed veg /> Veg
            </span>
            <span className="flex items-center gap-2">
              <VegLed veg={false} /> Non-veg
            </span>
          </div>
        </Card>
      </div>

      <Card strong>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-bold">Manage the week from one place</h3>
            <p className="mt-1 text-sm text-muted">
              Update meals, post announcements or record offline collections.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setTab("Admin")}>Open admin tools</Button>
            <Button variant="soft" onClick={() => setTab("Menu")}>
              Review menu
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------
   Announcements + Home
------------------------------------------------------------------ */
function Announcements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/announcements")
      .then(setItems)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-6">
      <Heading title="Updates" sub="Posted by the mess team, newest first." />
      {loading && (
        <Card className="flex items-center gap-3">
          <Spinner />
          <span className="text-sm">Loading updates…</span>
        </Card>
      )}
      {error && (
        <Card>
          <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>
        </Card>
      )}
      {!loading && !error && !items.length && (
        <Card>
          <p className="text-sm text-muted">Nothing posted yet.</p>
        </Card>
      )}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-4">
          {items.map((announcement) => (
            <Card key={announcement._id}>
              <div className="flex items-start gap-4">
                <span className="neu-sm grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-mango">
                  ✦
                </span>
                <div className="min-w-0">
                  <p className="font-semibold leading-6">{announcement.text}</p>
                  <p className="mt-2 text-xs text-muted">
                    {announcement.createdAt
                      ? new Date(announcement.createdAt).toLocaleString()
                      : "Mess team update"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* Replace the existing `function Home(...)` in App.jsx with this.
   Add `mealTime` just above it. Uses Card, Button, VegLed, mealIcon etc. already in App.jsx. */

// Edit these to match your mess's real serving times
const mealTime = {
  breakfast: "7:30 – 9:30 AM",
  lunch: "12:30 – 2:30 PM",
  snacks: "5:00 – 6:00 PM",
  dinner: "8:00 – 9:30 PM",
};

function Home({ user, setTab }) {
  const [menu, setMenu] = useState([]);
  const [update, setUpdate] = useState(null);
  useEffect(() => {
    api("/menu").then(setMenu);
    api("/announcements")
      .then((list) => setUpdate(list[0] || null))
      .catch(() => {});
  }, []);

  const todayMeals = mealTypes
    .map((type) => menu.find((m) => m.day === currentDay && m.type === type))
    .filter(Boolean);
  const hour = new Date().getHours();
  const nextType =
    hour < 10 ? "breakfast" : hour < 15 ? "lunch" : hour < 18 ? "snacks" : hour < 22 ? "dinner" : null;
  const next = todayMeals.find((m) => m.type === nextType);
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const firstName = user.name.split(" ")[0];

  const links = [
    { tab: "Fees", title: "Fees and coupons", note: "Bills, payments and your coupons" },
    { tab: "Feedback", title: "Feedback", note: "Report an issue or rate a meal" },
    { tab: "Announcements", title: "Updates", note: "Notices from the mess team" },
  ];

  return (
    <div className="space-y-6">
      {update && (
        <button
          onClick={() => setTab("Announcements")}
          className="metal flex w-full items-center gap-3 px-5 py-4 text-left text-sm"
        >
          <span className="led" style={{ "--c": "#d9b878" }} />
          <span className="min-w-0 truncate">
            <b>Mess update</b>
            <span className="muted-on ml-2">{update.text}</span>
          </span>
        </button>
      )}

      <section className="glass-strong overflow-hidden p-7 sm:p-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="text-sm font-semibold text-muted">
              {dateLabel} · {greeting}, {firstName}
            </p>
            <h2 className="mt-4 text-4xl sm:text-5xl">
              What’s on your plate today?
            </h2>
            <p className="mt-5 max-w-md text-[0.95rem] leading-7 text-muted">
              Check what’s being served, buy a coupon in advance and skip the
              queue at the counter.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Button onClick={() => setTab("Menu")}>See today’s menu</Button>
              <button className="link-btn text-sm" onClick={() => setTab("Fees")}>
                View my bills
              </button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[220px] sm:max-w-[320px]">
            <div className="plate" />
            {next && (
              <div className="glass-strong absolute -bottom-4 -left-2 max-w-[230px] px-4 py-3 sm:-left-10">
                <p className="text-xs font-semibold text-muted">
                  Up next · <span className="capitalize">{next.type}</span>
                </p>
                <p className="mt-1 text-sm font-bold leading-snug">
                  {next.items.slice(0, 3).join(", ")}
                </p>
                <p className="mt-1 text-xs text-muted">{mealTime[next.type]}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <Card>
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-lg font-bold">Today’s meals</h3>
            <p className="mt-1 text-xs text-muted">{days[currentDay]} · tap a meal to buy its coupon</p>
          </div>
          <button className="link-btn text-xs" onClick={() => setTab("Menu")}>
            Full menu
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {todayMeals.map((meal) => {
            const isNext = meal.type === nextType;
            return (
              <button
                key={meal._id}
                onClick={() => setTab("Menu")}
                className="neu-sm neu-press flex flex-col rounded-2xl p-4 text-left"
                style={isNext ? { borderColor: "var(--brass)" } : undefined}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-muted">
                  <span className="capitalize">
                    {mealIcon[meal.type]} {meal.type}
                  </span>
                  <VegLed veg={meal.veg} />
                </div>
                <p className="mt-3 text-sm font-semibold leading-snug">
                  {meal.items.join(", ")}
                </p>
                <p className="mt-auto pt-4 text-xs text-muted">
                  {mealTime[meal.type]}
                  {meal.calories ? ` · ${meal.calories} kcal` : ""}
                </p>
              </button>
            );
          })}
          {!todayMeals.length && (
            <p className="text-sm text-muted sm:col-span-4">
              Today’s menu hasn’t been posted yet.
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-5 sm:grid-cols-3">
        {links.map((l) => (
          <button
            key={l.tab}
            onClick={() => setTab(l.tab)}
            className="neu neu-press rounded-[20px] p-5 text-left"
          >
            <h3 className="font-bold">{l.title}</h3>
            <p className="mt-1 text-xs leading-5 text-muted">{l.note}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Shell: floating glass top bar + glass dock (no sidebar)
------------------------------------------------------------------ */
export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("Home");
  const [feedbackMeal, setFeedbackMeal] = useState(null);
  const [couponMeal, setCouponMeal] = useState(null);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("hb-dark") === "1",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("hb-dark", darkMode ? "1" : "0");
  }, [darkMode]);
  useEffect(() => {
    const token = localStorage.getItem("plate-token");
    if (!token) {
      setReady(true);
      return;
    }
    api("/me")
      .then(setUser)
      .catch(() => localStorage.removeItem("plate-token"))
      .finally(() => setReady(true));
  }, []);

  const backdrop = (
    <div className="aurora" aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );

  if (!ready)
    return (
      <>
        {backdrop}
        <div className="grid min-h-screen place-items-center text-sm font-semibold text-muted">
          Loading HostelBite…
        </div>
      </>
    );
  if (!user)
    return (
      <>
        {backdrop}
        <Auth onLogin={setUser} />
      </>
    );

  const tabs =
    user.role === "admin"
      ? [
          { id: "Home", label: "Overview", icon: "⌂" },
          { id: "Menu", label: "Menu", icon: "🍽" },
          { id: "Admin", label: "Admin", icon: "⚙" },
        ]
      : [
          { id: "Home", label: "Home", icon: "⌂" },
          { id: "Menu", label: "Menu", icon: "🍽" },
          { id: "Announcements", label: "Updates", icon: "✦" },
          { id: "Fees", label: "Fees", icon: "₹" },
          { id: "Feedback", label: "Feedback", icon: "💬" },
        ];
  const logout = () => {
    localStorage.removeItem("plate-token");
    setUser(null);
  };
  return (
    <div className="min-h-screen">
      {backdrop}

      <header className="fixed inset-x-0 top-0 z-30 flex justify-center px-3 pt-3 sm:px-6 sm:pt-4">
        <div className="glass-strong flex w-full max-w-6xl items-center justify-between rounded-full py-2 pl-3 pr-3 sm:pl-4">
          <Logo />
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden text-right sm:block">
              <b className="block text-sm leading-tight">{user.name}</b>
              <small className="text-xs capitalize text-muted">{user.role}</small>
            </span>
            <ThemeSwitch dark={darkMode} onClick={() => setDarkMode(!darkMode)} />
            <button
              onClick={logout}
              aria-label="Log out"
              title="Log out"
              className="neu-sm neu-press grid h-10 w-10 place-items-center rounded-full text-sm font-bold"
            >
              ⏻
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-36 pt-28 sm:px-6">
        {tab === "Home" &&
          (user.role === "admin" ? (
            <AdminOverview setTab={setTab} />
          ) : (
            <Home user={user} setTab={setTab} setMeal={setFeedbackMeal} />
          ))}
        {tab === "Menu" && (
          <Menu
            onBuy={setCouponMeal}
            onRate={
              user.role === "admin"
                ? undefined
                : (meal) => {
                    setFeedbackMeal(meal);
                    setTab("Feedback");
                  }
            }
          />
        )}
        {tab === "Announcements" && user.role !== "admin" && <Announcements />}
        {tab === "Fees" && user.role !== "admin" && (
          <div className="space-y-6">
            <Heading title="Fees and coupons" sub="Everything you owe and have paid." />
            <Fees />
          </div>
        )}
        {tab === "Feedback" && user.role !== "admin" && (
          <div className="space-y-6">
            <Heading title="Feedback" sub="Your voice shapes what’s served." />
            <Feedback initialMeal={feedbackMeal} />
          </div>
        )}
        {tab === "Admin" && user.role === "admin" && (
          <div className="space-y-6">
            <Heading title="Admin tools" sub="Menu, announcements and billing." />
            <Admin />
            <AdminPaymentsTable />
          </div>
        )}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="glass-strong flex max-w-full gap-1 overflow-x-auto rounded-[28px] p-2 hide-scrollbar">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                setFeedbackMeal(null);
              }}
              aria-current={tab === item.id ? "page" : undefined}
              className={`dock-item ${tab === item.id ? "on" : ""}`}
            >
              <Icon className="!h-6 !w-6 text-xl">{item.icon}</Icon>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {couponMeal && (
        <CouponDialog
          meal={couponMeal}
          onClose={() => setCouponMeal(null)}
          onRate={(meal) => {
            setCouponMeal(null);
            setFeedbackMeal(meal);
            setTab("Feedback");
          }}
        />
      )}
    </div>
  );
}