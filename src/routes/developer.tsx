import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, type Variants } from "framer-motion";
import { BD } from "country-flag-icons/react/3x2";
import { BarChart3, Map, GitBranch } from "lucide-react";
import developerImage from "../../public/dev.png";

export const Route = createFileRoute("/developer")({
  head: () => ({
    meta: [
      { title: "Developer — Mohammad Hafizur Rahman Sakib" },
      {
        name: "description",
        content:
          "Full Stack Developer passionate about scientific visualization, DSA, and browser-based graphics.",
      },
    ],
  }),
  component: DeveloperPage,
});

// ─── Data ─────────────────────────────────────────────────────────────────────

const SKILLS = [
  { name: "JavaScript", level: 92, color: "#f0c040" },
  { name: "React.js", level: 90, color: "#58d8f5" },
  { name: "Tailwind CSS", level: 88, color: "#38bdf8" },
  { name: "Next.js", level: 85, color: "#d4d4d4" },
  { name: "DSA / Algo", level: 82, color: "#fb923c" },
  { name: "Node.js", level: 80, color: "#4ade80" },
  { name: "TypeScript", level: 78, color: "#7ba3e8" },
  { name: "C / C++", level: 76, color: "#22d3ee" },
  { name: "Three.js", level: 75, color: "#c084fc" },
  { name: "MongoDB", level: 72, color: "#34d399" },
];

const PROJECTS = [
  {
    name: "NOVA MathPlot",
    desc: "Scientific visualization platform — 2D/3D plotting, complex analysis, activation functions, parametric curves.",
    tech: ["React", "Three.js", "Math.js"],
    accent: "#22d3ee",
    icon: "BarChart3", // Lucide icon
    link: "https://nova-mathplot.vercel.app/",
    github: "https://github.com/Hafiz-Sakib/nova-mathplot",
  },
  {
    name: "Tour Guide",
    desc: "Location-based travel guide app — interactive maps and point-of-interest discovery.",
    tech: ["React", "Maps API", "Firebase"],
    accent: "#4ade80",
    icon: "Map", // Lucide icon
    link: "https://sababa-tours.vercel.app/",
    github: "https://github.com/Hafiz-Sakib/Sababa-Tours",
  },
  {
    name: "Open Source",
    desc: "Actively contributing to open source projects. Solving competitive programming problems on multiple online judges.",
    tech: ["C++", "Python", "Algorithms"],
    accent: "#c084fc",
    icon: "GitBranch", // Lucide icon
    link: "https://hafizsakib.vercel.app/",
    github: "https://github.com/Hafiz-Sakib",
  },
];

const SOCIAL = [
  { label: "GitHub", href: "https://github.com/Hafiz-Sakib", accent: "#c084fc", symbol: "⌥" },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/hafizsakib",
    accent: "#7ba3e8",
    symbol: "in",
  },
  { label: "Portfolio", href: "https://hafizsakib.vercel.app/", accent: "#22d3ee", symbol: "◎" },
  {
    label: "Email",
    href: "https://mail.google.com/mail/u/0/?fs=1&to=hafizsakib5@gmail.com&tf=cm",
    accent: "#4ade80",
    symbol: "✉",
  },
  { label: "Twitter/X", href: "https://twitter.com/hafiz_sakib1", accent: "#d4d4d4", symbol: "𝕏" },
];

const EDUCATION = [
  {
    degree: "B.Sc. Computer Science",
    institute: "University — In Progress",
    year: "2021–Present",
    accent: "#22d3ee",
  },
  {
    degree: "Higher Secondary (HSC)",
    institute: "Govt. Haji Mohammad Mohsin College",
    year: "2018–2020",
    accent: "#4ade80",
  },
  {
    degree: "Secondary (SSC)",
    institute: "Govt. Muslim High School",
    year: "–2018",
    accent: "#c084fc",
  },
];

const INTERESTS = [
  { icon: "🧮", label: "DSA & Algorithms", sub: "Multi-judge competitive programming" },
  { icon: "📐", label: "Math Visualization", sub: "Geometric & analytical math" },
  { icon: "🤝", label: "Open Source", sub: "Collaborate on OSS projects" },
  { icon: "🎮", label: "Gaming", sub: "Loves playing games" },
  { icon: "🏋️", label: "Gym & Fitness", sub: "Regular gym-goer" },
];

const STACK = [
  { name: "React", c: "#58d8f5" },
  { name: "Next.js", c: "#d4d4d4" },
  { name: "TypeScript", c: "#7ba3e8" },
  { name: "Three.js", c: "#c084fc" },
  { name: "Node.js", c: "#4ade80" },
  { name: "MongoDB", c: "#34d399" },
  { name: "Tailwind", c: "#38bdf8" },
  { name: "C++", c: "#22d3ee" },
  { name: "DSA", c: "#fb923c" },
  { name: "Vite", c: "#f0c040" },
];

// ─── Motion variants ───────────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.82 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 280, damping: 20 },
  },
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar() {
  return (
    <div className="relative shrink-0 mx-auto sm:mx-0">
      {/* Spinning conic ring */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, #22d3ee, #c084fc, #f0c040, #4ade80, #22d3ee)",
            padding: 2,
            borderRadius: "9999px",
          }}
        />
        {/* Dark mask ring */}
        <div
          className="absolute rounded-full"
          style={{ inset: 2, background: "#060912", borderRadius: "9999px" }}
        />
        {/* Photo */}
        <img
          src={developerImage}
          alt="Mohammad Hafizur Rahman Sakib"
          className="absolute rounded-full object-cover"
          style={{
            inset: 5,
            borderRadius: "9999px",
            width: "calc(100% - 10px)",
            height: "calc(100% - 10px)",
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              "https://ui-avatars.com/api/?name=Sakib&background=0a1128&color=22d3ee&size=200";
          }}
        />
      </div>
    </div>
  );
}

// ─── Shared card wrapper ──────────────────────────────────────────────────────

function Card({
  children,
  topLineColor,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  topLineColor: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className={`rounded-2xl p-5 sm:p-6 relative overflow-hidden ${className}`}
      style={{
        background: "oklch(0.09 0.025 265)",
        border: "1px solid oklch(1 0 0 / 7%)",
        ...style,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${topLineColor}, transparent)` }}
      />
      {children}
    </motion.div>
  );
}

function SectionLabel({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] tracking-widest mb-4 sm:mb-5" style={{ color }}>
      {children}
    </p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function DeveloperPage() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10 sm:space-y-14 overflow-hidden">
      {/* ── PROFILE CARD ── */}
      <motion.div variants={stagger} initial="hidden" animate="show">
        <Card topLineColor="rgba(34,211,238,0.55)">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-7">
            <Avatar />

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              {/* Name + flag */}
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
                <h1
                  className="font-bold text-xl sm:text-2xl leading-tight"
                  style={{ color: "#e2e8f0" }}
                >
                  Mohammad Hafizur Rahman Sakib
                </h1>
                <BD
                  title="Bangladesh"
                  className="inline-block shrink-0"
                  style={{ width: 22, height: "auto", borderRadius: 2 }}
                />
              </div>

              {/* Role */}
              <p className="font-mono text-xs mb-3" style={{ color: "oklch(0.50 0.04 255)" }}>
                Full Stack Developer · hafizsakib5@gmail.com
              </p>

              {/* Status badge */}
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono mb-4"
                style={{
                  background: "rgba(74,222,128,0.10)",
                  border: "1px solid rgba(74,222,128,0.25)",
                  color: "#4ade80",
                }}
              >
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: "#4ade80" }}
                />
                open to collab
              </span>

              {/* Bio */}
              <p className="text-sm leading-relaxed mb-4" style={{ color: "oklch(0.58 0.04 255)" }}>
                Passionate Full Stack Developer pursuing a Computer Science degree. I build fast,
                clean, and interactive web apps — from scientific visualization platforms like{" "}
                <span style={{ color: "#22d3ee" }}>NOVA MathPlot</span> to real-world MERN apps. I
                love exploring math, tackling DSA challenges on competitive programming platforms,
                and pushing the limits of browser-based graphics.
              </p>

              {/* Social links */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {SOCIAL.map((s) => (
                  <motion.a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    whileHover={{ scale: 1.06, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono transition-colors"
                    style={{
                      background: `${s.accent}0e`,
                      border: `1px solid ${s.accent}22`,
                      color: s.accent,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = `${s.accent}1c`)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = `${s.accent}0e`)}
                  >
                    <span>{s.symbol}</span>
                    {s.label}
                  </motion.a>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── SKILLS ── */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className="space-y-4"
      >
        <motion.div variants={fadeUp}>
          <h2 className="text-lg sm:text-xl font-bold" style={{ letterSpacing: "-0.025em" }}>
            Skills
          </h2>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: "oklch(0.50 0.04 255)" }}>
            Technologies I work with daily.
          </p>
        </motion.div>

        <Card topLineColor="rgba(192,132,252,0.55)">
          <SectionLabel color="#c084fc">⬡ PROFICIENCY</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {SKILLS.map((s, i) => (
              <div key={s.name}>
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] font-mono" style={{ color: "oklch(0.52 0.04 255)" }}>
                    {s.name}
                  </span>
                  <span className="text-[11px] font-mono font-bold" style={{ color: s.color }}>
                    {s.level}%
                  </span>
                </div>
                <div className="h-1 rounded-full" style={{ background: "oklch(1 0 0 / 5%)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${s.level}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      background: `linear-gradient(90deg, ${s.color}88, ${s.color})`,
                      boxShadow: `0 0 6px ${s.color}55`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.section>

      {/* ── PROJECTS ── */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="space-y-4"
      >
        <motion.div variants={fadeUp}>
          <h2 className="text-lg sm:text-xl font-bold" style={{ letterSpacing: "-0.025em" }}>
            Projects
          </h2>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: "oklch(0.50 0.04 255)" }}>
            Things I've built and shipped.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROJECTS.map((p) => (
            <motion.div
              key={p.name}
              variants={popIn}
              whileHover={{ y: -4 }}
              className="rounded-2xl p-5 relative overflow-hidden flex flex-col gap-3 transition-all duration-200"
              style={{
                background: "oklch(0.09 0.025 265)",
                border: `1px solid ${p.accent}22`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.border = `1px solid ${p.accent}44`;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 28px ${p.accent}14`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.border = `1px solid ${p.accent}22`;
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${p.accent}66, transparent)`,
                }}
              />
              <div className="flex items-center gap-2">
                <span
                  className="w-8 h-8 text-base flex items-center justify-center rounded-lg shrink-0"
                  style={{ background: `${p.accent}14`, border: `1px solid ${p.accent}25` }}
                >
                  {p.icon === "BarChart3" && <BarChart3 size={20} strokeWidth={2.5} />}
                  {p.icon === "Map" && <Map size={20} strokeWidth={2.5} />}
                  {p.icon === "GitBranch" && <GitBranch size={20} strokeWidth={2.5} />}
                </span>
                <h3 className="font-bold text-sm" style={{ color: p.accent }}>
                  {p.name}
                </h3>
              </div>
              <p
                className="text-xs leading-relaxed flex-1"
                style={{ color: "oklch(0.50 0.04 255)" }}
              >
                {p.desc}
              </p>
              <div className="flex flex-wrap gap-1">
                {p.tech.map((t) => (
                  <span
                    key={t}
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: `${p.accent}0e`,
                      color: `${p.accent}aa`,
                      border: `1px solid ${p.accent}1e`,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mt-auto pt-1">
                <a
                  href={p.link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center py-1.5 rounded-lg text-[10px] font-mono transition-colors"
                  style={{
                    background: `${p.accent}12`,
                    border: `1px solid ${p.accent}28`,
                    color: p.accent,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = `${p.accent}22`)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = `${p.accent}12`)}
                >
                  Live ↗
                </a>
                <a
                  href={p.github}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center py-1.5 rounded-lg text-[10px] font-mono transition-colors"
                  style={{
                    background: "oklch(1 0 0 / 3%)",
                    border: "1px solid oklch(1 0 0 / 6%)",
                    color: "oklch(0.42 0.04 255)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "oklch(0.42 0.04 255)")}
                >
                  GitHub
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── EDUCATION + INTERESTS + STACK ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Education */}
        <Card topLineColor="rgba(34,211,238,0.5)">
          <SectionLabel color="#22d3ee">◈ EDUCATION</SectionLabel>
          <div className="space-y-4 sm:space-y-5">
            {EDUCATION.map((e) => (
              <div key={e.degree} className="flex gap-3">
                <div
                  className="shrink-0 mt-1 rounded-full"
                  style={{
                    width: 3,
                    minHeight: 44,
                    background: e.accent,
                    boxShadow: `0 0 8px ${e.accent}66`,
                  }}
                />
                <div>
                  <div className="text-xs font-bold" style={{ color: e.accent }}>
                    {e.degree}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: "oklch(0.48 0.04 255)" }}>
                    {e.institute}
                  </div>
                  <div
                    className="font-mono text-[9px] mt-0.5"
                    style={{ color: "oklch(0.36 0.04 255)" }}
                  >
                    {e.year}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Interests */}
        <Card topLineColor="rgba(251,146,60,0.5)">
          <SectionLabel color="#fb923c">◈ INTERESTS</SectionLabel>
          <div className="space-y-3">
            {INTERESTS.map((item) => (
              <div key={item.label} className="flex items-start gap-2.5">
                <span className="text-base leading-none mt-0.5 shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <div
                    className="text-xs font-semibold truncate"
                    style={{ color: "oklch(0.62 0.04 255)" }}
                  >
                    {item.label}
                  </div>
                  <div
                    className="font-mono text-[9px] mt-0.5"
                    style={{ color: "oklch(0.38 0.04 255)" }}
                  >
                    {item.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Stack */}
        <Card topLineColor="rgba(192,132,252,0.5)">
          <SectionLabel color="#c084fc">◈ STACK</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {STACK.map((t) => (
              <motion.span
                key={t.name}
                whileHover={{ scale: 1.1, y: -1 }}
                className="px-2.5 py-1 rounded-lg text-[10px] font-mono cursor-default"
                style={{
                  background: `${t.c}0f`,
                  color: t.c,
                  border: `1px solid ${t.c}25`,
                }}
              >
                {t.name}
              </motion.span>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ── CTA ── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl p-6 sm:p-8 lg:p-10 relative overflow-hidden
                   flex flex-col items-center gap-5
                   sm:flex-row sm:items-center sm:justify-between sm:gap-6
                   text-center sm:text-left"
        style={{
          background: "oklch(0.09 0.025 265)",
          border: "1px solid oklch(1 0 0 / 8%)",
        }}
      >
        {/* Ambient glow right */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 80% at 100% 50%, rgba(34,211,238,0.07), transparent)",
          }}
        />

        <div className="relative">
          <h2 className="text-xl sm:text-2xl font-bold" style={{ letterSpacing: "-0.025em" }}>
            Let's Build Together
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "oklch(0.50 0.04 255)" }}>
            Open to collaboration, freelance work, and OSS projects.
          </p>
        </div>

        <div className="relative flex gap-2 flex-wrap justify-center sm:justify-end">
          <motion.a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=hafizsakib5@gmail.com"
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold"
            style={{ background: "#22d3ee", color: "#050810" }}
          >
            ✉ Email me
          </motion.a>
          <motion.a
            href="https://hafizsakib.vercel.app/"
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium"
            style={{
              background: "oklch(1 0 0 / 5%)",
              color: "oklch(0.80 0.01 255)",
              border: "1px solid oklch(1 0 0 / 10%)",
            }}
          >
            🌐 Portfolio
          </motion.a>
          <motion.a
            href="https://github.com/Hafiz-Sakib"
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium"
            style={{
              background: "oklch(1 0 0 / 5%)",
              color: "oklch(0.80 0.01 255)",
              border: "1px solid oklch(1 0 0 / 10%)",
            }}
          >
            ⌥ GitHub
          </motion.a>
        </div>
      </motion.section>

      {/* Back */}
      <div className="flex justify-center pb-2">
        <Link
          to="/"
          className="font-mono text-xs transition-colors"
          style={{ color: "oklch(0.38 0.04 255)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#22d3ee")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "oklch(0.38 0.04 255)")}
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
